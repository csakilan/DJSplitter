import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

export type StemMap = Record<string, string>;
export const BASELINE_PCT = 50;
const BASELINE_DB = 20 * Math.log10(BASELINE_PCT / 100);
const pctToDb = (p:number)=> p===0 ? -Infinity : 20*Math.log10(p/100);

export function useToneMixer(stems:StemMap|null, backend:string){
  const ctx = Tone.getContext();             // global context (1 per page)

  /* refs to mutable graph parts */
  const playersRef = useRef<Record<string,Tone.Player>>({});
  const volsRef    = useRef<Record<string,Tone.Volume>>({});
  const masterRef  = useRef<Tone.Gain|null>(null);      // after PitchShift
  const pitchRef   = useRef<Tone.PitchShift|null>(null);

  /* runtime state */
  const [ready,setReady]       = useState(false);
  const [isPlaying,setPlaying] = useState(false);
  const offsetRef = useRef(0);
  const lastStart = useRef(0);

  /* ─── build Players + Volumes ─── */
  useEffect(()=>{
    if(!stems) return;

    /* dispose old */
    Object.values(playersRef.current).forEach(p=>p.dispose());
    Object.values(volsRef.current   ).forEach(v=>v.dispose());
    pitchRef.current?.dispose();
    masterRef.current?.dispose();

    /* fresh master (muted until first play) */
    const master = new Tone.Gain({context:ctx, gain:1}).toDestination();
    masterRef.current = master;

    /* create chain Player→Volume (no Pitch yet) */
    const players:Record<string,Tone.Player> = {};
    const vols   :Record<string,Tone.Volume> = {};
Promise.all(
  Object.entries(stems).map(async ([stem, rel]) => {
    const url = `${backend}${encodeURI(rel)}`;
    const player = new Tone.Player({ context: ctx, autostart: false });
    await player.load(url);  // ← ensure buffer is loaded

    const vol = new Tone.Volume({ volume: BASELINE_DB, context: ctx });
    player.connect(vol);

    vols[stem] = vol;
    players[stem] = player;
  })
).then(() => {
  playersRef.current = players;
  volsRef.current = vols;
  setReady(true);           // ← only now we're ready to start/pause
});


    offsetRef.current=0; setPlaying(false);

    return ()=>{
      Object.values(players).forEach(p=>p.dispose());
      Object.values(vols   ).forEach(v=>v.dispose());
      pitchRef.current?.dispose();
      master.dispose();
    };
  },[stems,backend,ctx]);

  /* helper: ensure PitchShift exists & volumes routed */
  const ensurePitch = ()=>{
    if(pitchRef.current) return;
    const pitch = new Tone.PitchShift({context:ctx, pitch:0});
    pitch.connect(masterRef.current!);
    Object.values(volsRef.current).forEach(v=>{
      v.disconnect();          // was silence
      v.connect(pitch);
    });
    pitchRef.current = pitch;
  };

  const startAll=(when:number,off:number)=>
    Object.values(playersRef.current).forEach(p=>p.start(when,off));

  /* ─── transport ─── */
  const playAll = useCallback(async ()=>{
    if(!ready||isPlaying) return;
    await ctx.resume();        // user gesture unlocks audio
    ensurePitch();             // create PitchShift AFTER resume
    const now=ctx.now();
    startAll(now,offsetRef.current);
    lastStart.current=now; setPlaying(true);
  },[ready,isPlaying,ctx]);

  const pauseAll=()=>{
    if(!isPlaying) return;
    const now=ctx.now();
    offsetRef.current+=now-lastStart.current;
    Object.values(playersRef.current).forEach(p=>p.stop());
    setPlaying(false);
  };

  const jump=(sec:number)=>{
    offsetRef.current=Math.max(offsetRef.current+sec,0);
    if(isPlaying){
      Object.values(playersRef.current).forEach(p=>p.stop());
      const now=ctx.now(); startAll(now,offsetRef.current);
      lastStart.current=now;
    }
  };

  /* per-stem volume */
  const setVolumePct=(stem:string,p:number)=>{
    const v=volsRef.current[stem]; if(!v) return;
    if(p===0){v.mute=true;} else { if(v.mute) v.mute=false;
      v.volume.linearRampTo(pctToDb(p),0.1);}
  };
  const resetVolumes=()=>Object.values(volsRef.current).forEach(v=>{
    v.mute=false; v.volume.linearRampTo(BASELINE_DB,0.1);
  });

  /* global tempo & pitch */
  const setPlaybackRate=(f:number)=>
    Object.values(playersRef.current).forEach(p=>p.playbackRate=f);
  const setPitchShift=(semi:number)=>{
    ensurePitch(); pitchRef.current!.pitch=semi;
  };

  return ready ? {
    isPlaying, playAll, pauseAll, jump,
    setVolumePct, resetVolumes,
    setPlaybackRate, setPitchShift
  } : null;
}
