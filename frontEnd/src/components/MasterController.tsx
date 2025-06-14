import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useMixerRegistry } from "../context/MixerContext";
import "./MasterController.css";

const MasterController: React.FC = () => {
  const { mixers } = useMixerRegistry();
  const [isPlaying, setPlaying] = useState(false);

  /* poll any mixer to keep the icon in sync */
  useEffect(() => {
    const id = setInterval(() => {
      const anyPlaying = mixers.current.some(
        // @ts-ignore private flag on our mixer object
        (m) => (m as any).isPlaying
      );
      setPlaying(anyPlaying);
    }, 250);
    return () => clearInterval(id);
  }, [mixers]);

  const playAll = () => mixers.current.forEach((m) => m.playAll());
  const pauseAll = () => mixers.current.forEach((m) => m.pauseAll());
  const jump = (sec: number) => mixers.current.forEach((m) => m.jump(sec));

  return (
    <div className="master-bar">
      <div className="button-group">
        <button
          className="jump-btn"
          onClick={() => jump(-10)}
          aria-label="Back 10 s"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          className="master-btn"
          onClick={isPlaying ? pauseAll : playAll}
          aria-label={isPlaying ? "Pause all" : "Play all"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          className="jump-btn"
          onClick={() => jump(10)}
          aria-label="Forward 10 s"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default MasterController;
