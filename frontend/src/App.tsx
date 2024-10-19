import { useState, useEffect } from "react";
import "./App.css";

interface Person {
  confidence: number;
}

function App() {
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPersons(data.persons);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="App">
      <h1>Person Detection</h1>
      <div className="person-list">
        <h2>Detected Persons:</h2>
        {persons.length === 0 ? (
          <p>No persons detected</p>
        ) : (
          <ul>
            {persons.map((person, index) => (
              <li key={index}>
                Person {index + 1}: {(person.confidence * 100).toFixed(2)}%
                confidence
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
