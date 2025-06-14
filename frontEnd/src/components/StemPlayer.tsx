import React, { useEffect, useReducer, useRef } from "react";
import { useToneMixer, StemMap, BASELINE_PCT } from "../hooks/useToneMixer";

/* icon set */
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";

import "./StemPlayer.css";

const BACKEND = "http://127.0.0.1:8080";

interface Props {
  stems: StemMap;
}

const buildMap = (keys: string[], pct: number) =>
  Object.fromEntries(keys.map((k) => [k, pct]));

const DEFAULT_PCT = BASELINE_PCT;

const StemPlayer: React.FC<Props> = ({ stems }) => {
  /* Tone.js */
  const mixer = useToneMixer(stems, BACKEND);

  /* per-stem slider values in a ref */
  const valsRef = useRef<Record<string, number>>(
    buildMap(Object.keys(stems), DEFAULT_PCT)
  );

  /* force repaint helper */
  const [, forceRender] = useReducer((x) => x + 1, 0);

  /* reset ref when stems / baseline change */
  useEffect(() => {
    const baseline = mixer ? mixer.BASELINE_PCT : DEFAULT_PCT;
    valsRef.current = buildMap(Object.keys(stems), baseline);
    forceRender();
  }, [stems, mixer?.BASELINE_PCT]);

  /* handlers */
  const handleSlide =
    (stem: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = +e.currentTarget.value;
      valsRef.current[stem] = pct;
      mixer?.setVolumePct(stem, pct);
      forceRender();
    };

  const handleReset = () => {
    mixer?.resetVolumes();
    const baseline = mixer ? mixer.BASELINE_PCT : DEFAULT_PCT;
    Object.keys(valsRef.current).forEach(
      (k) => (valsRef.current[k] = baseline)
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
          {/* transport controls */}
          <div className="control-row">
            <button
              className="jump-btn"
              onClick={() => mixer.jump(-10)}
              aria-label="Back 10 seconds"
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
              aria-label="Forward 10 seconds"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <hr style={{ margin: "24px 0", opacity: 0.15 }} />

          {/* per-stem sliders */}
          {Object.keys(stems).map((stem) => (
            <div key={stem} className="stem-block">
              <strong>{stem.toUpperCase()}</strong>
              <input
                type="range"
                min={0}
                max={100}
                value={valsRef.current[stem]}
                style={
                  { "--val": valsRef.current[stem] } as React.CSSProperties
                }
                onChange={handleSlide(stem)}
              />
            </div>
          ))}

          <button className="reset-btn" onClick={handleReset}>
            Reset Volumes
          </button>
        </>
      )}
    </div>
  );
};

export default StemPlayer;
