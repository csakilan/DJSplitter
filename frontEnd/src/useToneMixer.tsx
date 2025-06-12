import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { Players, Player, Volume, Transport } from "tone";

export type StemMap = Record<string, string>;

export function useToneMixer(
  stems: StemMap | null,
  baseUrl: string,
  baselineDb = -6
) {
  const playersRef = useRef<Players>();
  const volumesRef = useRef<Record<string, Volume>>({});
  const [isPlaying, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  /* ───── build / rebuild players when stems arrive ───── */
  useEffect(() => {
    if (!stems) return;

    // 1) absolute-URL map
    const urlMap = Object.fromEntries(
      Object.entries(stems).map(([k, rel]) => [
        k,
        `${baseUrl}${encodeURI(rel)}`,
      ])
    );

    // 2) dispose old
    playersRef.current?.dispose();

    // 3) create new Players (use options form so TS knows the shape)
    const players = new Tone.Players({ urls: urlMap });
    playersRef.current = players;

    // 4) per-stem Volume nodes
    const vols: Record<string, Volume> = {};
    Object.keys(urlMap).forEach((stem) => {
      const vol = new Tone.Volume(baselineDb).toDestination();
      (players.player(stem) as Player).connect(vol); // <- safe cast
      vols[stem] = vol;
    });
    volumesRef.current = vols;

    // 5) update UI clock every 100 ms
    Transport.scheduleRepeat(() => setTime(Transport.seconds), 0.1);

    return () => {
      players.dispose();
      Transport.cancel();
    };
  }, [stems, baseUrl, baselineDb]);

  /* ───── controls ───── */
  const playAll = async () => {
    await Tone.start(); // unlock AudioContext
    if (!playersRef.current) return;

    // Tone.Players keeps its Player instances in a private map called _players.
    // We cast to any so TypeScript lets us peek inside.
    const playersObj = (playersRef.current as any)._players as Record<
      string,
      Player
    >;

    Object.values(playersObj).forEach((p) => p.sync().start(0));

    Transport.start();
    setPlaying(true);
  };

  const pauseAll = () => {
    Transport.pause();
    setPlaying(false);
  };
  const jumpForward = (s = 10) => (Transport.seconds += s);
  const jumpBackward = (s = 10) =>
    (Transport.seconds = Math.max(0, Transport.seconds - s));
  const seek = (sec: number) => (Transport.seconds = Math.max(0, sec));
  const setVolume = (stem: string, db: number) =>
    volumesRef.current[stem]?.volume.rampTo(db, 0.1);
  const resetVolumes = () =>
    Object.values(volumesRef.current).forEach((v) =>
      v.volume.rampTo(baselineDb, 0.1)
    );

  return {
    isPlaying,
    time,
    playAll,
    pauseAll,
    jumpForward,
    jumpBackward,
    seek,
    setVolume,
    resetVolumes,
  };
}
