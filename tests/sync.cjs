const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
const {compare,flatten,validRow}=require('../dailyos-sync.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const server={rows:{},channels:[],fail:false,mergeDelay:0,onMerge:null};
class Storage {
  getItem(k){return this[k]??null;} setItem(k,v){this[k]=String(v);} removeItem(k){delete this[k];}
}
function device(storage=new Storage(),confirmed=false,userId='same-user',options={}) {
  const listeners={},nav={onLine:true};let session=confirmed?{user:{id:userId,email:'me@example.com'}}:null,activeChannel;
  storage.setItem('dos_sync_config_v1',JSON.stringify({url:'https://test.supabase.co',publishableKey:'sb_publishable_test'}));
  const client={
    auth:{getSession:async()=>{await options.sessionGate;if(options.sessionError)throw Error(options.sessionError);return {data:{session}};},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>{session={user:{id:userId,email:'me@example.com'}};return {data:{session}};},signOut:async()=>{session=null;return {}; }},
    channel:()=>{const c={on(event,filter,fn){c.callback=fn;return c;},subscribe(fn){server.channels.push(c);activeChannel=c;setTimeout(()=>fn('SUBSCRIBED'),0);return c;}};return c;},
    removeChannel:async c=>{server.channels=server.channels.filter(x=>x!==c);},removeAllChannels:async()=>{},
    from:()=>({select(){return this;},eq(){return this;},order(){return this;},range:async(a,b)=>{await options.pullGate;return {data:Object.values(server.rows).sort((x,y)=>x.path.localeCompare(y.path)).slice(a,b+1)};}}),
    rpc:async(name,{changes})=>{
      if(name==='dailyos_merge' && server.mergeDelay){server.onMerge?.();await wait(server.mergeDelay);}
      if(server.fail)return {error:{message:'Simulated lost connection'}};
      if(name==='dailyos_seed'){if(!Object.keys(server.rows).length)changes.forEach(r=>server.rows[r.path]=structuredClone(r));}
      else changes.forEach(r=>{if(compare(r,server.rows[r.path])>0)server.rows[r.path]=structuredClone(r);});
      server.channels.forEach(c=>setTimeout(()=>c.callback(),0));
      return {data:changes.map(r=>structuredClone(server.rows[r.path]))};
    },storage:{from:()=>({upload:async()=>({}),download:async()=>({data:new Blob()})})}
  };
  const context={localStorage:storage,navigator:nav,crypto:webcrypto,Blob,location:{origin:'https://example.com',pathname:'/'},supabase:{createClient:()=>client},document:{addEventListener(){}},setTimeout,clearTimeout,setInterval:(fn,ms)=>{const t=setInterval(fn,ms);t.unref();return t;},atob};
  context.window=context;context.addEventListener=(event,fn)=>listeners[event]=fn;
  vm.runInNewContext(fs.readFileSync(require.resolve('../dailyos-sync.js'),'utf8'),context);
  const api=context.DailySync;
  return {storage,nav,api,listeners,async start(){await api.start({defaults:{dos_habits_v1:[],dos_habit_checked_v1:{},dos_planner_v1:{}},apply:(key,value)=>storage.setItem(key,JSON.stringify(value)),photoBlob:async()=>null,backupPhotos:async()=>{},applyPhotos:async()=>{},snapshot:async()=>({data:Object.fromEntries(Object.keys(storage).filter(api.eligible).map(k=>[k,JSON.parse(storage[k])])),photos:{}})});},write(key,value){storage.setItem(key,JSON.stringify(value));api.write(key,value);},read:key=>JSON.parse(storage.getItem(key))};
}
(async()=>{
  let finishSession,finishPull;
  const returning=device(undefined,true,'same-user',{sessionGate:new Promise(r=>finishSession=r),pullGate:new Promise(r=>finishPull=r)});
  assert.equal(returning.api.status().checkingSession,true,'Launch starts with session check, never a signed-out default');
  const launch=returning.start();await wait(10);assert.equal(returning.api.status().checkingSession,true);
  finishSession();await wait(10);assert.equal(returning.api.status().connected,true,'Restored session opens cached app before cloud response');assert.equal(returning.api.status().checkingSession,false);
  finishPull();await launch;
  const failure=device(undefined,false,'same-user',{sessionError:'Offline session check'});
  await assert.rejects(()=>failure.start(),/Offline session check/);assert.equal(failure.api.status().checkingSession,true,'Failed check is not treated as genuine sign-out');
  const confirmationBrowser=device(undefined,true);await confirmationBrowser.start();assert.equal(Object.keys(server.rows).length,0,'An email-confirmation browser must not seed starter defaults');assert.equal(confirmationBrowser.api.status().message,'Choose migration source');
  const phone=device();phone.storage.setItem('dos_habits_v1',JSON.stringify([{id:'a',name:'Read'},{id:'b',name:'Run'}]));phone.storage.setItem('dos_habit_checked_v1','{}');phone.storage.setItem('dos_planner_v1','{}');
  await phone.start();await phone.api.login('me@example.com','password');
  assert.equal(phone.api.status().checkingSession,false);assert(phone.api.status().lastSynced>0,'Successful sync records a timestamp');
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
  await assert.rejects(()=>restart.api.configure('https://another.supabase.co','sb_publishable_test'),/another project/);
  await assert.rejects(()=>restart.api.login('other@example.com','password',true),/account creation is disabled/);
  await assert.rejects(()=>restart.api.downloadPhoto('other-user/2026-10-07/photo.jpg'),/own photos/);
  await assert.rejects(()=>restart.api.downloadPhoto('same-user/../other/photo.jpg'),/own photos/);
  await assert.rejects(()=>restart.api.photo('2026-10-07',{blob:new Blob(['unsafe'],{type:'text/html'}),ts:Date.now()}),/JPEG/);
  const wrongAccount=device(restart.storage,false,'other-user');await wrongAccount.start();await assert.rejects(()=>wrongAccount.api.login('other@example.com','password'),/another account/);assert.equal(wrongAccount.api.status().connected,false);
  const tab=device(restart.storage,true);await tab.start();tab.nav.onLine=false;restart.nav.onLine=false;
  restart.write('dos_habit_checked_v1',{'2026-10-08':{a:true}});
  tab.write('dos_planner_v1',{'2026-10-08':{hiddenHabits:{b:true}}});
  const queued=JSON.parse(restart.storage.getItem('dos_sync_meta_v1')).pending;
  assert(Object.values(queued).some(r=>JSON.parse(r.path)[0]==='dos_habit_checked_v1'),'A second tab preserves the first tab’s queue');
  assert(Object.values(queued).some(r=>JSON.parse(r.path)[0]==='dos_planner_v1'),'Both tab edits are queued');
  restart.listeners.storage({key:'dos_sync_meta_v1',newValue:restart.storage.getItem('dos_sync_meta_v1')});await wait(20);
  assert.equal(restart.read('dos_planner_v1')['2026-10-08'].hiddenHabits.b,true,'Metadata events apply cross-tab data');
  assert(restart.api.status().pending>0,'Receiving another tab’s pending rows does not acknowledge them as cloud uploads');
  restart.listeners.storage({key:'dos_planner_v1',newValue:'{invalid'});assert.match(restart.api.status().error,/JSON/,'Malformed cross-tab JSON is reported instead of escaping the event handler');
  restart.nav.onLine=true;tab.nav.onLine=true;await restart.api.retry();await tab.api.retry();await wait(650);
  let inFlight;const entered=new Promise(resolve=>inFlight=resolve);server.mergeDelay=250;server.onMerge=()=>inFlight();
  restart.write('dos_habit_checked_v1',{'2026-10-09':{a:true}});await entered;
  tab.nav.onLine=false;tab.write('dos_planner_v1',{'2026-10-09':{hiddenHabits:{a:true}}});
  await wait(850);server.mergeDelay=0;server.onMerge=null;
  assert.equal(server.rows['["dos_planner_v1","2026-10-09","hiddenHabits","a"]'].value.data,true,'Edits in a second tab survive an in-flight upload acknowledgement');
  assert.equal(restart.api.status().pending,0,'Acknowledged disk pending entries are not resurrected');
  tab.nav.onLine=true;
  restart.nav.onLine=false;laptop.nav.onLine=false;
  restart.write('dos_bw_log_v1',[{date:'2026-10-09',weight:80}]);laptop.write('dos_bw_log_v1',[{date:'2026-10-10',weight:79.5}]);
  restart.nav.onLine=true;laptop.nav.onLine=true;await restart.api.retry();await laptop.api.retry();await wait(650);
  assert.deepEqual(restart.read('dos_bw_log_v1').map(log=>log.date).sort(),['2026-10-09','2026-10-10'],'Concurrent weight logs on different days both survive');
  assert(restart.read('dos_bw_log_v1').every(log=>!('id' in log)),'Date-keyed sync preserves the weight log shape');
  restart.write('dos_habits_v1',[{id:'bounded',name:'Read',scope:'everyday',startDate:'2026-10-08',endDate:'2026-10-10',history:[{name:'Old reading',startDate:'',endDate:'2026-10-08'}]}]);
  restart.write('dos_urgent_v1',[{id:'urgent',text:'CALL',scope:'week',startDate:'2026-10-05',endDate:'2026-10-11',completedDates:{'2026-10-08':true}}]);
  restart.write('dos_theme_v1','modern');await wait(650);
  assert.equal(laptop.read('dos_habits_v1')[0].endDate,'2026-10-10','Forward deletion syncs as a retained bounded record');
  assert.equal(laptop.read('dos_habits_v1')[0].history[0].name,'Old reading','Historic scope segments survive replication');
  assert.equal(laptop.read('dos_urgent_v1')[0].completedDates['2026-10-08'],true);assert.equal(laptop.read('dos_theme_v1'),'modern','Theme selection replicates');
  laptop.write('dos_urgent_v1',[{...laptop.read('dos_urgent_v1')[0],completedDates:{'2026-10-08':false}}]);await wait(650);assert.equal(restart.read('dos_urgent_v1')[0].completedDates['2026-10-08'],false,'Urgent undo replicates');
  const rootPath='["dos_planner_v1"]';server.rows[rootPath]={path:rootPath,value:null,deleted:true,stamp:Date.now()+5000,device:'server'};
  await restart.api.retry();assert.deepEqual(restart.read('dos_planner_v1'),{},'A cloud root tombstone clears the local displayed document');
  const invalid={path:'["dos_habit_checked_v1","__proto__"]',value:{type:'object'},stamp:1,device:'x',deleted:false};
  assert.equal(validRow(invalid),false);assert.equal(validRow({...invalid,path:'["dos_api_key"]'}),false);
  assert.throws(()=>flatten(JSON.parse('{"__proto__":{"polluted":true}}'),['dos_test_v1']),/Invalid sync data path/);assert.equal({}.polluted,undefined);
  const badConfigStorage=new Storage();const badConfig=device(badConfigStorage);badConfigStorage.setItem('dos_sync_config_v1',JSON.stringify({url:'https://test.supabase.co',publishableKey:'sb_secret_bad'}));await assert.rejects(()=>badConfig.start(),/browser key/);
  console.log('Passed: migration, realtime, offline merge/deletion/restart/retry; cross-tab queue/application/in-flight acknowledgement; concurrent weight logs; root tombstones; account/project/photo isolation; signup and stored secret-key rejection; prototype/path validation (mock backend).');
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
