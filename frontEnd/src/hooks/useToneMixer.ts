// hooks/useToneMixer.ts  – fixed version
import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

export type StemMap = Record<string, string>;
export const BASELINE_PCT = 50;                 // spec value
const BASELINE_DB = 20 * Math.log10(BASELINE_PCT / 100);
const pctToDb = (pct: number) =>
  pct === 0 ? -Infinity : 20 * Math.log10(pct / 100);

export function useToneMixer(stems: StemMap | null, backend: string) {
  /* one Context per instance */
  const ctxRef     = useRef<Tone.Context | null>(null);
  const playersRef = useRef<Tone.Players | null>(null);
  const volsRef    = useRef<Record<string, Tone.Volume>>({});
  const offsetRef  = useRef(0);   // seconds already elapsed
  const lastStart  = useRef(0);   // wall-time of current play

  const [ready,      setReady]   = useState(false);
  const [isPlaying,  setPlaying] = useState(false);

  /* build graph on new stems */
  useEffect(() => {
    if (!stems) return;

    /* dispose previous graph/context */
    playersRef.current?.dispose();
    ctxRef.current?.close();

    const ctx = new Tone.Context();      // fresh context
    ctxRef.current = ctx;

    /* absolute URLs */
    const urlMap = Object.fromEntries(
      Object.entries(stems).map(([k, rel]) => [k, `${backend}${encodeURI(rel)}`])
    );

    /* master gain in the same context */
    const master = new Tone.Gain({ context: ctx }).connect(ctx.destination);

    /* Players + per-stem volumes – all in ctx */
    const players = new Tone.Players({
      urls: urlMap,
      context: ctx,
      onload: () => {
        const vols: Record<string, Tone.Volume> = {};
        Object.keys(stems).forEach((stem) => {
          const v = new Tone.Volume({ volume: BASELINE_DB, context: ctx });
          players.player(stem).connect(v);
          v.connect(master);
          vols[stem] = v;
        });
        volsRef.current = vols;
        setReady(true);
      },
    })

    playersRef.current = players;
    offsetRef.current  = 0;
    setPlaying(false);

    return () => {
      players.dispose();
      ctx.close();
    };
  }, [stems, backend]);

  /* helpers */
  const startPlayers = (when: number, offset: number) =>
    Object.keys(stems || {}).forEach((s) =>
      playersRef.current!.player(s).start(when, offset)
    );

  /* public controls */
  const playAll = useCallback(async () => {
    if (!ready || isPlaying) return;
    await ctxRef.current!.resume();       // unlocks the private context
    const now = ctxRef.current!.now();
    startPlayers(now, offsetRef.current);
    lastStart.current = now;
    setPlaying(true);
  }, [ready, isPlaying]);

  const pauseAll = () => {
    if (!isPlaying) return;
    const now = ctxRef.current!.now();
    offsetRef.current += now - lastStart.current;
    playersRef.current!.stopAll();
    setPlaying(false);
  };

  const jump = (sec: number) => {
    offsetRef.current = Math.max(offsetRef.current + sec, 0);
    if (isPlaying) {
      playersRef.current!.stopAll();
      const now = ctxRef.current!.now();
      startPlayers(now, offsetRef.current);
      lastStart.current = now;
    }
  };

  const setVolumePct = (stem: string, pct: number) => {
    const v = volsRef.current[stem];
    if (!v) return;
  if (pct === 0) {
    /* click-left ⇒ instant hard mute */
    v.mute = true;
  } else {
    /* un-mute first (in case it was at 0) */
    if (v.mute) v.mute = false;
    v.volume.linearRampTo(pctToDb(pct), 0.1);   // smooth change
  }
  };

  const resetVolumes = () => {
    Object.values(volsRef.current).forEach((v) => {
      v.mute = false;
      v.volume.linearRampTo(BASELINE_DB, 0.1);
    });
  };

  return ready
    ? { isPlaying, playAll, pauseAll, jump, setVolumePct, resetVolumes, BASELINE_PCT }
    : null;
}
