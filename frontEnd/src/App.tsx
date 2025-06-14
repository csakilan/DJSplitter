// src/App.tsx
import YouTubeSearch from "./components/YoutubeSearch";
import MasterController from "./components/MasterController";
import { MixerProvider } from "./context/MixerContext";
import "./App.css";

function App() {
  return (
    <MixerProvider>
      <div className="search-container">
        <YouTubeSearch />
        <MasterController />
        <YouTubeSearch />
      </div>
    </MixerProvider>
  );
}

export default App;
