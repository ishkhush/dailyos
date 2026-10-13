const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const {compare}=require('../dailyos-sync.js');
const sdkContext={fetch,Headers,Response,Request,Blob,FormData,ArrayBuffer,URL,WebSocket,crypto:webcrypto,setTimeout,clearTimeout,setInterval,clearInterval};
sdkContext.self=sdkContext;vm.runInNewContext(fs.readFileSync(require.resolve('../supabase.min.js'),'utf8'),sdkContext);
const runtime=fs.readFileSync(require.resolve('../dailyos-sync.js'),'utf8');
const token='synthetic-owner-access-token',bytes=Uint8Array.from([255,216,255,224,0,16,74,70,73,70,0,255,217]);
const requests=[],objects=new Map(),rows={};let uploadFailure=false;
async function transport(url,options){
  assert.match(String(url),/^https:\/\/test\.supabase\.co\/storage\/v1\/object\/dailyos-photos\/synthetic-owner\//,'Only synthetic storage transport is exercised');
  const headers=new Headers(options.headers);requests.push({url,body:options.body,headers});
  if(options.body instanceof FormData)return Response.json({message:'No content provided',statusCode:'400',error:'Bad Request'},{status:400});
  assert(options.body instanceof ArrayBuffer,'Real SDK sends the runtime upload as a raw ArrayBuffer');
  assert.equal(headers.get('content-type'),'image/jpeg');assert.equal(headers.get('authorization'),'Bearer '+token);assert.equal(headers.get('apikey'),'sb_publishable_test');assert.equal(headers.get('x-upsert'),'true');
  assert.deepEqual(new Uint8Array(options.body),bytes,'Original JPEG bytes are unchanged');
  if(uploadFailure)return Response.json({message:'Synthetic upload unavailable',statusCode:'503',error:'Service Unavailable'},{status:503});
  objects.set(String(url),new Uint8Array(options.body));return Response.json({Key:String(url),Id:'synthetic-object'});
}
const real=sdkContext.supabase.createClient('https://test.supabase.co','sb_publishable_test',{accessToken:async()=>token,global:{fetch:transport},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
class Storage {getItem(key){return this[key]??null;}setItem(key,value){this[key]=String(value);}removeItem(key){delete this[key];}}
const storage=new Storage(),nav={onLine:true},photos=new Map(),timers=new Set();
storage.setItem('dos_sync_config_v1',JSON.stringify({url:'https://test.supabase.co',publishableKey:'sb_publishable_test'}));
const account={user:{id:'synthetic-owner',email:'synthetic@example.com'}};
const client={storage:real.storage,
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async()=>({data:{session:account}}),signOut:async()=>({})},
  channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel:async()=>{},removeAllChannels:async()=>{},
  from:()=>({select(){return this;},eq(){return this;},order(){return this;},range:async(start,end)=>({data:Object.values(rows).sort((a,b)=>a.path.localeCompare(b.path)).slice(start,end+1)})}),
  rpc:async(name,{changes})=>{if(name!=='dailyos_seed'||!Object.keys(rows).length)for(const row of changes)if(compare(row,rows[row.path])>0)rows[row.path]=structuredClone(row);return {data:changes.map(row=>structuredClone(rows[row.path]))};}
};
const context={localStorage:storage,navigator:nav,crypto:webcrypto,Blob,ArrayBuffer,atob,supabase:{createClient:()=>client},document:{addEventListener(){}},setInterval:()=>0,
  setTimeout(fn,ms){const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);return timer;},clearTimeout(timer){timers.delete(timer);clearTimeout(timer);}};
context.window=context;context.addEventListener=()=>{};vm.runInNewContext(runtime,context);const api=context.DailySync;
const photo=date=>({date,ts:Date.now(),blob:new Blob([bytes],{type:'image/jpeg'})});
(async()=>{
  photos.set('2026-10-13',photo('2026-10-13'));storage.setItem('dos_energy_v1','{}');
  await api.start({defaults:{dos_energy_v1:{}},photoBlob:async(date)=>photos.get(date),applyPhotos:async()=>{},apply:(key,value)=>storage.setItem(key,JSON.stringify(value)),backupPhotos:async()=>{},snapshot:async()=>({data:{dos_energy_v1:{}},photos:Object.fromEntries(photos)})});
  await api.login('synthetic@example.com','synthetic-password');
  assert.equal(api.status().message,'Synced','Seed photo upload succeeds through the real bundled SDK');assert.equal(requests.length,1);
  nav.onLine=false;const pending=photo('2026-10-14');photos.set(pending.date,pending);await api.photo(pending.date,pending);storage.setItem('dos_energy_v1','{"2026-10-14":5}');api.write('dos_energy_v1',{'2026-10-14':5});
  nav.onLine=true;uploadFailure=true;await api.retry();assert.equal(api.status().pending,1,'A transport failure preserves the pending photo');assert.match(api.status().error,/Synthetic upload unavailable/);assert.equal(rows['["dos_energy_v1","2026-10-14"]'].value.data,5,'Records upload independently of the SDK transport failure');
  uploadFailure=false;await api.retry();assert.equal(api.status().pending,0);assert.equal(api.status().error,'');assert.equal(api.status().message,'Synced');
  assert.equal(objects.size,2,'Both seed and pending photo paths reach object storage');assert.equal(requests.length,3,'Seed, failed pending upload, and retry all exercise real SDK transport');
  console.log('Passed: real bundled Supabase storage SDK; seed/pending/retry raw JPEG ArrayBuffer bodies; unchanged bytes; owner authorization, public key and upsert; failure queue retention and recovery.');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>{for(const timer of timers)clearTimeout(timer);});
