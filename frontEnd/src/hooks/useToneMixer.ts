// src/hooks/useToneMixer.ts
import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

export type StemMap = Record<string, string>;

export function useToneMixer(
  stems: StemMap | null,
  backend: string,
  baselineDb = -6
) {
  const playersRef = useRef<Tone.Players | null>(null);
  const volsRef    = useRef<Record<string, Tone.Volume>>({});
  const startedRef = useRef(false);  
  const [ready, setReady]       = useState(false);
  const [isPlaying, setPlaying] = useState(false);

  /* ───────────────── build players when stems arrive ───────────────── */
  useEffect(() => {
    if (!stems) return;               // nothing yet

    /* dispose any previous players */
    playersRef.current?.dispose();
    setReady(false);
    setPlaying(false);

    /* 1 – absolute URL map (Tone needs full paths) */
    const urlMap = Object.fromEntries(
      Object.entries(stems).map(([k, rel]) => [k, `${backend}${encodeURI(rel)}`])
    );

    /* 2 – create Players with correct signature */
    const players = new Tone.Players(
      urlMap,
      () => {                         // ← fires after *every* stem is loaded
        /* per-stem volumes – now the names definitely exist */
        const vols: Record<string, Tone.Volume> = {};
        for (const stem of Object.keys(urlMap)) {
          const vol = new Tone.Volume(baselineDb).toDestination();
          players.player(stem).connect(vol);
          vols[stem] = vol;
        }
        volsRef.current = vols;
        setReady(true);               // UI can render controls
      }
    ).toDestination();
    playersRef.current = players;

    return () => {
      players.dispose();
      Tone.Transport.cancel();
    };
  }, [stems, backend, baselineDb]);

  /* ───────────────── playback helpers ───────────────── */
  const playAll = useCallback(async () => {
    if (!ready || !playersRef.current) return;
    await Tone.start();                       // unlock AudioContext
   if (!startedRef.current) {                   // ← run only the first time
     Object.keys(stems!).forEach((name) =>
       playersRef.current!.player(name).sync().start(0)
     );
     startedRef.current = true;
   }
    Tone.Transport.start();
    setPlaying(true);
  }, [ready, stems]);

  const pauseAll   = () => { Tone.Transport.pause(); setPlaying(false); };
  const jump       = (sec: number) =>
    (Tone.Transport.seconds = Math.max(Tone.Transport.seconds + sec, 0));
  const setVolume  = (stem: string, db: number) =>
    volsRef.current[stem]?.volume.rampTo(db, 0.05);
  const resetVolumes = () =>
    Object.values(volsRef.current).forEach((v) =>
      v.volume.rampTo(baselineDb, 0.05)
    );

  return ready
    ? { isPlaying, playAll, pauseAll, jump, setVolume, resetVolumes }
    : null;
}
