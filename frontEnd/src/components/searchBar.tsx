import { useState } from "react";
import { FormEvent } from "react";
import Alert from "./Alert";

interface Props {
  placeHolder: string;
  id: string;
}

function SearchBar({ placeHolder, id }: Props) {
  const [songName, setName] = useState("");
  const [alertVisible, setAlertVisibility] = useState(false);
  const handleSubmit = (event: FormEvent) => {
    // trim reomves white space from both sides of a string
    if (songName.trim() === "") {
      setAlertVisibility(true);
    } else {
      event.preventDefault();
      console.log(songName);
    }
  };
  return (
    <>
      <form id={id} onSubmit={handleSubmit}>
        <input
          type="text"
          value={songName}
          placeholder={placeHolder}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <button type="submit" className="btn-submit">
          {" "}
          Submit
        </button>
      </form>
      {alertVisible && (
        <Alert
          name="Please Enter a valid song"
          color="primary"
          onClick={() => setAlertVisibility(false)}
        />
      )}
    </>
  );
}

export default SearchBar;
