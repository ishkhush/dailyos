const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dailyos-weather.js','utf8');
let time=new Date('2026-10-08T18:00:00Z').getTime(),calls=0,release,fail=false;
class Clock extends Date{constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}}
const memory=new Map(),window={sessionStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},fetch:()=>{calls++;return new Promise((resolve,reject)=>{release=()=>fail?reject(Error('offline')):resolve({ok:true,json:async()=>({current:{temperature_2m:82},daily:{uv_index_max:[6]},hourly:{}})});});}};
const start=()=>{vm.runInNewContext(source,{window,Date:Clock,Intl,Promise,Error,JSON});return window.DailyWeather;};
(async()=>{
 let weather=start();assert.equal(weather.peek(),null);
 const a=weather.load(),b=weather.load();assert.equal(a,b,'Concurrent mounts share pending request');assert.equal(calls,1);release();await a;
 assert.equal(weather.peek().current.temperature_2m,82);await weather.load();assert.equal(calls,1,'Home revisit/theme change uses fresh cache');
 weather=start();assert.equal(weather.peek().current.temperature_2m,82,'Reload paints session cache immediately');await weather.load();assert.equal(calls,1);
 time+=11*60*1000;const refresh=weather.load();assert.equal(weather.peek().current.temperature_2m,82,'Stale value remains during refresh');fail=true;release();await assert.rejects(refresh,/offline/);
 fail=false;const retry=weather.load();release();await retry;assert.equal(calls,3,'Failure clears pending request for retry');
 time=new Date('2026-10-09T08:00:00Z').getTime();assert.equal(weather.peek(),null,'Previous day is not shown');const next=weather.load();release();await next;assert.equal(calls,4);
 console.log('Passed: weather request deduplication, instant remount/reload cache, stale refresh, retry and local-day rollover.');
})().catch(error=>{console.error(error);process.exitCode=1;});
