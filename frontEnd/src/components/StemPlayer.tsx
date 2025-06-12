import React from "react";
import { useToneMixer, StemMap } from "../hooks/useToneMixer";
import "./StemPlayer.css";

const BACKEND = "http://127.0.0.1:8080";

interface Props {
  stems: StemMap;
}

const StemPlayer: React.FC<Props> = ({ stems }) => {
  const mixer = useToneMixer(stems, BACKEND, -6);

  if (!mixer) return <p className="status-text">Loading stems…</p>;

  return (
    <div className="stem-wrapper">
      <button
        className="master-btn"
        onClick={mixer.isPlaying ? mixer.pauseAll : mixer.playAll}
      >
        {mixer.isPlaying ? "Pause All" : "Play All"}
      </button>{" "}
      <button onClick={() => mixer.jump(-10)}>–10 s</button>{" "}
      <button onClick={() => mixer.jump(+10)}>+10 s</button>
      <hr style={{ margin: "24px 0", opacity: 0.15 }} />
      {Object.keys(stems).map((stem) => (
        <div key={stem} className="stem-block">
          <strong>{stem.toUpperCase()}</strong>
          <input
            type="range"
            min={-48}
            max={6}
            defaultValue={-6}
            onChange={(e) => mixer.setVolume(stem, +e.target.value)}
          />
        </div>
      ))}
      <button style={{ marginTop: 20 }} onClick={mixer.resetVolumes}>
        Reset Volumes
      </button>
    </div>
  );
};

export default StemPlayer;
