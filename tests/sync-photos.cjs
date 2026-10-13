const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const {compare}=require('../dailyos-sync.js');
const runtime=fs.readFileSync(require.resolve('../dailyos-sync.js'),'utf8');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const adapterStart=html.indexOf('      async applyPhotos(next)');
const adapterEnd=html.indexOf('\n    }).catch',adapterStart);
assert(adapterStart>=0&&adapterEnd>adapterStart&&adapterEnd-adapterStart<4000,'Locate the bounded App photo adapter');
const adapterSource=html.slice(adapterStart,adapterEnd).trim().replace('async applyPhotos(next)','async function applyPhotos(next)');
const server={rows:{},objects:new Map(),events:[],uploadFailure:false};
class Storage {
  getItem(key){return this[key]??null;}
  setItem(key,value){this[key]=String(value);}
  removeItem(key){delete this[key];}
}
function device(name){
  const storage=new Storage(),photos=new Map(),nav={onLine:true},timers=new Set();let api,downloadFailure=false;
  storage.setItem('dos_sync_config_v1',JSON.stringify({url:'https://test.supabase.co',publishableKey:'sb_publishable_test'}));
  const account={user:{id:'synthetic-owner',email:'synthetic@example.com'}};
  const client={
    auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>({data:{session:account}}),signOut:async()=>({})},
    channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel:async()=>{},removeAllChannels:async()=>{},
    from:()=>({select(){return this;},eq(){return this;},order(){return this;},range:async(start,end)=>({data:Object.values(server.rows).sort((a,b)=>a.path.localeCompare(b.path)).slice(start,end+1)})}),
    rpc:async(kind,{changes})=>{
      if(kind!=='dailyos_seed'||!Object.keys(server.rows).length)for(const row of changes)if(compare(row,server.rows[row.path])>0)server.rows[row.path]=structuredClone(row);
      return {data:changes.map(row=>structuredClone(server.rows[row.path]))};
    },
    storage:{from:()=>({
      upload:async(path,blob)=>{server.events.push({device:name,kind:'upload',path});if(server.uploadFailure)return {error:{message:'Synthetic photo upload failure'}};server.objects.set(path,blob);return {};},
      download:async(path)=>{server.events.push({device:name,kind:'download',path});if(downloadFailure)return {error:{message:'Synthetic photo download failure'}};return server.objects.has(path)?{data:server.objects.get(path)}:{error:{message:'Object not found before upload'}};}
    })}
  };
  const context={localStorage:storage,navigator:nav,crypto:webcrypto,Blob,atob,supabase:{createClient:()=>client},document:{addEventListener(){}},setInterval:()=>0,
    setTimeout(fn,ms){const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);return timer;},clearTimeout(timer){timers.delete(timer);clearTimeout(timer);}};
  context.window=context;context.addEventListener=()=>{};
  vm.runInNewContext(runtime,context);api=context.DailySync;
  const window={DailySync:api,dispatchEvent(){}},idbGetAll=async()=>[...photos.values()],idbPut=async(record)=>photos.set(record.date,record),idbDel=async(date)=>photos.delete(date);
  const applyPhotos=new Function('window','idbGetAll','idbPut','idbDel','sv','Event',adapterSource+';return applyPhotos;')(window,idbGetAll,idbPut,idbDel,(key,value)=>storage.setItem(key,JSON.stringify(value)),class{});
  const defaults={dos_energy_v1:{},dos_prayer_checked_v1:{}};
  return {api,photos,nav,storage,set downloadFailure(value){downloadFailure=value;},
    async start(){await api.start({defaults,apply:(key,value)=>storage.setItem(key,JSON.stringify(value)),photoBlob:async(date)=>photos.get(date),applyPhotos,backupPhotos:async()=>{},snapshot:async()=>({data:Object.fromEntries(Object.keys(storage).filter(api.eligible).map(key=>[key,JSON.parse(storage[key])])),photos:Object.fromEntries(photos)})});await api.login('synthetic@example.com','synthetic-password');},
    write(key,value){storage.setItem(key,JSON.stringify(value));api.write(key,value);},read(key){return JSON.parse(storage.getItem(key));},
    async addPhoto(date,text){const record={date,ts:Date.now(),blob:new Blob([text],{type:'image/jpeg'})};photos.set(date,record);await api.photo(date,record);return record;},
    async retry(){try{await api.retry();}catch(error){return error;}},
    stop(){for(const timer of timers)clearTimeout(timer);}
  };
}
const devices=[];
(async()=>{
  const phone=device('phone'),laptop=device('laptop');devices.push(phone,laptop);
  phone.storage.setItem('dos_energy_v1','{}');await phone.start();await laptop.start();
  phone.nav.onLine=false;
  await phone.addPhoto('2026-10-13','synthetic photo A');phone.write('dos_energy_v1',{'2026-10-13':4});phone.nav.onLine=true;
  await phone.retry();
  assert.equal(phone.api.status().pending,0,'Retry uploads the offline photo and ordinary records');
  assert.equal(phone.api.status().error,'');
  const firstPhotoEvent=server.events.find(event=>event.path.includes('2026-10-13'));
  assert.equal(firstPhotoEvent?.kind,'upload','A pending local photo is uploaded before any download attempt');
  await laptop.retry();
  assert.equal(await laptop.photos.get('2026-10-13')?.blob.text(),'synthetic photo A','The other device receives unchanged photo bytes');
  assert.deepEqual(laptop.read('dos_energy_v1'),{'2026-10-13':4});
  laptop.nav.onLine=false;laptop.write('dos_prayer_checked_v1',{'2026-10-13':{fajr:true}});laptop.nav.onLine=true;
  await laptop.retry();await phone.retry();assert.deepEqual(phone.read('dos_prayer_checked_v1'),{'2026-10-13':{fajr:true}},'The reverse direction syncs too');

  phone.nav.onLine=false;await phone.addPhoto('2026-10-14','synthetic photo B');phone.write('dos_energy_v1',{'2026-10-13':4,'2026-10-14':5});phone.nav.onLine=true;server.uploadFailure=true;
  await phone.retry();assert(phone.api.status().pending>0,'Failed photo stays queued');assert.match(phone.api.status().error,/upload failure/i,'Photo upload error remains visible');
  assert.equal(await phone.photos.get('2026-10-14')?.blob.text(),'synthetic photo B','Failed upload retains original local bytes');
  const pending=JSON.parse(phone.storage.getItem('dos_sync_meta_v1')).pending;
  assert(Object.values(pending).some(row=>row.path==='["photos","2026-10-14"]'),'Durable queue retains the failed photo');
  await laptop.retry();assert.equal(laptop.read('dos_energy_v1')['2026-10-14'],5,'Photo upload failure does not block ordinary records');
  server.uploadFailure=false;await phone.retry();assert.equal(phone.api.status().pending,0);

  laptop.downloadFailure=true;laptop.nav.onLine=false;laptop.write('dos_prayer_checked_v1',{'2026-10-13':{fajr:true},'2026-10-14':{isha:true}});laptop.nav.onLine=true;
  await laptop.retry();assert.match(laptop.api.status().error,/download failure/i,'Photo download failure remains visible');
  assert.equal(await laptop.photos.get('2026-10-13')?.blob.text(),'synthetic photo A','Failed download preserves existing local photos');
  await phone.retry();assert.equal(phone.read('dos_prayer_checked_v1')['2026-10-14'].isha,true,'Photo download failure does not block outgoing records');
  assert.equal(laptop.api.status().pending,0,'Successfully uploaded records are acknowledged despite a photo download failure');
  laptop.downloadFailure=false;await laptop.retry();await phone.retry();
  assert.equal(await laptop.photos.get('2026-10-14')?.blob.text(),'synthetic photo B');
  for(const current of [phone,laptop]){assert.equal(current.api.status().pending,0);assert.equal(current.api.status().error,'');assert.equal(current.api.status().message,'Synced');}
  phone.nav.onLine=false;
  const missingPhoto=await phone.addPhoto('2026-10-15','synthetic photo C');phone.photos.delete(missingPhoto.date);
  const energy={'2026-10-13':1,'2026-10-14':1};
  for(let offset=0;offset<53;offset++)energy[new Date(Date.UTC(2026,10,1+offset)).toISOString().slice(0,10)]=2;
  phone.write('dos_energy_v1',energy);
  assert.equal(phone.api.status().pending,57,'Exercise the reported 57-entry queue with one missing photo');
  phone.nav.onLine=true;await phone.retry();assert.equal(phone.api.status().pending,1,'All ordinary records drain while the missing photo stays queued');
  assert.match(phone.api.status().error,/missing locally/i);await laptop.retry();assert.deepEqual(laptop.read('dos_energy_v1'),energy,'Missing local photo does not starve any of the 56 ordinary pending rows');
  phone.photos.set(missingPhoto.date,missingPhoto);await phone.retry();await laptop.retry();
  assert.equal(await laptop.photos.get(missingPhoto.date)?.blob.text(),'synthetic photo C','Restoring the queued local blob recovers the photo without replacing data');
  laptop.nav.onLine=false;laptop.write('dos_energy_v1',{...energy,'2026-10-13':5});laptop.nav.onLine=true;await laptop.retry();await phone.retry();
  assert.equal(phone.read('dos_energy_v1')['2026-10-13'],5,'Reverse sync still works after draining the 57-entry queue');
  for(const current of [phone,laptop]){assert.equal(current.api.status().pending,0);assert.equal(current.api.status().error,'');assert.equal(current.api.status().message,'Synced');}
  console.log('Passed: exact App photo adapter; offline photo/record retry; upload-before-download; unchanged cross-device bytes; bidirectional records; independent upload/download failures; honest status and recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>devices.forEach(current=>current.stop()));
