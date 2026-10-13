const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync(require.resolve('../dailyos-sync.js'),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const row=(key,value,stamp=Date.now()+10000,user_id='synthetic-owner')=>({user_id,path:JSON.stringify([key]),value:{type:'value',data:value},stamp,device:'synthetic-peer',deleted:false});
class Storage {getItem(key){return this[key]??null;}setItem(key,value){this[key]=String(value);}removeItem(key){delete this[key];}}
function device() {
  const storage=new Storage(),events={},intervals=[],timeouts=new Set(),nav={onLine:true},document={hidden:false,addEventListener:(event,fn)=>events[event]=fn};
  const state={rows:{},pulls:0,rpcs:0,channel:null,pullGate:null,mergeGate:null};
  const seed=row('__seed',true,1);state.rows[seed.path]=seed;
  storage.setItem('dos_sync_config_v1',JSON.stringify({url:'https://synthetic.supabase.co',publishableKey:'sb_publishable_synthetic'}));
  storage.setItem('dos_sync_meta_v1',JSON.stringify({owner:'synthetic-owner',rows:{[seed.path]:seed},pending:{},clock:1}));
  const client={
    auth:{getSession:async()=>({data:{session:{user:{id:'synthetic-owner',email:'synthetic@example.invalid'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
    channel:()=>{const channel={on(event,filter,fn){channel.deliver=fn;return channel;},subscribe(fn){channel.status=fn;state.channel=channel;return channel;}};return channel;},
    removeChannel:async()=>{},removeAllChannels:async()=>{},
    from:()=>({select(){return this;},eq(){return this;},order(){return this;},range:async()=>{state.pulls++;if(state.pullGate)await state.pullGate.promise;return {data:Object.values(state.rows).map(r=>structuredClone(r))};}}),
    rpc:async(name,{changes})=>{state.rpcs++;if(state.mergeGate)await state.mergeGate.promise;changes.forEach(r=>state.rows[r.path]={...structuredClone(r),user_id:'synthetic-owner'});return {data:changes};},
    storage:{from:()=>({upload:async()=>({}),download:async()=>({data:new Blob()})})}
  };
  const setTimer=(fn,ms)=>{const timer=setTimeout(()=>{timeouts.delete(timer);fn();},ms);timeouts.add(timer);return timer;};
  const context={localStorage:storage,navigator:nav,document,crypto:webcrypto,Blob,atob,location:{origin:'https://synthetic.invalid',pathname:'/'},supabase:{createClient:()=>client},setTimeout:setTimer,clearTimeout:timer=>{clearTimeout(timer);timeouts.delete(timer);},setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length;},clearInterval(){}};
  context.window=context;context.addEventListener=(event,fn)=>events[event]=fn;
  vm.runInNewContext(source,context);
  const api=context.DailySync;
  return {api,state,nav,document,events,intervals,storage,read:key=>JSON.parse(storage.getItem(key)),
    start:()=>api.start({defaults:{},apply:(key,value)=>storage.setItem(key,JSON.stringify(value)),applyPhotos:async()=>{},photoBlob:async()=>null,snapshot:async()=>({data:{},photos:{}}),backupPhotos:async()=>{}}),
    write(key,value){storage.setItem(key,JSON.stringify(value));api.write(key,value);},
    commit(record,payload=true){state.rows[record.path]=record;state.channel.deliver(payload?{eventType:'UPDATE',new:structuredClone(record)}:{});},
    dispose(){for(const timer of timeouts)clearTimeout(timer);state.pullGate?.resolve();state.mergeGate?.resolve();}
  };
}
const cases=[];
const test=(name,fn)=>cases.push({name,fn});
test('Realtime applies committed rows within 200ms without a database read',async d=>{
  const pulls=d.state.pulls;
  d.commit(row('dos_energy_v1',4));await wait(190);
  assert.equal(d.read('dos_energy_v1'),4);assert.equal(d.state.pulls,pulls,'Payload delivery must not wait for a redundant cloud pull');
});
test('Realtime applies promptly while the local upload awaits its server response',async d=>{
  d.state.mergeGate=gate();d.write('dos_theme_v1','modern');await wait(220);
  assert.equal(d.state.rpcs,1,'A local upload is in flight');
  d.commit(row('dos_energy_v1',5));await wait(190);
  assert.equal(d.read('dos_energy_v1'),5,'Incoming independent input must not wait for an outgoing upload');
  d.state.mergeGate.resolve();await wait(220);
  assert.equal(d.api.status().pending,0,'Local upload still completes after remote delivery');
});
test('Malformed and foreign-owner realtime rows cannot change local inputs',async d=>{
  const good=row('dos_energy_v1',3);d.commit(good);await wait(190);
  d.state.channel.deliver({eventType:'UPDATE',new:row('dos_energy_v1',99,good.stamp+1,'foreign-owner')});
  d.state.channel.deliver({eventType:'UPDATE',new:{...row('dos_energy_v1',98,good.stamp+2),path:'["__proto__"]'}});
  await wait(190);assert.equal(d.read('dos_energy_v1'),3);
});
test('A missed payload is reconciled promptly after an in-flight pull finishes',async d=>{
  d.state.pullGate=gate();d.events.visibilitychange();await wait(20);
  const pulls=d.state.pulls;assert(pulls>2,'Foreground recovery is pulling');
  d.commit(row('dos_water_v2',7),false);await wait(190);
  d.state.pullGate.resolve();await wait(350);
  assert.equal(d.read('dos_water_v2'),7);assert(d.state.pulls>pulls,'A delivery received during recovery gets a follow-up reconciliation');
});
test('Online, foreground and realtime reconnect each catch up without user retries',async d=>{
  for(const [event,value] of [['online',1],['visibilitychange',2],['SUBSCRIBED',3]]) {
    const record=row('dos_energy_v1',value,Date.now()+10000+value);d.state.rows[record.path]=record;
    if(event==='SUBSCRIBED')d.state.channel.status(event);else d.events[event]();
    await wait(190);assert.equal(d.read('dos_energy_v1'),value,event+' must catch up promptly');
  }
});
test('Fallback checks at most every two seconds and runs only online in the foreground',async d=>{
  assert(d.intervals.length,'A fallback is registered');assert(d.intervals.every(timer=>timer.ms<=2000),'Missed realtime delivery must recover within two seconds');
  let pulls=d.state.pulls;d.document.hidden=true;for(const timer of d.intervals)timer.fn();await wait(100);assert.equal(d.state.pulls,pulls,'Hidden pages do not poll');
  d.document.hidden=false;d.nav.onLine=false;for(const timer of d.intervals)timer.fn();await wait(100);assert.equal(d.state.pulls,pulls,'Offline pages do not poll');
  d.nav.onLine=true;const record=row('dos_energy_v1',6);d.state.rows[record.path]=record;for(const timer of d.intervals)timer.fn();await wait(190);assert.equal(d.read('dos_energy_v1'),6);
});
(async()=>{
  let failed=0;
  for(const {name,fn} of cases){const d=device();try{await d.start();await fn(d);console.log('PASS: '+name);}catch(error){failed++;console.error('FAIL: '+name+'\n'+error.message);}finally{d.dispose();}}
  if(failed)process.exitCode=1;else console.log('Passed: synthetic realtime latency, busy delivery, owner validation, deferred recovery and foreground fallback.');
})();
