import { useState } from "react";
import axios from "axios";

const YouTubeSearch = () => {
  const [query, setQuery] = useState("");
  // const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [loading, setLoading] = useState(false);

  const apiKey = "AIzaSyAHBjl1GVP7FOdP_ukHnKIyaWcr8iu51IY";
  const searchUrl = `https://www.googleapis.com/youtube/v3/search`;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await axios.get(searchUrl, {
        params: {
          part: "snippet",
          maxResults: 1,
          q: query,
          key: apiKey,
          type: "video",
        },
      });

      const foundId = response.data.items[0]?.id?.videoId;
      setVideoId(foundId || "");
    } catch (error) {
      console.error("Error fetching from YouTube API", error);
      setVideoId("");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleGenerate = async () => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    // setVideoUrl(url); // Update state if needed elsewhere
    const input = { url1: url };

    try {
      const res = await axios.post("http://127.0.0.1:8080/API/generate", input);
      console.log(res.data.message);
    } catch (err) {
      console.error("Error connunicating with backend:", err);
    }
  };

  return (
    <div style={{ maxWidth: "600px", textAlign: "center" }}>
      {loading && <p>Loading...</p>}

      {videoId && !loading && (
        <div style={{ marginBottom: "20px" }}>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="video-responsive">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </a>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="text"
          placeholder="Search for a song..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ padding: "10px", flex: "1" }}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: "10px",
          }}
        >
          SEARCH
        </button>
        <button
          onClick={handleGenerate}
          style={{
            padding: "10px",
          }}
        >
          GENERATE
        </button>
      </div>
    </div>
  );
};

export default YouTubeSearch;

// import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";

// // Define a single, correct base URL for your Flask backend.
// // Both the initial request and the status polling will use this URL.
// const API_URL = "http://127.0.0.1:8080";

// const YouTubeSearch = () => {
//   // Your existing state for YouTube search
//   const [query, setQuery] = useState("");
//   const [videoId, setVideoId] = useState("");
//   const [loading, setLoading] = useState(false);

//   // --- ADDED: State needed for Celery polling ---
//   const [taskId, setTaskId] = useState<string | null>(null);
//   const [status, setStatus] = useState("Ready");
//   const [results, setResults] = useState<Record<string, string> | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const pollingIntervalRef = useRef<number | null>(null);

//   // Your existing functions (handleSearch, handleKeyDown) remain unchanged
//   const handleSearch = async () => {
//     if (!query.trim()) return;
//     setLoading(true);
//     try {
//       const apiKey = "AIzaSyAHBjl1GVP7FOdP_ukHnKIyaWcr8iu51IY"; // Your API Key
//       const searchUrl = `https://www.googleapis.com/youtube/v3/search`;
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

//   // --- MODIFIED: The handleGenerate function ---
//   const handleGenerate = async () => {
//     if (!videoId) return;

//     // Reset state for the new separation process
//     setStatus("Sending request to backend...");
//     setResults(null);
//     setError(null);
//     setTaskId(null);

//     // This is your original payload
//     const input = { url: `https://www.youtube.com/watch?v=${videoId}` };

//     try {
//       // This is your original POST request
//       const res = await axios.post(`${API_URL}/API/generate`, input);

//       // The crucial change: get the task_id from the response and start polling
//       if (res.data && res.data.task_id) {
//         setTaskId(res.data.task_id);
//         setStatus("Processing... Please wait.");
//         console.log("Task started with ID:", res.data.task_id);
//       } else {
//         throw new Error("Backend did not return a task_id.");
//       }
//     } catch (err) {
//       console.error("Error communicating with backend:", err);
//       setError("Could not start separation. Is the backend running?");
//       setStatus("Error");
//     }
//   };

//   // --- ADDED: useEffect for polling the Celery task status ---
//   useEffect(() => {
//     // This effect runs only when there is a taskId
//     if (!taskId) return;

//     pollingIntervalRef.current = setInterval(async () => {
//       try {
//         const response = await axios.get(`${API_URL}/status/${taskId}`);
//         const data = response.data;

//         if (data.state === "SUCCESS") {
//           clearInterval(pollingIntervalRef.current!);
//           setStatus("Separation Complete!");
//           setResults(data.result);
//           setTaskId(null);
//         } else if (data.state === "FAILURE") {
//           clearInterval(pollingIntervalRef.current!);
//           setError(
//             data.error || "An unknown error occurred during processing."
//           );
//           setStatus("Error");
//           setTaskId(null);
//         } else {
//           setStatus(data.status || "Processing...");
//         }
//       } catch (err) {
//         console.error("Polling error:", err);
//         setError("Failed to get status update from the server.");
//         clearInterval(pollingIntervalRef.current!);
//         setStatus("Error");
//       }
//     }, 3000); // Poll every 3 seconds

//     // Cleanup function to stop polling if the component unmounts
//     return () => {
//       if (pollingIntervalRef.current) {
//         clearInterval(pollingIntervalRef.current);
//       }
//     };
//   }, [taskId]);

//   return (
//     <div style={{ maxWidth: "600px", textAlign: "center", margin: "auto" }}>
//       {/* Your existing JSX for search and video display */}
//       {loading && <p>Loading...</p>}
//       {videoId && !loading && (
//         <div style={{ marginBottom: "20px" }}>
//           <div className="video-responsive">
//             <iframe
//               src={`https://www.youtube.com/embed/${videoId}`}
//               title="YouTube video player"
//               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//               allowFullScreen
//             ></iframe>
//           </div>
//         </div>
//       )}
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: "10px",
//           marginBottom: "20px",
//         }}
//       >
//         <input
//           type="text"
//           placeholder="Search for a song..."
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           onKeyDown={handleKeyDown}
//           style={{ padding: "10px", flex: "1" }}
//         />
//         <button onClick={handleSearch} style={{ padding: "10px" }}>
//           SEARCH
//         </button>
//         <button
//           onClick={handleGenerate}
//           disabled={!videoId || !!taskId} // Disable while a task is running
//           style={{ padding: "10px" }}
//         >
//           {taskId ? "PROCESSING..." : "GENERATE"}
//         </button>
//       </div>

//       {/* --- ADDED: UI for status and results --- */}
//       <div
//         style={{
//           border: "1px solid #444",
//           padding: "15px",
//           borderRadius: "8px",
//           marginTop: "20px",
//         }}
//       >
//         <p style={{ margin: 0, fontSize: "1.1em" }}>
//           Status:{" "}
//           <span style={{ fontWeight: "bold", color: "#eab308" }}>{status}</span>
//         </p>
//         {error && (
//           <p style={{ color: "#f87171", marginTop: "10px" }}>{error}</p>
//         )}
//       </div>

//       {results && (
//         <div style={{ marginTop: "20px", textAlign: "left" }}>
//           <h3
//             style={{
//               textAlign: "center",
//               fontSize: "1.5em",
//               marginBottom: "15px",
//             }}
//           >
//             Separated Stems
//           </h3>
//           {Object.entries(results).map(([stemName, stemUrl]) => (
//             <div
//               key={stemName}
//               style={{
//                 marginBottom: "15px",
//                 background: "#2d3748",
//                 padding: "15px",
//                 borderRadius: "8px",
//               }}
//             >
//               <h4
//                 style={{
//                   textTransform: "capitalize",
//                   fontSize: "1.2em",
//                   margin: "0 0 10px 0",
//                 }}
//               >
//                 {stemName}
//               </h4>
//               <audio controls style={{ width: "100%" }}>
//                 <source src={`${API_URL}${stemUrl}`} type="audio/wav" />
//                 Your browser does not support the audio element.
//               </audio>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default YouTubeSearch;
