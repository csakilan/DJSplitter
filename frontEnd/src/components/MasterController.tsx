import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useMixerRegistry } from "../context/MixerContext";
import "./MasterController.css";

const MasterController: React.FC = () => {
  const { mixers } = useMixerRegistry();
  const [isPlaying, setPlaying] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaying(mixers.current.some((m) => m.isPlaying));
    }, 250);
    return () => clearInterval(id);
  }, [mixers]);

  const playAll = () => mixers.current.forEach((m) => m.playAll());
  const pauseAll = () => mixers.current.forEach((m) => m.pauseAll());
  const jump = (s: number) => mixers.current.forEach((m) => m.jump(s));

  /* sync helpers */
  const songOptions = mixers.current.map((m, i) => ({
    label: `Song ${i + 1}`,
    m,
  }));
  const tempoSync = (idx: number) => {
    const target = mixers.current[idx].tempo;
    mixers.current.forEach((m) => m.setPlaybackRate(target / m.tempo));
  };
  const pitchSync = (idx: number) => {
    const tgt = mixers.current[idx].tonic;
    mixers.current.forEach((m) => {
      const delta = (tgt - m.tonic + 12) % 12;
      m.setPitchShift(delta);
    });
  };

  return (
    <div className="master-bar">
      <div className="button-group">
        <button className="jump-btn" onClick={() => jump(-10)}>
          {" "}
          <ChevronLeft size={20} />{" "}
        </button>
        <button className="master-btn" onClick={isPlaying ? pauseAll : playAll}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="jump-btn" onClick={() => jump(10)}>
          {" "}
          <ChevronRight size={20} />{" "}
        </button>
      </div>

      {/* dropdowns */}
      <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
        <select
          disabled={songOptions.length < 2}
          onChange={(e) => tempoSync(+e.target.value)}
        >
          <option>Sync Tempo…</option>
          {songOptions.map((o, i) => (
            <option key={i} value={i}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          disabled={songOptions.length < 2}
          onChange={(e) => pitchSync(+e.target.value)}
        >
          <option>Sync Pitch…</option>
          {songOptions.map((o, i) => (
            <option key={i} value={i}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
export default MasterController;
