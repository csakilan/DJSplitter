import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./StemPlayer.css";

const BACKEND = "http://127.0.0.1:8080";

interface StemMap {
  [stem: string]: string;
}
interface Props {
  taskId: string;
}

const StemPlayer: React.FC<Props> = ({ taskId }) => {
  const [status, setStatus] = useState<"pending" | "ready" | "error">(
    "pending"
  );
  const [stems, setStems] = useState<StemMap | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [playing, setPlaying] = useState(false);

  /* ─ Poll /status/<id> until SUCCESS ─ */
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/status/${taskId}`);
        if (data.state === "SUCCESS") {
          clearInterval(timer);
          setStems(data.stems ?? data.result); // accept either key
          setStatus("ready");
        } else if (data.state === "FAILURE") {
          clearInterval(timer);
          setStatus("error");
        }
      } catch {
        clearInterval(timer);
        setStatus("error");
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [taskId]);

  /* ─ Master controls ─ */
  const playAll = () => {
    Promise.all(Object.values(audioRefs.current).map((a) => a.play())).then(
      () => setPlaying(true)
    );
  };
  const pauseAll = () => {
    Object.values(audioRefs.current).forEach((a) => a.pause());
    setPlaying(false);
  };

  /* ─ UI ─ */
  if (status === "pending")
    return <p className="status-text">Loading stems…</p>;
  if (status === "error")
    return <p style={{ color: "red" }}>Error loading stems.</p>;

  return (
    <div className="stem-wrapper">
      <button className="master-btn" onClick={playing ? pauseAll : playAll}>
        {playing ? "Pause All" : "Play All"}
      </button>

      {Object.entries(stems!).map(([name, relUrl]) => (
        <div key={name} className="stem-block">
          <strong>{name.toUpperCase()}</strong>
          <br />
          <audio controls src={`${BACKEND}${encodeURI(relUrl)}`} />
        </div>
      ))}
    </div>
  );
};

export default StemPlayer;
