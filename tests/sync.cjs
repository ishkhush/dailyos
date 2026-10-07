const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
const {compare}=require('../dailyos-sync.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const server={rows:{},channels:[],fail:false};
class Storage {
  getItem(k){return this[k]??null;} setItem(k,v){this[k]=String(v);} removeItem(k){delete this[k];}
}
function device(storage=new Storage(),confirmed=false) {
  const listeners={},nav={onLine:true};let session=confirmed?{user:{id:'same-user',email:'me@example.com'}}:null,activeChannel;
  storage.setItem('dos_sync_config_v1',JSON.stringify({url:'https://test.supabase.co',publishableKey:'sb_publishable_test'}));
  const client={
    auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>{session={user:{id:'same-user',email:'me@example.com'}};return {data:{session}};},signOut:async()=>{session=null;return {}; }},
    channel:()=>{const c={on(event,filter,fn){c.callback=fn;return c;},subscribe(fn){server.channels.push(c);activeChannel=c;setTimeout(()=>fn('SUBSCRIBED'),0);return c;}};return c;},
    removeChannel:async c=>{server.channels=server.channels.filter(x=>x!==c);},removeAllChannels:async()=>{},
    from:()=>({select(){return this;},eq(){return this;},order(){return this;},range:async(a,b)=>({data:Object.values(server.rows).sort((x,y)=>x.path.localeCompare(y.path)).slice(a,b+1)})}),
    rpc:async(name,{changes})=>{
      if(server.fail)return {error:{message:'Simulated lost connection'}};
      if(name==='dailyos_seed'){if(!Object.keys(server.rows).length)changes.forEach(r=>server.rows[r.path]=structuredClone(r));}
      else changes.forEach(r=>{if(compare(r,server.rows[r.path])>0)server.rows[r.path]=structuredClone(r);});
      server.channels.forEach(c=>setTimeout(()=>c.callback(),0));
      return {data:changes.map(r=>structuredClone(server.rows[r.path]))};
    },storage:{from:()=>({upload:async()=>({}),download:async()=>({data:new Blob()})})}
  };
  const context={localStorage:storage,navigator:nav,crypto:webcrypto,location:{origin:'https://example.com',pathname:'/'},supabase:{createClient:()=>client},document:{addEventListener(){}},setTimeout,clearTimeout,setInterval:(fn,ms)=>{const t=setInterval(fn,ms);t.unref();return t;},atob};
  context.window=context;context.addEventListener=(event,fn)=>listeners[event]=fn;
  vm.runInNewContext(fs.readFileSync(require.resolve('../dailyos-sync.js'),'utf8'),context);
  const api=context.DailySync;
  return {storage,nav,api,listeners,async start(){await api.start({defaults:{dos_habits_v1:[],dos_habit_checked_v1:{},dos_planner_v1:{}},apply:(key,value)=>storage.setItem(key,JSON.stringify(value)),photoBlob:async()=>null,backupPhotos:async()=>{},applyPhotos:async()=>{},snapshot:async()=>({data:Object.fromEntries(Object.keys(storage).filter(api.eligible).map(k=>[k,JSON.parse(storage[k])])),photos:{}})});},write(key,value){storage.setItem(key,JSON.stringify(value));api.write(key,value);},read:key=>JSON.parse(storage.getItem(key))};
}
(async()=>{
  const confirmationBrowser=device(undefined,true);await confirmationBrowser.start();assert.equal(Object.keys(server.rows).length,0,'An email-confirmation browser must not seed starter defaults');assert.equal(confirmationBrowser.api.status().message,'Choose migration source');
  const phone=device();phone.storage.setItem('dos_habits_v1',JSON.stringify([{id:'a',name:'Read'},{id:'b',name:'Run'}]));phone.storage.setItem('dos_habit_checked_v1','{}');phone.storage.setItem('dos_planner_v1','{}');
  await phone.start();await phone.api.login('me@example.com','password');
  const laptop=device();laptop.storage.setItem('dos_habits_v1',JSON.stringify([{id:'starter',name:'Starter'}]));await laptop.start();await laptop.api.login('me@example.com','password');
  assert.deepEqual(laptop.read('dos_habits_v1'),phone.read('dos_habits_v1'),'Phone seeds; laptop adopts, without starter pollution');
  phone.write('dos_habit_checked_v1',{'2026-10-07':{a:true}});await wait(650);assert.equal(laptop.read('dos_habit_checked_v1')['2026-10-07'].a,true,'Realtime marks arrive without refresh');
  phone.nav.onLine=false;laptop.nav.onLine=false;
  phone.write('dos_planner_v1',{'2026-10-07':{habitTimes:{a:{start:'10:00',end:''}}}});
  laptop.write('dos_habits_v1',[{id:'a',name:'Read a book'},{id:'b',name:'Run'}]);
  await wait(220);assert(phone.api.status().pending>0);
  phone.nav.onLine=true;laptop.nav.onLine=true;await phone.api.retry();await laptop.api.retry();await wait(650);
  assert.equal(laptop.read('dos_planner_v1')['2026-10-07'].habitTimes.a.start,'10:00');assert.equal(phone.read('dos_habits_v1')[0].name,'Read a book','Independent offline edits survive');
  laptop.nav.onLine=false;phone.write('dos_habits_v1',[{id:'b',name:'Run'}]);await wait(650);
  laptop.write('dos_habits_v1',[{id:'a',name:'Latest offline edit'},{id:'b',name:'Run'}]);laptop.nav.onLine=true;await laptop.api.retry();await wait(650);
  assert.equal(phone.read('dos_habits_v1').find(h=>h.id==='a').name,'Latest offline edit','Later offline edit can coherently restore a deleted record, including its ID');
  phone.write('dos_habits_v1',[{id:'b',name:'Run'}]);await wait(650);assert.deepEqual(laptop.read('dos_habits_v1'),[{id:'b',name:'Run'}]);
  phone.nav.onLine=false;phone.write('dos_habit_checked_v1',{'2026-10-07':{a:true,b:true}});await wait(220);
  const restart=device(phone.storage);restart.nav.onLine=false;await restart.start();assert(restart.api.status().pending>0,'Offline queue persists across restart');restart.nav.onLine=true;await restart.api.login('me@example.com','password');await wait(650);assert.equal(laptop.read('dos_habit_checked_v1')['2026-10-07'].b,true);
  server.fail=true;restart.write('dos_planner_v1',{'2026-10-07':{hiddenHabits:{b:true}}});await wait(300);assert(restart.api.status().pending>0,'Failed upload retains queue');server.fail=false;await restart.api.retry();await wait(650);assert.equal(laptop.read('dos_planner_v1')['2026-10-07'].hiddenHabits.b,true);
  await assert.rejects(()=>restart.api.configure('https://test.supabase.co','sb_secret_bad'),/browser key/);
  console.log('Passed: first-phone migration, second-device adoption, live marks, offline merge, deletion, durable restart queue, failed upload retry and secret-key rejection (mock backend).');
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
