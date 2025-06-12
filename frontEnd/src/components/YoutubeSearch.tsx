import React, { useState, useEffect } from "react";
import axios from "axios";
import StemPlayer from "./StemPlayer";
import "./YoutubeSearch.css";

const YT_API_KEY = "AIzaSyAHBjl1GVP7FOdP_ukHnKIyaWcr8iu51IY";
const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const BACKEND = "http://127.0.0.1:8080";

type StemMap = Record<string, string>;

const YouTubeSearch: React.FC = () => {
  /* ─────────── search UI state ─────────── */
  const [query, setQuery] = useState("");
  const [videoId, setVideoId] = useState("");
  const [searching, setSearching] = useState(false);

  /* ─────────── task / polling state ─────────── */
  const [taskId, setTaskId] = useState<string | null>(null);
  const [stems, setStems] = useState<StemMap | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");

  /* ─────────── YouTube search ─────────── */
  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await axios.get(YT_SEARCH_URL, {
        params: {
          part: "snippet",
          q: query,
          key: YT_API_KEY,
          maxResults: 1,
          type: "video",
        },
      });
      setVideoId(data.items?.[0]?.id?.videoId || "");
      setStems(null); // reset previous stems when searching anew
      setStatus("idle");
    } catch (err) {
      console.error("YouTube API error:", err);
    } finally {
      setSearching(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) =>
    e.key === "Enter" && handleSearch();

  /* ─────────── Kick-off separation ─────────── */
  const handleGenerate = async () => {
    if (!videoId) return;
    try {
      setStatus("running");
      setStems(null); // clear any prior stems until new job finishes
      const { data } = await axios.post(`${BACKEND}/API/generate`, {
        url1: `https://www.youtube.com/watch?v=${videoId}`,
      });
      setTaskId(data.task_id);
    } catch (err) {
      console.error("Backend error:", err);
      setStatus("error");
    }
  };

  /* ─────────── Poll /status/<id> ─────────── */
  useEffect(() => {
    if (!taskId) return;
    const timer = window.setInterval(async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/status/${taskId}`);
        if (data.state === "SUCCESS") {
          clearInterval(timer);
          setStems(data.stems ?? data.result); // backend may use either key
          setStatus("idle");
        } else if (data.state === "FAILURE") {
          throw new Error(data.error || "Separation failed");
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearInterval(timer);
        setStatus("error");
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [taskId]);

  /* ─────────── render ─────────── */
  return (
    <div className="wrapper">
      {/* search row */}
      <div className="search-row">
        <input
          placeholder="Search for a song…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSearch}>SEARCH</button>
      </div>

      {searching && <p className="status-text">Searching…</p>}

      {videoId && !searching && (
        <div className="preview">
          <iframe
            title="preview"
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${videoId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button onClick={handleGenerate} className="generate-btn">
            GENERATE STEMS
          </button>
        </div>
      )}

      {status === "running" && (
        <p className="status-text">Separating… please wait</p>
      )}
      {status === "error" && <p className="error-msg">Something went wrong.</p>}

      {/* ─────────── NEW: keep the player visible alongside UI ─────────── */}
      {stems && (
        <div style={{ marginTop: 40 }}>
          <StemPlayer stems={stems} />
        </div>
      )}
    </div>
  );
};

export default YouTubeSearch;
