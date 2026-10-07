(function(root) {
  const excluded = new Set(['dos_api_key','dos_el_key_v1','dos_rl','dos_backup_meta_v1','dos_xp_v1','dos_body_index_v1']);
  const eligible = key => typeof key==='string' && key.startsWith('dos_') && !key.startsWith('dos_sync_') && !excluded.has(key);
  const unsafe = key => ['__proto__','constructor','prototype'].includes(key);
  const validPath = path => Array.isArray(path) && path.length>0 && path.length<=32 && path.every(key=>typeof key==='string' && key.length>0 && key.length<=512 && !unsafe(key)) && (eligible(path[0]) || path[0]==='photos' || (path[0]==='__seed' && path.length===1));
  function validRow(row) {
    try {
      const path=JSON.parse(row.path),value=row.value;
      if(path[0]==='photos' && !row.deleted && (path.length===1?value?.type!=='object':path.length!==2 || !/^\d{4}-\d{2}-\d{2}$/.test(path[1]) || value?.type!=='value' || value.data?.date!==path[1] || !Number.isFinite(value.data?.ts) || typeof value.data?.path!=='string'))return false;
      return validPath(path) && pathKey(path)===row.path && Number.isSafeInteger(row.stamp) && row.stamp>=0 && typeof row.device==='string' && row.device.length<=128 && typeof row.deleted==='boolean' && (row.deleted || (value && (value.type==='value' || value.type==='object' || (value.type==='items' && Array.isArray(value.order) && value.order.every(k=>typeof k==='string' && !unsafe(k))))));
    } catch { return false; }
  }
  function browserKeyAllowed(key) {
    if(typeof key!=='string')return false;
    if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;
    try { return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon'; } catch { return false; }
  }
  const pathKey = path => JSON.stringify(path);
  const compare = (a,b) => !b ? 1 : a.stamp-b.stamp || a.device.localeCompare(b.device);
  function flatten(value, path, out = {}) {
    if(!Array.isArray(path) || path.some(key=>typeof key!=='string'||unsafe(key)))throw Error('Invalid sync data path.');
    const key = pathKey(path);
    const habitRecord=(path[0]==='dos_habits_v1'&&path.length===2)||(path[0]==='dos_planner_v1'&&path.length===4&&path[2]==='habits');
    if (habitRecord || path.at(-2)==='habitTimes') {out[key]={type:'value',data:value};return out;}
    const itemKey=path[0]==='dos_bw_log_v1' && path.length===1?'date':'id';
    if (Array.isArray(value) && value.length && value.every(v => v && typeof v==='object' && v[itemKey]!==undefined) && new Set(value.map(v=>String(v[itemKey]))).size===value.length) {
      out[key] = { type:'items', order:value.map(v=>String(v[itemKey])) };
      value.forEach(v=>flatten(v,[...path,String(v[itemKey])],out));
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
    children.forEach(k=>{ const value=materialize(rows,[...path,k]); if(value!==undefined)Object.defineProperty(object,k,{value,enumerable:true,writable:true,configurable:true}); });
    if (node.value.type==='items') {
      const order = [...node.value.order,...Object.keys(object).filter(k=>!node.value.order.includes(k)).sort()];
      return order.filter(k=>object[k]!==undefined).map(k=>object[k]);
    }
    return object;
  }
  root.DailySyncCodec = { flatten, materialize, compare, eligible, validRow };
  if (typeof module!=='undefined') { module.exports=root.DailySyncCodec; return; }
  const read = (key,fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const put = (key,value) => localStorage.setItem(key,JSON.stringify(value));
  const device = read('dos_sync_device_v1',null) || crypto.randomUUID();
  put('dos_sync_device_v1',device);
  let meta = read('dos_sync_meta_v1',{owner:null,rows:{},pending:{},clock:0});
  if(!meta || typeof meta!=='object' || !meta.rows || !meta.pending)throw Error('Sync recovery data is damaged. Restore a backup before continuing.');
  meta.rows=Object.fromEntries(Object.entries(meta.rows).filter(([path,row])=>path===row.path && validRow(row)));
  meta.pending=Object.fromEntries(Object.entries(meta.pending).filter(([path,row])=>path===row.path && validRow(row)));
  meta.clock=Number.isSafeInteger(meta.clock)&&meta.clock>=0?meta.clock:0;
  let client, session, channel, adapter, working = false, dirty = false, starting = false, reconciling=false, authSubscription, timer, seedAuthorized = false;
  const baseline = {};
  Object.keys(localStorage).filter(eligible).forEach(key=>{
    const stored = meta.owner ? materialize(meta.rows,[key]) : read(key,null);
    baseline[key]=stored===undefined?{}:flatten(stored,[key]);
  });
  const listeners = new Set();
  const acknowledged = {};
  let status = { message:'Local mode', pending:Object.keys(meta.pending).length, email:null, connected:false, error:'' };
  const report = (message,error='') => { status={message,error,pending:Object.keys(meta.pending).length,email:session?.user.email||null,connected:!!session}; listeners.forEach(fn=>fn({...status})); };
  const persist = () => {mergeStoredMeta();put('dos_sync_meta_v1',meta);};
  const stamp = () => meta.clock = Math.max(Date.now(),meta.clock+1);
  function mergeStoredMeta(stored=read('dos_sync_meta_v1',null)) {
    if(!stored || stored.owner!==meta.owner || !stored.rows || !stored.pending)return;
    for(const row of Object.values(stored.rows))if(validRow(row) && compare(row,meta.rows[row.path])>0)meta.rows[row.path]=row;
    for(const row of Object.values(stored.pending))if(validRow(row) && compare(row,acknowledged[row.path])>0 && compare(row,meta.pending[row.path])>0 && compare(row,meta.rows[row.path])>=0)meta.pending[row.path]=row;
    meta.clock=Math.max(meta.clock,Number.isSafeInteger(stored.clock)?stored.clock:0);
  }
  function localDoc(key,value) {
    if (!eligible(key)) return;
    mergeStoredMeta();
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
  async function applyRows(incoming, replace=false,confirmed=true) {
    mergeStoredMeta();
    const affected=new Set();
    if (replace) { meta.rows={}; Object.keys(baseline).forEach(k=>affected.add(k)); }
    incoming.forEach(row=>{
      if(!validRow(row))throw Error('The cloud returned an invalid sync record.');
      if(JSON.parse(row.path)[0]==='photos' && !row.deleted && row.value.type==='value' && (!session || !row.value.data.path.startsWith(session.user.id+'/') || row.value.data.path.split('/').some(part=>part==='..'||part==='.'||!part)))throw Error('The cloud returned a photo from another account.');
      affected.add(JSON.parse(row.path)[0]);
      meta.clock=Math.max(meta.clock,row.stamp);
      const queued=meta.pending[row.path];
      if(confirmed && queued && compare(row,queued)>=0){acknowledged[row.path]=row;delete meta.pending[row.path];}
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
      if (key==='photos') { await adapter.applyPhotos(value||{}); continue; }
      if (!eligible(key)) continue;
      if (value!==undefined) { baseline[key]=flatten(value,[key]); put(key,value); adapter.apply(key,value); }
      else { localStorage.removeItem(key); baseline[key]={}; adapter.apply(key,adapter.defaults[key]); }
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
    if (working || starting || reconciling || !session || !navigator.onLine) { dirty=true; return; }
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
        mergeStoredMeta();
        batch.forEach(row=>{acknowledged[row.path]=row;if(meta.pending[row.path] && compare(meta.pending[row.path],row)===0)delete meta.pending[row.path];});
        await applyRows(data||[]);
      }
      report('Synced');
    } catch(error) { report(navigator.onLine?'Sync needs attention':'Offline · changes queued',error.message); }
    finally { working=false; persist(); if(dirty)schedule(); }
  }
  async function hydrate(nextSession,allowSeed=seedAuthorized) {
    if (!nextSession) { session=null; if(channel)await client.removeChannel(channel); channel=null; report('Local mode'); return; }
    if (meta.owner && meta.owner!==nextSession.user.id) { session=null; await client.auth.signOut(); report('Sign in to sync'); throw Error('This browser holds another account’s offline data. Use a separate browser profile for a different account.'); }
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
    if (!session || starting || working || reconciling || !navigator.onLine)return;
    if(!meta.owner){try{await hydrate(session,false);}catch(e){report('Sync needs attention',e.message);}return;}
    reconciling=true;
    try { await applyRows(await pull()); } catch(e) { report('Sync needs attention',e.message); }
    finally { reconciling=false; }
    await flush();
  }
  async function connect() {
    const config=read('dos_sync_config_v1',root.DAILYOS_SYNC||{});
    if (!config.url || !config.publishableKey) { report('Local mode · set up sync'); return; }
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url))throw Error('Use your project’s https://…supabase.co URL.');
    if(!browserKeyAllowed(config.publishableKey))throw Error('Use only a Supabase publishable or anon browser key. Secret and service-role keys are rejected.');
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
      window.addEventListener('storage',e=>{
        try {
          if(e.key==='dos_sync_meta_v1' && e.newValue){const stored=JSON.parse(e.newValue);mergeStoredMeta(stored);applyRows(Object.values(meta.rows),false,false).then(()=>schedule()).catch(error=>report('Sync needs attention',error.message));}
          else if(eligible(e.key)){const value=e.newValue===null?adapter.defaults[e.key]:JSON.parse(e.newValue);baseline[e.key]=e.newValue===null?{}:flatten(value,[e.key]);adapter.apply(e.key,value);}
        }catch(error){report('Sync needs attention',error.message);}
      });
      setInterval(reconcile,15000);
      try {await connect();}catch(e){report('Sync needs attention',e.message);throw e;}
    },
    write:localDoc,
    async photo(date,photo) {
      if (!meta.owner)return;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Invalid photo date.');
      if(photo && (!(photo.blob instanceof Blob) || photo.blob.type!=='image/jpeg' || photo.blob.size>10*1024*1024 || !Number.isFinite(photo.ts)))throw Error('Photos must be JPEG files under 10 MB with a valid date.');
      mergeStoredMeta();
      const at=stamp(), path=pathKey(['photos',date]);
      const row={path,value:photo?{type:'value',data:{date,ts:photo.ts,path:meta.owner+'/'+date+'/'+at+'-'+device+'.jpg'}}:null,deleted:!photo,stamp:at,device};
      meta.rows[path]=row;meta.pending[path]=row;persist();report('Photo queued');schedule();
    },
    photoCurrent:date=>materialize(meta.rows,['photos',date]),
    async configure(url,publishableKey) {
      const browserKey=publishableKey.trim();
      if(!browserKeyAllowed(browserKey))throw Error('Use only a Supabase publishable or anon browser key. Secret and service-role keys are rejected.');
      if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim()))throw Error('Use your project’s https://…supabase.co URL.');
      const previous=read('dos_sync_config_v1',root.DAILYOS_SYNC||{});
      if(meta.owner && previous.url && previous.url.replace(/\/$/,'')!==url.trim().replace(/\/$/,''))throw Error('Use a separate browser profile to connect existing offline data to another project.');
      put('dos_sync_config_v1',{url:url.trim().replace(/\/$/,''),publishableKey:browserKey});session=null;await connect();
    },
    async login(email,password,signup=false) {
      if(!client)throw Error('Set up your Supabase URL and publishable key first.');
      if(signup)throw Error('Public account creation is disabled. Use your existing account.');
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      if(data.session && !starting){seedAuthorized=true;await hydrate(data.session,true);}
      return data.session?'Signed in':'Check your email to confirm your account, then sign in.';
    },
    async logout() { if(Object.keys(meta.pending).length)throw Error('Wait for queued changes to sync before signing out.');const {error}=await client.auth.signOut();if(error)throw error; },
    async downloadPhoto(path) { if(!session || typeof path!=='string' || !path.startsWith(session.user.id+'/') || path.split('/').some(part=>part==='..'||part==='.'||!part))throw Error('Sign in to access your own photos.');const {data,error}=await client.storage.from('dailyos-photos').download(path);if(error)throw error;return data; },
    async seed() {seedAuthorized=true;await hydrate(session,true);},
    retry:async()=>{if(session)await hydrate(session);else await connect();}
  };
})(typeof window!=='undefined'?window:globalThis);
