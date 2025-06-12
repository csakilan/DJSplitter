import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import StemPlayer from "./StemPlayer";
import "./YoutubeSearch.css";

const YT_API_KEY = "AIzaSyAHBjl1GVP7FOdP_ukHnKIyaWcr8iu51IY";
const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const BACKEND = "http://127.0.0.1:8080";

const YouTubeSearch: React.FC = () => {
  // search state
  const [query, setQuery] = useState("");
  const [videoId, setVideoId] = useState("");
  const [searching, setSearching] = useState(false);

  // generation + polling state
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle"
  );
  const [taskId, setTaskId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // ───── YouTube search ─────
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
    } catch (err) {
      console.error("YouTube API error:", err);
      setVideoId("");
    } finally {
      setSearching(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) =>
    e.key === "Enter" && handleSearch();

  // ───── Generate stems ─────
  const handleGenerate = async () => {
    if (!videoId) return;
    try {
      setStatus("running");
      const { data } = await axios.post(`${BACKEND}/API/generate`, {
        url1: `https://www.youtube.com/watch?v=${videoId}`,
      });
      setTaskId(data.task_id); // ← save taskId for StemPlayer
      setStatus("done"); // indicate we have a task
    } catch (err) {
      console.error("Backend error:", err);
      setStatus("error");
    }
  };

  // cleanup (optional, since StemPlayer does its own polling)
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ───── UI ─────
  return (
    <div className="wrapper">
      {/* search */}
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
      {status === "running" && <p className="status-text">Loading Song</p>}
      {status === "error" && <p className="error-msg">Something went wrong.</p>}

      {/* once we have a taskId, hand off to StemPlayer to do the polling & rendering */}
      {taskId && status === "done" && <StemPlayer taskId={taskId} />}
    </div>
  );
};

export default YouTubeSearch;
