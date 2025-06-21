import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

export type StemMap = Record<string, string>;
export const BASELINE_PCT = 50;
const BASELINE_DB = 20 * Math.log10(BASELINE_PCT / 100);
const pctToDb = (p: number) =>
  p === 0 ? -Infinity : 20 * Math.log10(p / 100);

export function useToneMixer(stems: StemMap | null, backend: string) {
  const ctx = Tone.getContext();

  /* graph parts */
  const playersRef = useRef<Record<string, Tone.Player>>({});
  const volsRef = useRef<Record<string, Tone.Volume>>({});
  const masterRef = useRef<Tone.Gain | null>(null);
  const pitchRef = useRef<Tone.PitchShift | null>(null);

  /* runtime state */
  const [ready, setReady] = useState(false);
  const [isPlaying, setPlaying] = useState(false);
  const offsetRef = useRef(0);    // absolute start-sec inside song
  const lastStart = useRef(0);    // ctx.now() when playAll began

  /* ── build / rebuild graph ─────────────────────────────── */
  useEffect(() => {
    if (!stems) return;

    /* dispose previous */
    Object.values(playersRef.current).forEach((p) => p.dispose());
    Object.values(volsRef.current).forEach((v) => v.dispose());
    pitchRef.current?.dispose();
    masterRef.current?.dispose();

    /* new master out */
    const master = new Tone.Gain({ context: ctx, gain: 1 }).toDestination();
    masterRef.current = master;

    const players: Record<string, Tone.Player> = {};
    const vols: Record<string, Tone.Volume> = {};

    Promise.all(
      Object.entries(stems).map(async ([stem, rel]) => {
        const url = `${backend}${encodeURI(rel)}`;
        const pl = new Tone.Player({ context: ctx, autostart: false });
        await pl.load(url);

        const vol = new Tone.Volume({ context: ctx, volume: BASELINE_DB });
        pl.connect(vol);

        players[stem] = pl;
        vols[stem] = vol;
      })
    ).then(() => {
      playersRef.current = players;
      volsRef.current = vols;
      setReady(true);
    });

    offsetRef.current = 0;
    setPlaying(false);

    return () => {
      Object.values(players).forEach((p) => p.dispose());
      Object.values(vols).forEach((v) => v.dispose());
      pitchRef.current?.dispose();
      master.dispose();
    };
  }, [stems, backend, ctx]);

  /* ensure PitchShift node exists */
  const ensurePitch = () => {
    if (pitchRef.current) return;
    const ps = new Tone.PitchShift({ context: ctx, pitch: 0 });
    ps.connect(masterRef.current!);
    Object.values(volsRef.current).forEach((v) => {
      v.disconnect();
      v.connect(ps);
    });
    pitchRef.current = ps;
  };

  const startAll = (when: number, off: number) =>
    Object.values(playersRef.current).forEach((p) => p.start(when, off));

  /* ── controls ──────────────────────────────────────────── */
  const playAll = useCallback(async () => {
    if (!ready || isPlaying) return;
    await ctx.resume();
    ensurePitch();
    const now = ctx.now();
    startAll(now, offsetRef.current);
    lastStart.current = now;
    setPlaying(true);
  }, [ready, isPlaying, ctx]);

  const pauseAll = () => {
    if (!isPlaying) return;
    const now = ctx.now();
    offsetRef.current += now - lastStart.current;
    Object.values(playersRef.current).forEach((p) => p.stop());
    setPlaying(false);
  };

  const jump = (sec: number) => {
    offsetRef.current = Math.max(offsetRef.current + sec, 0);
    if (isPlaying) {
      Object.values(playersRef.current).forEach((p) => p.stop());
      const now = ctx.now();
      startAll(now, offsetRef.current);
      lastStart.current = now;
    }
  };

  /* local play-head getter */
  const currentTime = () =>
    isPlaying ? ctx.now() - lastStart.current + offsetRef.current : offsetRef.current;

  /* volume helpers */
  const setVolumePct = (stem: string, pct: number) => {
    const v = volsRef.current[stem];
    if (!v) return;
    if (pct === 0) v.mute = true;
    else {
      if (v.mute) v.mute = false;
      v.volume.linearRampTo(pctToDb(pct), 0.1);
    }
  };
  const resetVolumes = () =>
    Object.values(volsRef.current).forEach((v) => {
      v.mute = false;
      v.volume.linearRampTo(BASELINE_DB, 0.1);
    });

  /* tempo / pitch */
  const setPlaybackRate = (f: number) =>
    Object.values(playersRef.current).forEach((p) => (p.playbackRate = f));
  const setPitchShift = (semi: number) => {
    ensurePitch();
    pitchRef.current!.pitch = semi;
  };

  return ready
    ? {
        isPlaying,
        playAll,
        pauseAll,
        jump,
        currentTime,            // ← expose
        setVolumePct,
        resetVolumes,
        setPlaybackRate,
        setPitchShift,
      }
    : null;
}
