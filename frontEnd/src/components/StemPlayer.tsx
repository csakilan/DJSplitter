import React, { useEffect, useReducer, useRef } from "react";
import { useToneMixer, StemMap, BASELINE_PCT } from "../hooks/useToneMixer";
import { useMixerRegistry } from "../context/MixerContext";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import Waveform from "./Waveform";
import "./StemPlayer.css";

const BACKEND = "http://127.0.0.1:8080";

interface Props {
  stems: StemMap;
  meta: { key: string; tonic: number; tempo: number };
  audioUrl: string;
}

const buildMap = (keys: string[], pct: number) =>
  Object.fromEntries(keys.map((k) => [k, pct]));

const StemPlayer: React.FC<Props> = ({ stems, meta, audioUrl }) => {
  const mixer = useToneMixer(stems, BACKEND);
  const { register, unregister } = useMixerRegistry();

  /* ─── register mixer with tonic + tempo ─── */
  useEffect(() => {
    if (!mixer) return;
    const handle = { ...mixer, tonic: meta.tonic, tempo: meta.tempo };
    register(handle);
    return () => unregister(handle);
  }, [mixer, meta.tonic, meta.tempo, register, unregister]);

  /* slider state */
  const valsRef = useRef<Record<string, number>>(
    buildMap(Object.keys(stems), BASELINE_PCT)
  );
  const [, force] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    valsRef.current = buildMap(Object.keys(stems), BASELINE_PCT);
    force();
  }, [stems]);

  const slide = (stem: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = +e.currentTarget.value;
    valsRef.current[stem] = pct;
    mixer?.setVolumePct(stem, pct);
    force();
  };

  const reset = () => {
    mixer?.resetVolumes();
    Object.keys(valsRef.current).forEach(
      (k) => (valsRef.current[k] = BASELINE_PCT)
    );
    force();
  };

  return (
    <div className="stem-wrapper">
      {audioUrl && mixer && (
        <Waveform
          url={audioUrl}
          isPlaying={mixer.isPlaying}
          currentTime={mixer.currentTime}
          onScrub={(abs) => mixer.jump(abs - mixer.currentTime())}
        />
      )}

      {!mixer ? (
        <p className="status-text">Loading stems…</p>
      ) : (
        <>
          {/* transport */}
          <div className="control-row">
            <button className="jump-btn" onClick={() => mixer.jump(-10)}>
              <ChevronLeft size={20} />
            </button>

            <button
              className="master-btn"
              onClick={mixer.isPlaying ? mixer.pauseAll : mixer.playAll}
            >
              {mixer.isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button className="jump-btn" onClick={() => mixer.jump(10)}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* stem sliders */}
          {Object.keys(stems).map((stem) => (
            <div className="stem-block" key={stem}>
              <strong>{stem.toUpperCase()}</strong>
              <input
                type="range"
                min={0}
                max={100}
                value={valsRef.current[stem]}
                onChange={slide(stem)}
              />
            </div>
          ))}

          <button className="reset-btn" onClick={reset}>
            Reset Volumes
          </button>

          <p style={{ marginTop: 8, fontSize: 14, color: "#aaa" }}>
            Key: {meta.key} • Tempo: {Math.round(meta.tempo)} BPM
          </p>
        </>
      )}
    </div>
  );
};

export default StemPlayer;
