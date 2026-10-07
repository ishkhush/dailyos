const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const start=html.indexOf('async function analyzePhotoWithKey('),end=html.indexOf('// ── API KEY SCREEN',start);
const calls=[];
const context={imageB64ToJpegBlob:async()=>new Blob(['jpeg'],{type:'image/jpeg'}),blobToB64:async()=>'jpeg-base64',extractJSON:JSON.parse,
  callClaude:async(...args)=>{calls.push(args);return JSON.stringify({name:'Rice and chicken',calories:520,carbs:55,protein:40,fat:12,fiber:3,items:['Rice','Chicken'],confidence:'medium',note:'Estimated portions'});}};
vm.runInNewContext(html.slice(start,end),context);
(async()=>{
  const result=await context.analyzePhotoWithKey('device-owned-key','input-base64','image/jpeg');
  assert.equal(result.calories,520);assert.equal(result.name,'Rice and chicken');assert.equal(calls.length,1);
  assert.equal(calls[0][0],'device-owned-key');assert.equal(calls[0][1][0].content[0].source.data,'jpeg-base64');assert.equal(calls[0][4],'claude-sonnet-4-6');
  await assert.rejects(()=>context.analyzePhotoWithKey('','x','image/jpeg'),/Connect food AI/);
  await assert.rejects(()=>context.analyzePhotoWithKey('key','x','image/svg+xml'),/supported/);
  assert(!/const\s+LOGMEAL_TOKEN\s*=/.test(html),'No shared food-scanner credential in shipped source');
  assert(!html.includes('api.logmeal.es'),'No calls to retired shared-key provider');
  console.log('Passed: photo food scanning uses per-device AI connection, retains result shape, rejects unsupported inputs and ships no shared LogMeal key.');
})().catch(error=>{console.error(error);process.exit(1);});
