const fixedClock=`(()=>{const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-08T12:00:00-07:00']));}static now(){return new NativeDate('2026-10-08T12:00:00-07:00').getTime();}};})();`;
async function installIsolation(send,ws){
  await send('Emulation.setTimezoneOverride',{timezoneId:'America/Los_Angeles'});
  await send('Emulation.setLocaleOverride',{locale:'en-US'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:fixedClock});
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);if(m.method!=='Fetch.requestPaused')return;
    const {requestId,request}=m.params;
    if(/supabase|anthropic|api\.open-meteo/.test(new URL(request.url).hostname))send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'}).catch(()=>{});
  });
}
module.exports={installIsolation,fixedClock};
