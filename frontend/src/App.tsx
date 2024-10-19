import { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Circle,
} from "@react-google-maps/api";

interface Person {
  confidence: number;
  bbox: [number, number, number, number];
  image: string;
  timestamp: string;
}

interface Drone {
  name: string;
  isConnected: boolean;
}

function App() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [droneFeed, setDroneFeed] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drones, setDrones] = useState<Drone[]>([
    { name: "Drone 1", isConnected: false },
  ]);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws");

    socket.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPersons((prevPersons) => {
        const lastPerson = data.persons[data.persons.length - 1];
        if (lastPerson) {
          return [
            {
              ...lastPerson,
              image: data.frame,
              timestamp: new Date().toLocaleTimeString(),
            },
          ];
        }
        return prevPersons;
      });
      setDroneFeed(data.frame);

      // Update drone status
      setDrones((prevDrones) => {
        return prevDrones.map((drone) =>
          drone.name === data.droneStatus.name ? data.droneStatus : drone
        );
      });
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
      // Disconnect all drones when WebSocket disconnects
      setDrones((prevDrones) =>
        prevDrones.map((drone) => ({ ...drone, isConnected: false }))
      );
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(newCenter);
          setCurrentLocation(newCenter);
        },
        () => {
          console.log("Unable to retrieve your location");
        }
      );
    }
  }, []);

  useEffect(() => {
    if (droneFeed && canvasRef.current && isRightPanelOpen) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        }
      };
      img.src = `data:image/jpeg;base64,${droneFeed}`;
    }
  }, [droneFeed, isRightPanelOpen]);

  const handleDroneClick = () => {
    setIsRightPanelOpen(true);
  };

  return (
    <div className="relative h-screen w-screen text-black overflow-x-hidden">
      {/* Main Content (Google Map) */}
      <div className="absolute inset-0">
        {isLoaded ? (
          <GoogleMap
            mapContainerClassName="w-full h-full"
            center={center}
            zoom={14}
            mapTypeId="satellite"
          >
            {currentLocation && (
              <>
                <Circle
                  center={currentLocation}
                  radius={50}
                  options={{
                    fillColor: "#00FF00",
                    fillOpacity: 0.3,
                    strokeColor: "#00FF00",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />
                <Marker
                  position={currentLocation}
                  onClick={handleDroneClick}
                  icon={{
                    fillColor: "#4285F4",
                    strokeColor: "red",
                    strokeWeight: 2,
                    fillOpacity: 1,
                    url: "https://wallpapers.com/images/hd/red-quadcopter-drone-top-view-zbx4t7mfn5hkjtyu.png",
                    scaledSize: new google.maps.Size(64, 64),
                    anchor: new google.maps.Point(32, 32),
                  }}
                />
              </>
            )}
          </GoogleMap>
        ) : (
          <div>Loading map...</div>
        )}
      </div>

      {/* Thin panel with connection status */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gray-200 flex flex-col items-center pt-4">
        <div
          className={`w-4 h-4 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          } ${isConnected ? "animate-pulse" : ""}`}
        ></div>
      </div>

      {/* Left Sidebar */}
      <div className="absolute left-8 top-0 bottom-0 w-64 bg-white bg-opacity-90 shadow-lg overflow-auto">
        {/* Persons Panel */}
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Detected Persons</h2>
          <div className="grid grid-cols-2 gap-2">
            {persons.map((person, index) => (
              <div key={index} className="border rounded p-2">
                <img
                  src={`data:image/jpeg;base64,${person.image}`}
                  alt={`Person ${index + 1}`}
                  className="w-full aspect-square object-cover mb-2"
                />
                <p className="text-sm">{person.timestamp}</p>
                <p className="text-sm font-bold">
                  {(person.confidence * 100).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>
        {/* Drones Panel */}
        <div className="p-4 border-t">
          <h2 className="text-xl font-bold mb-4">Drones</h2>
          {drones.map((drone, index) => (
            <div
              key={index}
              className="flex items-center justify-between mb-2 bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200"
              onClick={handleDroneClick}
            >
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 16.5C21 16.88 20.79 17.21 20.47 17.38L12.57 21.82C12.41 21.94 12.21 22 12 22C11.79 22 11.59 21.94 11.43 21.82L3.53 17.38C3.21 17.21 3 16.88 3 16.5V7.5C3 7.12 3.21 6.79 3.53 6.62L11.43 2.18C11.59 2.06 11.79 2 12 2C12.21 2 12.41 2.06 12.57 2.18L20.47 6.62C20.79 6.79 21 7.12 21 7.5V16.5Z" />
                </svg>
                <span>{drone.name}</span>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  drone.isConnected
                    ? "bg-green-500 animate-pulse"
                    : "bg-red-500"
                }`}
              ></div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-64 bg-white bg-opacity-90 shadow-lg transition-all duration-300 ease-in-out ${
          isRightPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 h-full">
          <h2 className="text-xl font-bold mb-4">Drone Feed</h2>
          <canvas ref={canvasRef} width="240" height="180" />
        </div>

        {/* Toggle button for right panel */}
        <button
          className={`absolute top-1/2 -translate-y-1/2 -left-8 z-10 bg-white p-2 rounded-l-md shadow-md transition-transform duration-300 ${
            isRightPanelOpen ? "rotate-180" : ""
          }`}
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
        >
          →
        </button>
      </div>
    </div>
  );
}

export default App;
