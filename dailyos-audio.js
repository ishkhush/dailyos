(function() {
  const notes = {
    water: [[820,1560,0,.19,.035],[1160,680,.085,.20,.018]],
    complete: [[523.25,523.25,0,.18,.025],[783.99,783.99,.075,.24,.022]],
    save: [[440,660,0,.22,.023]], select: [[420,370,0,.095,.018]],
    xp: [[523.25,587.33,0,.22,.025],[659.25,783.99,.10,.28,.020]],
    level: [[523.25,523.25,0,.35,.025],[659.25,659.25,.09,.36,.020],[783.99,1046.5,.18,.45,.018]]
  };
  const urls = {};
  let context, last = 0, ready = false;
  const media = new Audio();
  media.preload = 'auto'; media.volume = .55;
  media.onended = () => { try { if(navigator.audioSession)navigator.audioSession.type='auto'; } catch {} };
  function wav(kind) {
    if (urls[kind]) return urls[kind];
    const tones = notes[kind] || notes.select, rate = 22050;
    const length = Math.ceil(Math.max(...tones.map(n => n[2]+n[3])) * rate), buffer = new ArrayBuffer(44 + length * 2), view = new DataView(buffer);
    const chars = (offset, str) => [...str].forEach((c,i) => view.setUint8(offset+i,c.charCodeAt(0)));
    chars(0,'RIFF'); view.setUint32(4,36+length*2,true); chars(8,'WAVE'); chars(12,'fmt ');
    view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,rate,true);
    view.setUint32(28,rate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); chars(36,'data'); view.setUint32(40,length*2,true);
    const phases = tones.map(() => 0);
    for (let i=0;i<length;i++) {
      let sample = 0;
      tones.forEach(([from,to,delay,duration,volume],j) => {
        const t = i/rate-delay;
        if (t<0 || t>=duration) return;
        phases[j] += 2*Math.PI*from*Math.pow(to/from,t/duration)/rate;
        const envelope = Math.min(1,t/.012)*Math.exp(-7*t/duration)*Math.min(1,(duration-t)/.015);
        sample += Math.sin(phases[j])*volume*envelope;
      });
      view.setInt16(44+i*2,Math.max(-32767,Math.min(32767,Math.round(sample*32767))),true);
    }
    return urls[kind] = URL.createObjectURL(new Blob([buffer], {type:'audio/wav'}));
  }
  function unlock() {
    if (ready) return;
    try { if(JSON.parse(localStorage.getItem('dos_sound_v1')||'true')===false)return; } catch {}
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try { if (Ctx) { context ||= new Ctx(); context.resume().then(()=>context.suspend()).catch(()=>{}); } } catch {}
    ready = true;
  }
  document.addEventListener('pointerdown',unlock,{capture:true});
  document.addEventListener('keydown',unlock,{capture:true});
  window.DailyAudio = {
    play(kind) {
      let enabled = true; try { enabled = JSON.parse(localStorage.getItem('dos_sound_v1') || 'true'); } catch {}
      if (!enabled || document.hidden || Date.now()-last < 90 || !ready) return;
      last = Date.now();
      try { if(navigator.audioSession)navigator.audioSession.type='playback'; } catch {}
      // Short media playback bypasses iOS's silent switch without a looping unlock track.
      media.src = wav(kind); media.currentTime = 0;
      media.play().catch(()=>{});
    }, unlock
  };
})();
