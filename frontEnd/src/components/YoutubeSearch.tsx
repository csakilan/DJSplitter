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
