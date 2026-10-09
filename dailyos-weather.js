(function(root){
  const KEY='dailyos-weather-v1',TTL=10*60*1000;
  let cache=null,pending=null;
  const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  try{cache=JSON.parse(root.sessionStorage.getItem(KEY));}catch{}
  const peek=()=>cache?.day===day()?cache.value:null;
  const load=()=>{
    if(peek()&&Date.now()-cache.at<TTL)return Promise.resolve(cache.value);
    if(pending)return pending;
    const today=day();
    pending=root.fetch('https://api.open-meteo.com/v1/forecast?latitude=33.6846&longitude=-117.8265&current=temperature_2m,apparent_temperature,weathercode,uv_index&hourly=uv_index&daily=uv_index_max&timezone=America%2FLos_Angeles&forecast_days=1&temperature_unit=fahrenheit')
      .then(response=>{if(!response.ok)throw Error('Weather unavailable');return response.json();})
      .then(data=>{
        if(!data?.current)throw Error('Weather unavailable');
        const value={current:data.current,daily:data.daily,hourly:data.hourly};
        cache={day:today,at:Date.now(),value};
        try{root.sessionStorage.setItem(KEY,JSON.stringify(cache));}catch{}
        return value;
      }).finally(()=>{pending=null;});
    return pending;
  };
  root.DailyWeather={peek,load};
})(window);
