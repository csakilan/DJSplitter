// import { useState } from "react";
// import SearchBar from "./components/searchBar";
import YouTubeSearch from "./components/YoutubeSearch";
import "./App.css"; // Import the CSS file

function App() {
  // const [count, setCount] = useState(0);

  return (
    <>
      <div className="search-container">
        <YouTubeSearch />
        <YouTubeSearch />
        {/* <SearchBar placeHolder="Enter Song 1" id="songOne" />
        <SearchBar placeHolder="Enter Song 2" id="songTwo" /> */}
      </div>
    </>
  );
}

export default App;
