const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('sw.js','utf8'),current=source.match(/const CACHE = '([^']+)'/)[1];
const handlers={},put=[],deleted=[],waits=[];
const cache={addAll:async urls=>{for(const file of ['./dailyos-sync.js','./dailyos-theme.js','./theme-akatsuki.css','./theme-modern.css','./theme-characters.css','./theme-fonts.css','./assets/themes/pokemon/health-desktop.png','./assets/themes/akatsuki/cloud-phone.png','./assets/themes/akatsuki/cloud-desktop.png','./assets/themes/akatsuki/stack-phone.png','./assets/themes/akatsuki/stack-desktop.png','./assets/themes/akatsuki/progress-phone.png','./assets/themes/akatsuki/progress-desktop.png'])assert(urls.includes(file),file+' precached');for(const file of urls.filter(url=>url.startsWith('./')&&url!=='./'))assert(fs.existsSync(file),file+' exists');},put:async key=>put.push(typeof key==='string'?key:key.url),match:async key=>'offline:'+key};
const context={URL,Set,Promise,self:{location:{href:'https://example.test/dailyos/sw.js',origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches:{open:async()=>cache,keys:async()=>['dailyos-old','other-app-cache',current],delete:async key=>deleted.push(key)},fetch:async()=>({status:200,type:'basic',clone:()=>({})})};
vm.runInNewContext(source,context);
const request=(url,method='GET',auth=false,mode='cors')=>({url,method,mode,headers:{has:()=>auth}});
const dispatch=async req=>{let response;handlers.fetch({request:req,waitUntil:p=>waits.push(p),respondWith:p=>response=p});if(response)await response;await Promise.all(waits.splice(0));return response;};
(async()=>{
  handlers.install({waitUntil:p=>waits.push(p)});await Promise.all(waits.splice(0));
  handlers.activate({waitUntil:p=>waits.push(p)});await Promise.all(waits.splice(0));
  assert.deepEqual(deleted,['dailyos-old']);
  const excluded=[
    request('https://project.supabase.co/storage/v1/object/sign/progress/a.jpg?token=private'),
    request('https://photos.example.test/storage/v1/object/sign/progress/a.jpg?token=private'),
    request('https://example.test/dailyos/private.jpg?token=private'),
    request('https://example.test/dailyos/index.html?token=private'),
    request('https://example.test/dailyos/dailyos-sync.js','GET',true),
    request('https://example.test/dailyos/dailyos-sync.js','POST'),
    request('https://cdn.jsdelivr.net/npm/unapproved-package/index.js')
  ];
  for(const req of excluded)assert.equal(await dispatch(req),undefined,req.url+' bypasses offline cache');
  assert.equal(put.length,0);
  await dispatch(request('https://example.test/dailyos/dailyos-sync.js'));
  await dispatch(request('https://example.test/dailyos/','GET',false,'navigate'));
  assert.deepEqual(put,['https://example.test/dailyos/dailyos-sync.js','./']);
  context.fetch=async()=>{throw Error('offline');};
  assert.equal(await dispatch(request('https://example.test/dailyos/dailyos-sync.js')),'offline:[object Object]');
  assert.equal(await dispatch(request('https://example.test/dailyos/','GET',false,'navigate')),'offline:./');
  assert.equal(await dispatch(request('https://example.test/dailyos/assets/themes/pokemon/health-desktop.png')),'offline:[object Object]','Bundled character art falls back offline');
  assert.equal(await dispatch(request('https://example.test/dailyos/theme-characters.css')),'offline:[object Object]','Theme styles fall back offline');
  cache.put=async()=>{throw Error('quota');};context.fetch=async()=>({status:200,type:'basic',clone:()=>({})});
  assert.equal((await dispatch(request('https://example.test/dailyos/dailyos-sync.js'))).status,200);
  console.log('Passed: private/authenticated/custom-domain URLs bypass cache, app assets remain offline, unrelated caches survive, quota errors do not break requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
