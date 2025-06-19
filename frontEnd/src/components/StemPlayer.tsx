import React, { useEffect, useReducer, useRef } from "react";
import { useToneMixer, StemMap, BASELINE_PCT } from "../hooks/useToneMixer";
import { useMixerRegistry } from "../context/MixerContext";

/* lucide icons */
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";

import "./StemPlayer.css";

const BACKEND = "http://127.0.0.1:8080";

interface Props {
  stems: StemMap;
  meta: {
    key: string; // e.g. "G#m"
    tonic: number; // 0-11
    tempo: number; // BPM
  };
}

const buildMap = (keys: string[], pct: number) =>
  Object.fromEntries(keys.map((k) => [k, pct]));

const DEFAULT_PCT = BASELINE_PCT; // ← constant is already exported

const StemPlayer: React.FC<Props> = ({ stems, meta }) => {
  const mixer = useToneMixer(stems, BACKEND);

  /* register with global registry */
  const { register, unregister } = useMixerRegistry();
  useEffect(() => {
    if (!mixer) return;
    const handle = {
      ...mixer,
      tonic: meta.tonic,
      tempo: meta.tempo,
    };
    register(handle);
    return () => unregister(handle);
  }, [mixer, meta.tonic, meta.tempo, register, unregister]);

  /* per-stem slider values */
  const valsRef = useRef<Record<string, number>>(
    buildMap(Object.keys(stems), DEFAULT_PCT)
  );
  const [, forceRender] = useReducer((x) => x + 1, 0);

  /* reset sliders when stems reload */
  useEffect(() => {
    const baseline = BASELINE_PCT; // ← use constant, not mixer field
    valsRef.current = buildMap(Object.keys(stems), baseline);
    forceRender();
  }, [stems]);

  /* handlers */
  const slide = (stem: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = +e.currentTarget.value;
    valsRef.current[stem] = pct;
    mixer?.setVolumePct(stem, pct);
    forceRender();
  };

  const reset = () => {
    mixer?.resetVolumes();
    Object.keys(valsRef.current).forEach(
      (k) => (valsRef.current[k] = BASELINE_PCT) // ← same fix here
    );
    forceRender();
  };

  /* UI */
  return (
    <div className="stem-wrapper">
      {!mixer ? (
        <p className="status-text">Loading stems…</p>
      ) : (
        <>
          {/* transport */}
          <div className="control-row">
            <button
              className="jump-btn"
              onClick={() => mixer.jump(-10)}
              aria-label="Back 10s"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              className="master-btn"
              onClick={mixer.isPlaying ? mixer.pauseAll : mixer.playAll}
              aria-label={mixer.isPlaying ? "Pause" : "Play"}
            >
              {mixer.isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              className="jump-btn"
              onClick={() => mixer.jump(10)}
              aria-label="Fwd 10s"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <hr style={{ margin: "24px 0", opacity: 0.15 }} />

          {/* sliders */}
          {Object.keys(stems).map((stem) => (
            <div key={stem} className="stem-block">
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

          {/* song info */}
          <p style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
            Key: {meta.key}&nbsp; • &nbsp;Tempo: {Math.round(meta.tempo)} BPM
          </p>
        </>
      )}
    </div>
  );
};

export default StemPlayer;
