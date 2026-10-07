(function(root) {
  const excluded = new Set(['dos_api_key','dos_el_key_v1','dos_rl','dos_backup_meta_v1','dos_xp_v1','dos_body_index_v1']);
  const eligible = key => key.startsWith('dos_') && !key.startsWith('dos_sync_') && !excluded.has(key);
  const pathKey = path => JSON.stringify(path);
  const compare = (a,b) => !b ? 1 : a.stamp-b.stamp || a.device.localeCompare(b.device);
  function flatten(value, path, out = {}) {
    const key = pathKey(path);
    const habitRecord=(path[0]==='dos_habits_v1'&&path.length===2)||(path[0]==='dos_planner_v1'&&path.length===4&&path[2]==='habits');
    if (habitRecord || path.at(-2)==='habitTimes') {out[key]={type:'value',data:value};return out;}
    if (Array.isArray(value) && value.length && value.every(v => v && typeof v==='object' && v.id!==undefined) && new Set(value.map(v=>String(v.id))).size===value.length) {
      out[key] = { type:'items', order:value.map(v=>String(v.id)) };
      value.forEach(v=>flatten(v,[...path,String(v.id)],out));
    } else if (value && typeof value==='object' && !Array.isArray(value)) {
      out[key] = { type:'object' };
      Object.entries(value).forEach(([k,v])=>flatten(v,[...path,k],out));
    } else out[key] = { type:'value', data:value };
    return out;
  }
  function materialize(rows, path) {
    const node = rows[pathKey(path)];
    if (!node || node.deleted) return undefined;
    if (node.value.type==='value') return node.value.data;
    const children = Object.entries(rows).filter(([key,row]) => {
      const p=JSON.parse(key); return !row.deleted && p.length===path.length+1 && path.every((v,i)=>p[i]===v);
    }).map(([key])=>JSON.parse(key).at(-1));
    const object = {};
    children.forEach(k=>{ const value=materialize(rows,[...path,k]); if(value!==undefined)object[k]=value; });
    if (node.value.type==='items') {
      const order = [...node.value.order,...Object.keys(object).filter(k=>!node.value.order.includes(k)).sort()];
      return order.filter(k=>object[k]!==undefined).map(k=>object[k]);
    }
    return object;
  }
  root.DailySyncCodec = { flatten, materialize, compare, eligible };
  if (typeof module!=='undefined') { module.exports=root.DailySyncCodec; return; }
  const read = (key,fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const put = (key,value) => localStorage.setItem(key,JSON.stringify(value));
  const device = read('dos_sync_device_v1',null) || crypto.randomUUID();
  put('dos_sync_device_v1',device);
  let meta = read('dos_sync_meta_v1',{owner:null,rows:{},pending:{},clock:0});
  let client, session, channel, adapter, working = false, dirty = false, starting = false, authSubscription, timer, seedAuthorized = false;
  const baseline = {};
  Object.keys(localStorage).filter(eligible).forEach(key=>{
    const stored = meta.owner ? materialize(meta.rows,[key]) : read(key,null);
    baseline[key]=stored===undefined?{}:flatten(stored,[key]);
  });
  const listeners = new Set();
  let status = { message:'Local mode', pending:Object.keys(meta.pending).length, email:null, connected:false, error:'' };
  const report = (message,error='') => { status={message,error,pending:Object.keys(meta.pending).length,email:session?.user.email||null,connected:!!session}; listeners.forEach(fn=>fn({...status})); };
  const persist = () => put('dos_sync_meta_v1',meta);
  const stamp = () => meta.clock = Math.max(Date.now(),meta.clock+1);
  function localDoc(key,value) {
    if (!eligible(key)) return;
    const next=flatten(value,[key]), old=baseline[key] || {};
    baseline[key]=next;
    if (!meta.owner) return;
    const changed=Object.keys(next).filter(k=>JSON.stringify(next[k])!==JSON.stringify(old[k]));
    const missing=Object.keys(old).filter(k=>!(k in next));
    const removed=missing.filter(k=>{const p=JSON.parse(k);return !missing.some(parent=>{const q=JSON.parse(parent);return q.length<p.length&&q.every((v,i)=>p[i]===v);});});
    if (!changed.length && !removed.length) return;
    const at=stamp();
    const keys = new Set([...changed,...removed]);
    // Keep an edited offline record alive if it races a whole-record deletion.
    changed.forEach(k=>{const p=JSON.parse(k);for(let n=1;n<p.length;n++)keys.add(pathKey(p.slice(0,n)));});
    keys.forEach(key=>{const row={path:key,value:next[key]||null,deleted:!(key in next),stamp:at,device};meta.rows[key]=row;meta.pending[key]=row;});
    persist(); report(navigator.onLine?'Changes queued':'Offline · changes queued'); schedule();
  }
  async function applyRows(incoming, replace=false) {
    const affected=new Set();
    if (replace) { meta.rows={}; Object.keys(baseline).forEach(k=>affected.add(k)); }
    incoming.forEach(row=>{
      affected.add(JSON.parse(row.path)[0]);
      meta.clock=Math.max(meta.clock,row.stamp);
      if (compare(row,meta.rows[row.path])>0) {
        meta.rows[row.path]=row; affected.add(JSON.parse(row.path)[0]);
        const pending=meta.pending[row.path];
        if(pending && compare(row,pending)>0)delete meta.pending[row.path];
      }
    });
    persist();
    for (const key of affected) {
      if (key==='__seed') continue;
      const value=materialize(meta.rows,[key]);
      if (key==='photos') { if(value!==undefined)await adapter.applyPhotos(value); continue; }
      if (!eligible(key)) continue;
      if (value!==undefined) { baseline[key]=flatten(value,[key]); put(key,value); adapter.apply(key,value); }
      else if(replace) { localStorage.removeItem(key); baseline[key]={}; adapter.apply(key,adapter.defaults[key]); }
    }
  }
  async function pull() {
    const rows=[];
    for (let offset=0;;offset+=500) {
      const {data,error}=await client.from('dailyos_records').select('path,value,deleted,stamp,device').eq('user_id',session.user.id).order('path').range(offset,offset+499);
      if(error)throw error;
      rows.push(...data); if(data.length<500)break;
    }
    return rows;
  }
  const schedule = () => { clearTimeout(timer); timer=setTimeout(()=>flush(),180); };
  async function flush() {
    if (working || starting || !session || !navigator.onLine) { dirty=true; return; }
    working=true; dirty=false;
    try {
      while(Object.keys(meta.pending).length) {
        const candidates=Object.values(meta.pending).slice(0,150),batch=[];
        for (const row of candidates) {
          if(JSON.parse(row.path)[0]==='photos' && !row.deleted) {
            const photo=await adapter.photoBlob(row.value.data.date);
            if(!photo || photo.ts!==row.value.data.ts){if(meta.pending[row.path]&&compare(meta.pending[row.path],row)===0)throw Error('A queued photo is missing locally. Restore your backup before retrying.');continue;}
            const {error}=await client.storage.from('dailyos-photos').upload(row.value.data.path,photo.blob,{contentType:'image/jpeg',upsert:true});
            if(error)throw error;
          }
          batch.push(row);
        }
        if(!batch.length)continue;
        const {data,error}=await client.rpc('dailyos_merge',{changes:batch});
        if(error)throw error;
        batch.forEach(row=>{if(meta.pending[row.path] && compare(meta.pending[row.path],row)===0)delete meta.pending[row.path];});
        await applyRows(data||[]);
      }
      report('Synced');
    } catch(error) { report(navigator.onLine?'Sync needs attention':'Offline · changes queued',error.message); }
    finally { working=false; persist(); if(dirty)schedule(); }
  }
  async function hydrate(nextSession,allowSeed=seedAuthorized) {
    if (!nextSession) { session=null; if(channel)await client.removeChannel(channel); channel=null; report('Local mode'); return; }
    if (meta.owner && meta.owner!==nextSession.user.id) { await client.auth.signOut(); throw Error('This browser holds another account’s offline data. Use a separate browser profile for a different account.'); }
    session=nextSession; starting=true; report('Connecting…');
    try {
      if (channel)await client.removeChannel(channel);
      channel=client.channel('dailyos-'+session.user.id).on('postgres_changes',{event:'*',schema:'public',table:'dailyos_records',filter:'user_id=eq.'+session.user.id},()=>{
        if(starting){dirty=true;return;}
        clearTimeout(timer); timer=setTimeout(()=>reconcile(),150);
      }).subscribe(state=>{if(state==='SUBSCRIBED') { if(!starting&&meta.owner)reconcile(); } else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT')report('Reconnecting…');});
      const remote=await pull();
      const joining=!meta.owner;
      if (joining) {
        if(!remote.length&&!allowSeed){report('Choose migration source');return;}
        const snapshot=await adapter.snapshot();
        put('dos_sync_snapshot_v1',{data:snapshot.data,photoDates:Object.keys(snapshot.photos),savedAt:Date.now()});
        await adapter.backupPhotos(snapshot.photos);
        if (!remote.length) {
          const at=stamp(), records={};
          Object.entries(snapshot.data).filter(([key])=>eligible(key)).forEach(([key,value])=>Object.assign(records,flatten(value,[key])));
          records[pathKey(['photos'])]={type:'object'};
          for (const [date,photo] of Object.entries(snapshot.photos)) {
            const path=session.user.id+'/'+date+'/'+at+'-'+device+'.jpg';
            const {error}=await client.storage.from('dailyos-photos').upload(path,photo.blob,{contentType:'image/jpeg',upsert:true});
            if(error)throw error;
            records[pathKey(['photos',date])]={type:'value',data:{date,ts:photo.ts,path}};
          }
          records[pathKey(['__seed'])]={type:'value',data:true};
          const changes=Object.entries(records).map(([path,value])=>({path,value,stamp:at,device,deleted:false}));
          const {error}=await client.rpc('dailyos_seed',{changes}); if(error)throw error;
        }
        meta.owner=session.user.id; meta.pending={};
        await applyRows(await pull(),true);
      } else await applyRows(remote);
      starting=false; await flush(); report(Object.keys(meta.pending).length?'Changes queued':'Synced');
    } catch(e) { report('Sync needs attention',e.message); throw e; }
    finally { starting=false; }
  }
  async function reconcile() {
    if (!session || starting || working || !navigator.onLine)return;
    try { if(!meta.owner){await hydrate(session,false);return;}await applyRows(await pull()); await flush(); } catch(e) { report('Sync needs attention',e.message); }
  }
  async function connect() {
    const config=read('dos_sync_config_v1',root.DAILYOS_SYNC||{});
    if (!config.url || !config.publishableKey) { report('Local mode · set up sync'); return; }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url))throw Error('Use your project’s https://…supabase.co URL.');
    if(!root.supabase)throw Error('Sync library unavailable. Reopen online.');
    if (client) { authSubscription?.unsubscribe(); if(channel)await client.removeChannel(channel); await client.removeAllChannels(); }
    client=root.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'dailyos-account-session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await client.auth.getSession(); if(error)throw error;
    authSubscription=client.auth.onAuthStateChange((event,next)=>{
      if(event==='TOKEN_REFRESHED')session=next;
      else if(event==='SIGNED_OUT')setTimeout(()=>hydrate(null),0);
      else if(event==='SIGNED_IN' && !session)setTimeout(()=>{if(!session&&!starting)hydrate(next).catch(()=>{});},0);
    }).data.subscription;
    if(data.session)await hydrate(data.session);
    else report('Sign in to sync');
  }
  root.DailySync = {
    eligible, status:()=>({...status}), subscribe(fn){listeners.add(fn);fn({...status});return()=>listeners.delete(fn);},
    async start(nextAdapter) {
      adapter=nextAdapter;
      Object.keys(localStorage).filter(eligible).forEach(key=>localDoc(key,read(key,null)));
      const recover=()=>{if(session)reconcile();else if(status.error)connect().catch(e=>report('Sync needs attention',e.message));};
      window.addEventListener('online',recover); document.addEventListener('visibilitychange',()=>{if(!document.hidden)recover();});
      window.addEventListener('offline',()=>report('Offline · changes queued'));
      window.addEventListener('storage',e=>{if(e.key && eligible(e.key) && e.newValue!==null) {const value=JSON.parse(e.newValue);localDoc(e.key,value);adapter.apply(e.key,value);}});
      setInterval(reconcile,15000);
      try {await connect();}catch(e){report('Sync needs attention',e.message);throw e;}
    },
    write:localDoc,
    async photo(date,photo) {
      if (!meta.owner)return;
      const at=stamp(), path=pathKey(['photos',date]);
      const row={path,value:photo?{type:'value',data:{date,ts:photo.ts,path:meta.owner+'/'+date+'/'+at+'-'+device+'.jpg'}}:null,deleted:!photo,stamp:at,device};
      meta.rows[path]=row;meta.pending[path]=row;persist();report('Photo queued');schedule();
    },
    photoCurrent:date=>materialize(meta.rows,['photos',date]),
    async configure(url,publishableKey) {
      const browserKey=publishableKey.trim();let allowed=browserKey.startsWith('sb_publishable_');
      try {allowed ||= JSON.parse(atob(browserKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';} catch {}
      if(!allowed)throw Error('Use only a Supabase publishable or anon browser key. Secret and service-role keys are rejected.');
      if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim()))throw Error('Use your project’s https://…supabase.co URL.');
      put('dos_sync_config_v1',{url:url.trim().replace(/\/$/,''),publishableKey:browserKey});session=null;await connect();
    },
    async login(email,password,signup=false) {
      if(!client)throw Error('Set up your Supabase URL and publishable key first.');
      const {data,error}=signup?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      if(data.session && !starting){seedAuthorized=true;await hydrate(data.session,true);}
      return data.session?'Signed in':'Check your email to confirm your account, then sign in.';
    },
    async logout() { if(Object.keys(meta.pending).length)throw Error('Wait for queued changes to sync before signing out.');const {error}=await client.auth.signOut();if(error)throw error; },
    async downloadPhoto(path) { const {data,error}=await client.storage.from('dailyos-photos').download(path);if(error)throw error;return data; },
    async seed() {seedAuthorized=true;await hydrate(session,true);},
    retry:async()=>{if(session)await hydrate(session);else await connect();}
  };
})(typeof window!=='undefined'?window:globalThis);
