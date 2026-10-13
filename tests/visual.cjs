const fs=require('node:fs'),path=require('node:path'),{connect}=require('./support/cdp.cjs'),{installIsolation}=require('./support/isolation.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const output=process.env.QA_ARTIFACTS,baseline=path.resolve('tests/visual-baselines');
const report={checks:[],screenshots:[],errors:[],skippedComparisons:[],differences:[],environment:null};
let browser,page,context;
function check(name,passed,detail){report.checks.push({name,passed,...(passed?{}:{detail})});}
(async()=>{
  const version=await (await fetch(process.env.QA_DEBUG_URL+'/json/version')).json();
  report.environment={browser:version.Browser,platform:process.platform,arch:process.arch,timezone:'America/Los_Angeles',locale:'en-US',clock:'2026-10-08T12:00:00-07:00',scale:1};
  browser=await connect(version.webSocketDebuggerUrl);
  context=(await browser.send('Target.createBrowserContext')).browserContextId;
  const {targetId}=await browser.send('Target.createTarget',{url:'about:blank',browserContextId:context});
  const target=(await (await fetch(process.env.QA_DEBUG_URL+'/json/list')).json()).find(t=>t.id===targetId);
  page=await connect(target.webSocketDebuggerUrl);const {send,ws}=page;
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await installIsolation(send,ws);
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.method!=='Fetch.requestPaused')return;const {requestId,request}=m.params;const name=request.url.includes('react-dom.production')?'dailyos-react-dom.min.js':request.url.includes('react.production')?'dailyos-react.min.js':request.url.includes('babel.min.js')?'dailyos-babel-7.29.6.min.js':request.url.includes('confetti.browser.min.js')?'dailyos-confetti.min.js':null;if(name)send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'},{name:'Access-Control-Allow-Origin',value:'*'}],body:fs.readFileSync(path.join(process.env.QA_CACHE,name)).toString('base64')}).catch(e=>report.errors.push(e.message));});
  await send('Fetch.enable',{patterns:[{urlPattern:'*://*.supabase.co/*'},{urlPattern:'*://api.anthropic.com/*'},{urlPattern:'*://api.open-meteo.com/*'},{urlPattern:'*cdnjs.cloudflare.com*'},{urlPattern:'*cdn.jsdelivr.net*'}]});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{if(!localStorage.getItem('qa_seeded')){localStorage.setItem('qa_seeded','true');const data={dos_backup_meta_v1:{lastBackup:Date.now()},dos_sound_v1:false,dos_theme_v1:'og',dos_habits_v1:[{id:'qa-read',name:'Read',emoji:'📖',startTime:'09:00',endTime:'09:30'}]};for(const [k,v]of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));}let sync;Object.defineProperty(window,'DailySync',{configurable:true,get:()=>sync,set:value=>{sync=value;sync.start=async()=>{};sync.status=()=>({configured:true,connected:true,message:'Synced',pending:0,email:'qa@example.test'});sync.subscribe=fn=>{fn(sync.status());return()=>{};};}});})();`});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const ready=async()=>{for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('.app-nav')`))return;await wait(100);}throw Error('App did not render');};
  await send('Page.navigate',{url:process.env.QA_ORIGIN+'/index.html'});await ready();
  const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await wait(120);};
  const tab=async label=>{await evaluate(`[...document.querySelectorAll('.app-nav button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);await wait(160);};
  await click('[aria-label="Bottle 1"]');await tab('Habits');await click('[aria-label="Mark Read"]');
  await send('Page.reload');await ready();await tab('Habits');
  check('Habit persists across reload',await evaluate(`document.querySelector('[aria-label="Mark Read"]').getAttribute('aria-pressed')==='true'`));
  await click('[aria-label="Mark Read"]');await tab('Home');
  check('Water persists across reload',await evaluate(`ld('dos_water_v2',{}).count===1`));await click('[aria-label="Bottle 1"]');
  const settle=async()=>{await evaluate(`(async()=>{document.querySelectorAll('.app-scroll').forEach(e=>e.scrollTop=0);window.scrollTo(0,0);await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));const style=document.createElement('style');style.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';document.head.appendChild(style);})()`);await wait(200);};
  const capture=async name=>{
    await settle();const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    const file=name+'.png';fs.writeFileSync(path.join(output,file),Buffer.from(shot.data,'base64'));report.screenshots.push(file);
    const ref=path.join(baseline,file);if(!fs.existsSync(ref)){report.skippedComparisons.push(file);return;}
    const approved=JSON.parse(fs.readFileSync(path.join(baseline,'environment.json'),'utf8'));
    if(JSON.stringify(approved)!==JSON.stringify(report.environment)){check('Baseline environment '+name,false,'Browser/platform differs; reproduce approved environment before comparing');return;}
    const difference=await evaluate(`(async()=>{const load=async b64=>{const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return {width:c.width,height:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};};const a=await load(${JSON.stringify(fs.readFileSync(ref).toString('base64'))}),b=await load(${JSON.stringify(shot.data)});if(a.width!==b.width||a.height!==b.height)return {ratio:1,dimensions:true};let changed=0;for(let i=0;i<a.data.length;i+=4)if(Math.max(...[0,1,2,3].map(j=>Math.abs(a.data[i+j]-b.data[i+j])))>8)changed++;return {ratio:changed/(a.width*a.height)};})()`);
    if(difference.ratio>.001){report.differences.push({file,...difference});check('Screenshot '+name,false,difference);}else check('Screenshot '+name,true);
  };
  for(const [width,height]of [[320,568],[375,812],[390,844],[768,1024],[1280,800],[1440,900]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});
    for(const name of ['Home','Health','Habits','Stack','Progress']){
      await tab(name);await settle();
      const layout=await evaluate(`(()=>{const unnamed=[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length&&!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.title).map(e=>e.outerHTML.slice(0,160));const overflow=[...document.querySelectorAll('main,section,.page-header,.page-title,.app-nav,.habit-list')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().right>innerWidth+1).map(e=>e.className||e.tagName);return {scroll:document.documentElement.scrollWidth<=innerWidth,unnamed,overflow};})()`);
      check(name+' layout '+width,layout.scroll&&layout.overflow.length===0,layout);
      check(name+' button names '+width,layout.unnamed.length===0,layout.unnamed);
      await capture(name.toLowerCase()+'-og-'+width+'x'+height);
    }
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await tab('Home');
  await click('[aria-label="Change accent theme"]');await capture('theme-picker-390x844');
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Done').click()`);
  await tab('Habits');await click('[aria-label="Edit habit Read"]');await capture('habit-editor-390x844');
  check('Modal focus containment',await evaluate(`!!document.activeElement.closest('[role="dialog"]')`));
  check('No runtime exceptions',report.errors.length===0,report.errors);
  fs.writeFileSync(path.join(output,'environment.json'),JSON.stringify(report.environment,null,2)+'\n');
})().catch(error=>{check('Visual execution',false,error.message);}).finally(async()=>{
  if(context)await browser.send('Target.disposeBrowserContext',{browserContextId:context}).catch(()=>{});page?.ws.close();browser?.ws.close();
  fs.writeFileSync(path.join(output,'visual-report.json'),JSON.stringify(report,null,2)+'\n');
  const failures=report.checks.filter(c=>!c.passed);console.log(`${report.checks.length-failures.length}/${report.checks.length} checks passed; ${report.screenshots.length} screenshots; ${report.skippedComparisons.length} comparisons skipped (no reference).`);
  for(const f of failures)console.log('FAIL: '+f.name+' '+JSON.stringify(f.detail));process.exitCode=failures.length?1:0;
});
