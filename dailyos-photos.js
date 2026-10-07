(function(root) {
  let database;
  const open = () => database ||= new Promise((resolve,reject) => {
    const request=indexedDB.open('dailyos-thumbnails',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('images',{keyPath:'date'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{database=null;reject(request.error);};
  });
  async function thumbnail(photo,resize) {
    const db=await open();
    const cached=await new Promise((resolve,reject)=>{
      const tx=db.transaction('images','readonly'),request=tx.objectStore('images').get(photo.date);
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    if(cached?.ts===photo.ts)return cached.blob;
    const blob=await resize(photo.blob,360,0.72);
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('images','readwrite');
      tx.objectStore('images').put({date:photo.date,ts:photo.ts,blob});
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
    return blob;
  }
  root.DailyPhotos={thumbnail};
})(window);
