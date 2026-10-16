(()=>{
 const root=document.documentElement;let queued=false,previousXP=null,bounceTimer;
 function draw(){queued=false;const page=root.dataset.page||'home';if(root.dataset.theme==='ufc'){
 document.querySelectorAll('.page-enter div[style],.page-enter section[style]').forEach(el=>{
 if(el.matches('.page-header,.hero-header,.hero-row,.home-layout,.fn-figure')||el.closest('.fn-figure,.theme-sheet'))return;
 const s=el.style,rect=el.getBoundingClientRect();
 if(parseFloat(s.borderRadius)>=14&&(s.border||s.backdropFilter)&&s.background&&rect.width>=140&&rect.height>=45)el.classList.add('fn-card');
 if(el.childElementCount===0&&/^🔥\s*\d+\s*days?$/.test(el.textContent.trim())&&el.closest('.habit-list'))el.dataset.hornStreak=el.textContent.replace('🔥','').trim();
 if(el.childElementCount===0&&/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u.test(el.textContent)&&el.textContent.trim())el.classList.add('fn-emoji');
 });
 const xp=typeof ld==='function'?ld('dos_xp_v1',{}).total:undefined;
 if(previousXP!==null&&xp>previousXP&&page==='home'){const bar=document.querySelector('.xp-fill');if(bar){bar.classList.remove('fn-xp-rise');void bar.offsetWidth;bar.classList.add('fn-xp-rise');clearTimeout(bounceTimer);bounceTimer=setTimeout(()=>bar.classList.remove('fn-xp-rise'),600);}}
 if(Number.isFinite(xp))previousXP=xp;
 }
 }
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(draw);}};
 new MutationObserver(schedule).observe(document.querySelector('#root'),{childList:true,subtree:true,characterData:true});
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-page','data-theme']});schedule();
})();
