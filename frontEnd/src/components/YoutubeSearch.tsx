// import { useState } from "react";
// import axios from "axios";

// const YouTubeSearch = () => {
//   const [query, setQuery] = useState("");
//   const [videoId, setVideoId] = useState("");
//   // const [videoUrl, setVideoUrl] = useState("");
//   const [loading, setLoading] = useState(false);

//   const apiKey = "AIzaSyAHBjl1GVP7FOdP_ukHnKIyaWcr8iu51IY";
//   const searchUrl = `https://www.googleapis.com/youtube/v3/search`;
//   const backendUrl = "http://127.0.0.1:8080";

//   const handleSearch = async () => {
//     if (!query.trim()) return;
//     setLoading(true);
//     try {
//       const response = await axios.get(searchUrl, {
//         params: {
//           part: "snippet",
//           maxResults: 1,
//           q: query,
//           key: apiKey,
//           type: "video",
//         },
//       });

//       const foundId = response.data.items[0]?.id?.videoId;
//       setVideoId(foundId || "");
//     } catch (error) {
//       console.error("Error fetching from YouTube API", error);
//       setVideoId("");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
//     if (e.key === "Enter") {
//       handleSearch();
//     }
//   };

//   const handleGenerate = async () => {
//     const url = `https://www.youtube.com/watch?v=${videoId}`;
//     // setVideoUrl(url); // Update state if needed elsewhere
//     const input = { url1: url };

//     try {
//       const res = await axios.post(`${backendUrl}/API/generate`, input);
//       console.log(res.data.message);
//     } catch (err) {
//       console.error("Error connunicating with backend:", err);
//     }
//   };

//   return (
//     <div style={{ maxWidth: "600px", textAlign: "center" }}>
//       {loading && <p>Loading...</p>}

//       {videoId && !loading && (
//         <div style={{ marginBottom: "20px" }}>
//           <a
//             href={`https://www.youtube.com/watch?v=${videoId}`}
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <div className="video-responsive">
//               <iframe
//                 src={`https://www.youtube.com/embed/${videoId}`}
//                 title="YouTube video player"
//                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//                 allowFullScreen
//               ></iframe>
//             </div>
//           </a>
//         </div>
//       )}

//       <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//         <input
//           type="text"
//           placeholder="Search for a song..."
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           onKeyDown={handleKeyDown}
//           style={{ padding: "10px", flex: "1" }}
//         />
//         <button
//           onClick={handleSearch}
//           style={{
//             padding: "10px",
//           }}
//         >
//           SEARCH
//         </button>
//         <button
//           onClick={handleGenerate}
//           style={{
//             padding: "10px",
//           }}
//         >
//           GENERATE
//         </button>
//       </div>
//     </div>
//   );
// };

// export default YouTubeSearch;

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

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
  const [stems, setStems] = useState<Record<string, string> | null>(null);
  const pollRef = useRef<number | null>(null); // <─ CHANGED

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
      // poll every 3 s
      pollRef.current = window.setInterval(async () => {
        try {
          const res = await axios.get(`${BACKEND}/status/${data.task_id}`);
          if (res.data.state === "SUCCESS") {
            clearInterval(pollRef.current!);
            setStatus("done");
            setStems(res.data.result);
          } else if (res.data.state === "FAILURE") {
            clearInterval(pollRef.current!);
            setStatus("error");
          }
        } catch {
          clearInterval(pollRef.current!);
          setStatus("error");
        }
      }, 3000);
    } catch (err) {
      console.error("Backend error:", err);
      setStatus("error");
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  // ───── UI ─────
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
      {/* search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          style={{ flex: 1, padding: 10 }}
          placeholder="Search for a song…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSearch} style={{ padding: "10px 16px" }}>
          SEARCH
        </button>
      </div>
      {searching && <p>Searching…</p>}
      {videoId && !searching && (
        <div style={{ marginBottom: 20 }}>
          <iframe
            title="preview"
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${videoId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button
            onClick={handleGenerate}
            style={{ marginTop: 12, padding: "10px 16px" }}
          >
            GENERATE STEMS
          </button>
        </div>
      )}
      {status === "running" && <p>Separating… please wait</p>}
      {status === "error" && (
        <p style={{ color: "red" }}>Something went wrong.</p>
      )}
      {status === "done" && stems && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
          {Object.entries(stems).map(([stem, path]) => (
            <li key={stem} style={{ margin: "8px 0" }}>
              {stem}:{" "}
              <a
                href={`${BACKEND}${path}`}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default YouTubeSearch;
