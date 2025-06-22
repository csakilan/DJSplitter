import React, { useState, useEffect } from "react";
import axios from "axios";
import StemPlayer from "./StemPlayer";
import "./YoutubeSearch.css";

const BACKEND = "http://127.0.0.1:8080";

type StemMap = Record<string, string>;

const YouTubeSearch: React.FC = () => {
  /* search UI */
  const [query, setQuery] = useState("");
  const [videoId, setVideoId] = useState("");
  const [searching, setSearching] = useState(false);

  /* separation job */
  const [taskId, setTaskId] = useState<string | null>(null);
  const [stems, setStems] = useState<StemMap | null>(null);
  const [meta, setMeta] = useState<any | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");

  /* ────────── YouTube search via backend proxy ────────── */
  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setSearching(true);
      const { data } = await axios.get(`${BACKEND}/API/search`, {
        params: { q: query },
      });
      const item = data.items?.[0];
      if (!item) throw new Error("No results");
      setVideoId(item.id.videoId);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) =>
    e.key === "Enter" && handleSearch();

  /* ────────── start separation ────────── */
  const generate = async () => {
    if (!videoId) return;
    try {
      setStatus("running");
      setStems(null);
      setMeta(null);
      const { data } = await axios.post(`${BACKEND}/API/generate`, {
        url1: `https://www.youtube.com/watch?v=${videoId}`,
      });
      setTaskId(data.task_id);
      setAudioUrl(data.original_url);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  /* ────────── poll status ────────── */
  useEffect(() => {
    if (!taskId) return;
    const t = window.setInterval(async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/status/${taskId}`);
        if (data.state === "SUCCESS") {
          window.clearInterval(t);
          setStems(data.stems ?? data.result);
          setAudioUrl(data.original_url);
          const metaRes = await axios.post(`${BACKEND}/API/pitch`, {
            url: `https://www.youtube.com/watch?v=${videoId}`,
          });
          setMeta(metaRes.data);
          setStatus("idle");
        } else if (data.state === "FAILURE") {
          throw new Error(data.error || "Separation failed");
        }
      } catch (err) {
        console.error(err);
        window.clearInterval(t);
        setStatus("error");
      }
    }, 2000);
    return () => window.clearInterval(t);
  }, [taskId, videoId]);

  /* ────────── UI ────────── */
  return (
    <div className="wrapper">
      <div className="search-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search YouTube…"
        />
        <button onClick={handleSearch} disabled={searching}>
          SEARCH
        </button>
      </div>

      {videoId && (
        <div className="preview">
          <iframe
            width="300"
            height="168"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video preview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button className="generate-btn" onClick={generate}>
            Generate Stems
          </button>
        </div>
      )}

      {status === "running" && (
        <p className="status-text">Separating… please wait</p>
      )}
      {status === "error" && <p className="error-msg">Something went wrong.</p>}

      {stems && meta && audioUrl && (
        <StemPlayer stems={stems} meta={meta} audioUrl={audioUrl} />
      )}
    </div>
  );
};

export default YouTubeSearch;
