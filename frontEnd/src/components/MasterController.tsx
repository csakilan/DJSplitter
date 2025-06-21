// ────────────────────────────────────────────────────────────────
// File: src/components/MasterController.tsx
// Unified tempo‑+‑pitch synchroniser with drift‑free maths and a full
// reset button. Drop straight into your project.
// ────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { useMixerRegistry } from "../context/MixerContext";
import "./MasterController.css";

const MasterController: React.FC = () => {
  const { mixers } = useMixerRegistry();

  /* reflect play/paused state */
  const [isPlaying, setPlaying] = useState(false);
  useEffect(() => {
    const id = window.setInterval(
      () => setPlaying(mixers.current.some((m) => m.isPlaying)),
      250
    );
    return () => clearInterval(id);
  }, [mixers]);

  /* basic transport */
  const playAll = () => mixers.current.forEach((m) => m.playAll());
  const pauseAll = () => mixers.current.forEach((m) => m.pauseAll());
  const jump = (sec: number) => mixers.current.forEach((m) => m.jump(sec));

  /* master reset */
  const resetAll = () =>
    mixers.current.forEach((m) => {
      m.setPlaybackRate(1);
      m.setPitchShift(0);
    });

  /* full tempo + pitch synchronisation */
  const fullSync = (refIdx: number) => {
    const ref = mixers.current[refIdx];
    if (!ref) return;

    const { tempo: refTempo, tonic: refTonic } = ref;

    mixers.current.forEach((m) => {
      if (!m) return;

      /* — tempo — */
      const ratio = refTempo / m.tempo; // overwrite, don’t accumulate
      m.setPlaybackRate(ratio);

      /* pitch drift from that tempo warp */
      const drift = 12 * Math.log2(ratio);

      /* shortest musical path between tonics (−6…+6) */
      let tonicDelta = (refTonic - m.tonic) % 12;
      if (tonicDelta > 6) tonicDelta -= 12;
      if (tonicDelta < -6) tonicDelta += 12;

      /* absolute semitone correction after drift */
      const finalShift = tonicDelta - drift;
      m.setPitchShift(finalShift);
    });
  };

  /* build dropdown labels */
  const songOptions = mixers.current.map((_, i) => ({
    index: i,
    label: `Song ${i + 1}`,
  }));

  /* UI */
  return (
    <div className="master-bar">
      {/* transport buttons */}
      <div className="button-group">
        <button className="jump-btn" onClick={() => jump(-10)}>
          <ChevronLeft size={20} />
        </button>

        <button className="master-btn" onClick={isPlaying ? pauseAll : playAll}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button className="jump-btn" onClick={() => jump(10)}>
          <ChevronRight size={20} />
        </button>

        <button className="reset-btn" onClick={resetAll} title="Reset all">
          <Undo2 size={18} />
        </button>
      </div>

      {/* single dropdown for combined sync */}
      <select
        style={{ marginLeft: 16 }}
        disabled={songOptions.length < 2}
        onChange={(e) => fullSync(+e.target.value)}
      >
        <option>Sync Tempo + Pitch…</option>
        {songOptions.map((o) => (
          <option key={o.index} value={o.index}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MasterController;
