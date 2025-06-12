import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";

export type StemMap = Record<string, string>;

/* helper: 0‒100 % ➜ dB, 0 % = mute */
const pctToDb = (pct: number) =>
  pct === 0 ? -Infinity : 20 * Math.log10(pct / 100);

const BASELINE_PCT = 75;             // slider start point
const BASELINE_DB  = pctToDb(BASELINE_PCT);

export function useToneMixer(stems: StemMap | null, backend: string) {
  const playersRef  = useRef<Tone.Players | null>(null);
  const volsRef     = useRef<Record<string, Tone.Volume>>({});
  const masterRef   = useRef<Tone.Gain | null>(null);
  const startedOnce = useRef(false);

  const [ready,      setReady]   = useState(false);
  const [isPlaying,  setPlaying] = useState(false);

  /* ───────── build players when we get new stems ───────── */
  useEffect(() => {
    if (!stems) return;

    /* dispose any previous graph */
    playersRef.current?.dispose();
    masterRef.current?.dispose();
    startedOnce.current = false;
    setReady(false);
    setPlaying(false);

    /* absolute URLs for Tone */
    const urlMap = Object.fromEntries(
      Object.entries(stems).map(([k, rel]) => [k, `${backend}${encodeURI(rel)}`])
    );

    /* master gain (one point into speakers) */
    const master = new Tone.Gain().toDestination();
    masterRef.current = master;

    /* Create Players WITHOUT routing to speakers */
    const players = new Tone.Players(urlMap, () => {
      /* build per-stem Volume faders once all buffers loaded */
      const vols: Record<string, Tone.Volume> = {};
      Object.keys(urlMap).forEach((stem) => {
        const vol = new Tone.Volume(BASELINE_DB);
        players.player(stem).connect(vol);
        vol.connect(master);
        vols[stem] = vol;
      });
      volsRef.current = vols;
      setReady(true);
    });
    playersRef.current = players;

    return () => {
      players.dispose();
      master.dispose();
      Tone.Transport.cancel();
    };
  }, [stems, backend]);

  /* ───────── controls ───────── */
  const playAll = useCallback(async () => {
    if (!ready || !playersRef.current) return;
    await Tone.start();                      // unlock iOS / Chrome
    if (!startedOnce.current) {
      Object.keys(stems!).forEach((s) =>
        playersRef.current!.player(s).sync().start(0)
      );
      startedOnce.current = true;
    }
    Tone.Transport.start();
    setPlaying(true);
  }, [ready, stems]);

  const pauseAll = () => { Tone.Transport.pause(); setPlaying(false); };

  const jump     = (sec: number) =>
    (Tone.Transport.seconds = Math.max(Tone.Transport.seconds + sec, 0));

  const setVolumePct = (stem: string, pct: number) => {
    const vol = volsRef.current[stem];
    if (!vol) return;
    if (pct === 0) {
      vol.mute = true;
    } else {
      vol.mute = false;
      vol.volume.linearRampTo(pctToDb(pct), 0.1);
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