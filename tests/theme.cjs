const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dailyos-theme.js','utf8');
const boot=saved=>{
 const attributes=new Set(),html={dataset:{},toggleAttribute:(key,on)=>on?attributes.add(key):attributes.delete(key)};
 const window={document:{documentElement:html},localStorage:{getItem:()=>saved}};
 vm.runInNewContext(source,{window,JSON});return {theme:window.DailyTheme,html,attributes};
};
for(const [saved,expected] of [['"akatsuki"','akatsuki'],['"pokemon"','pokemon'],['"modern"','modern'],['"vintage"','vintage'],['"Crimson"','crimson'],['bad-json','og'],['"unknown"','og']]){
 const {theme,html,attributes}=boot(saved);assert.equal(html.dataset.theme,expected,'Saved theme applies before React starts');
 assert.equal(html.dataset.page,'home');assert.equal(html.dataset.identity,theme.catalog[expected].rich?'rich':'classic');
 for(const key of Object.keys(theme.catalog)){theme.apply(key);assert.equal(html.dataset.theme,key);assert.equal(attributes.has('data-character-theme'),['pokemon','akatsuki'].includes(key),'Character skin does not leak to '+key);}
}
const ak=fs.readFileSync('theme-akatsuki.css','utf8');
assert(ak.includes('.theme-preview[data-theme="akatsuki"]'),'Preview uses its own theme scope');
assert(!ak.includes('html[data-theme="akatsuki"] .theme-preview{'),'No active-theme selector paints every preview');
assert(ak.includes(':not(.prayer-card)'),'Completion cloud explicitly excludes prayer cards');
for(const file of ['theme-characters.css','theme-sections.css'])assert(!fs.readFileSync(file,'utf8').includes('akatsuki'),'Akatsuki CSS belongs only to theme-akatsuki.css');
console.log('Passed: before-paint saved-theme restore, aliases, invalid settings fallback, character-skin reset and Akatsuki stylesheet isolation.');
