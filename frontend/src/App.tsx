import { useState, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Circle,
} from "@react-google-maps/api";

interface Person {
  confidence: number;
}

function App() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

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
      setPersons(data.persons);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
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

  return (
    <div className="relative h-screen w-screen text-black">
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
                  // onMouseOver={}
                  icon={{
                    fillColor: "#4285F4",
                    strokeColor: "red",
                    strokeWeight: 2,
                    fillOpacity: 1,
                    // path: google.maps.SymbolPath.CIRCLE,
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
        {/* Top Panel */}
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Detected Persons</h2>
          {persons.length === 0 ? (
            <p>No persons detected</p>
          ) : (
            <ul>
              {persons.map((person, index) => (
                <li key={index} className="mb-2">
                  Person {index + 1}: {(person.confidence * 100).toFixed(2)}%
                  confidence
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Bottom Panel */}
        <div className="p-4 border-t">
          <h2 className="text-xl font-bold mb-4">Additional Info</h2>
          <p>This panel can contain additional information or controls.</p>
        </div>
      </div>

      {/* Right Sidebar */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-64 bg-white bg-opacity-90 shadow-lg transition-transform duration-300 ease-in-out ${
          isRightPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 h-full">
          <h2 className="text-xl font-bold mb-4">Right Sidebar</h2>
          <p>This sidebar can contain additional information or controls.</p>
        </div>
      </div>

      {/* Toggle button for right panel */}
      <button
        className="absolute top-4 right-4 z-10 bg-white p-2 rounded-full shadow-md"
        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
      >
        {isRightPanelOpen ? "→" : "←"}
      </button>
    </div>
  );
}

export default App;
