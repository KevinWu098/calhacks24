import { useState, useEffect, useRef } from "react";
import {
    GoogleMap,
    useJsApiLoader,
    Marker,
    Circle,
} from "@react-google-maps/api";
import {
    Wifi,
    WifiOff,
    Plane,
    Diamond,
    User,
    ChevronRight,
    ChevronLeft,
    MapPin,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    BatteryWarning,
    AlertTriangle,
    Flame,
} from "lucide-react";

interface Person {
    confidence: number;
    bbox: [number, number, number, number];
    image: string;
    timestamp: string;
}

interface Drone {
    name: string;
    isConnected: boolean;
    batteryLevel: number;
}

interface WebSocketData {
    persons: Person[];
    frame: string;
    droneStatus: Drone;
}

interface Hazard {
    type: "warning" | "fire";
    location: { lat: number; lng: number };
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
        { name: "Drone 1", isConnected: false, batteryLevel: 0 },
    ]);
    const [hazards, setHazards] = useState<Hazard[]>([
        { type: "warning", location: { lat: 0, lng: 0 } },
        { type: "fire", location: { lat: 0, lng: 0 } },
    ]);
    const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
    const [focusedItem, setFocusedItem] = useState<
        "drone" | "hazard" | "person" | null
    >(null);
    const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

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
            const data: WebSocketData = JSON.parse(event.data);
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

            // Update drone status and battery level
            setDrones((prevDrones) => {
                return prevDrones.map((drone) =>
                    drone.name === data.droneStatus.name
                        ? data.droneStatus
                        : drone
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

    useEffect(() => {
        if (currentLocation) {
            // Set hazards with random offsets
            const warningLocation = {
                lat: currentLocation.lat + (Math.random() - 0.5) * 0.01,
                lng: currentLocation.lng + (Math.random() - 0.5) * 0.01,
            };

            const fireLocation = {
                lat: currentLocation.lat + (Math.random() - 0.5) * 0.01,
                lng: currentLocation.lng + (Math.random() - 0.5) * 0.01,
            };

            setHazards([
                { type: "warning", location: warningLocation },
                { type: "fire", location: fireLocation },
            ]);

            // Set person with random offset
            const personLocation = {
                lat: currentLocation.lat + (Math.random() - 0.5) * 0.005,
                lng: currentLocation.lng + (Math.random() - 0.5) * 0.005,
            };

            setPersons([
                {
                    confidence: 0.95,
                    bbox: [personLocation.lat, personLocation.lng, 0, 0],
                    image: "",
                    timestamp: new Date().toLocaleTimeString(),
                },
            ]);
        }
    }, [currentLocation]);

    const handleHazardClick = (hazard: Hazard) => {
        setSelectedHazard(hazard);
        setIsRightPanelOpen(true);
        setFocusedItem("hazard");
        if (mapRef) {
            mapRef.panTo(hazard.location);
            mapRef.setZoom(16);
        }
    };

    const handlePersonClick = (person: Person) => {
        setFocusedItem("person");
        setIsRightPanelOpen(false); // Close the right subpanel
        setSelectedHazard(null); // Clear any selected hazard
        if (mapRef) {
            mapRef.panTo({ lat: person.bbox[0], lng: person.bbox[1] });
            mapRef.setZoom(16);
        }
    };

    const handleDroneClick = () => {
        setIsRightPanelOpen(true);
        setSelectedHazard(null);
        setFocusedItem("drone");
        if (mapRef && currentLocation) {
            mapRef.panTo(currentLocation);
            mapRef.setZoom(15);
        }
    };

    const onMapLoad = (map: google.maps.Map) => {
        setMapRef(map);
    };

    const getBatteryIcon = (level: number) => {
        if (level > 90) return <BatteryFull />;
        if (level > 70) return <BatteryMedium />;
        if (level > 30) return <BatteryLow />;
        return <BatteryWarning />;
    };

    return (
        <div className="relative h-screen w-screen text-gray-800 overflow-x-hidden bg-gray-100">
            {/* Main Content (Google Map) */}
            <div className="absolute inset-0">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerClassName="w-full h-full"
                        center={center}
                        zoom={14}
                        mapTypeId="satellite"
                        onLoad={onMapLoad}
                    >
                        {currentLocation && (
                            <>
                                <Circle
                                    center={currentLocation}
                                    radius={50}
                                    options={{
                                        fillColor: "#10B981",
                                        fillOpacity: 0.3,
                                        strokeColor: "#10B981",
                                        strokeOpacity: 0.8,
                                        strokeWeight: 2,
                                    }}
                                />
                                <Marker
                                    position={currentLocation}
                                    onClick={handleDroneClick}
                                    icon={{
                                        path: google.maps.SymbolPath.CIRCLE,
                                        fillColor: "lime",
                                        fillOpacity: 1,
                                        strokeColor: "white",
                                        strokeWeight: 2,
                                        scale: 8,
                                    }}
                                />
                            </>
                        )}
                        {hazards.map((hazard, index) => (
                            <Marker
                                key={index + 99}
                                position={hazard.location}
                                onClick={() => handleHazardClick(hazard)}
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    fillColor:
                                        hazard.type === "warning"
                                            ? "yellow"
                                            : "red",
                                    fillOpacity: 1,
                                    strokeColor: "white",
                                    strokeWeight: 2,
                                    scale: 8,
                                }}
                            />
                        ))}
                        {persons.map((person, index) => (
                            <Marker
                                key={index}
                                position={{
                                    lat: person.bbox[0],
                                    lng: person.bbox[1],
                                }}
                                onClick={() => handlePersonClick(person)}
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    fillColor: "blue",
                                    fillOpacity: 1,
                                    strokeColor: "white",
                                    strokeWeight: 2,
                                    scale: 8,
                                }}
                            />
                        ))}
                    </GoogleMap>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                )}
            </div>

            {/* Connection status and battery bar */}
            <div className="absolute left-0 top-0 h-12 w-full bg-white shadow-md flex items-center justify-between px-4 z-10">
                <div className="flex items-center space-x-2">
                    {isConnected ? (
                        <Wifi className="text-green-500" size={24} />
                    ) : (
                        <WifiOff className="text-red-500" size={24} />
                    )}
                    <span
                        className={`font-semibold ${
                            isConnected ? "text-green-500" : "text-red-500"
                        }`}
                    >
                        {isConnected ? "Connected" : "Disconnected"}
                    </span>
                </div>
            </div>

            {/* Left Sidebar */}
            <div className="absolute left-0 top-12 bottom-0 w-80 bg-white shadow-lg overflow-auto transition-all duration-300 ease-in-out">
                {/* Persons Panel */}
                <div className="p-4">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <User className="mr-2" size={24} />
                        Detected Persons
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {persons.map((person, index) => (
                            <div
                                key={index}
                                className="bg-gray-100 rounded-lg shadow-sm overflow-hidden cursor-pointer"
                                onClick={() => handlePersonClick(person)}
                            >
                                <img
                                    src={`data:image/jpeg;base64,${person.image}`}
                                    alt={`Person ${index + 1}`}
                                    className="w-full aspect-square object-cover"
                                />
                                <div className="p-2">
                                    <p className="text-sm text-gray-600">
                                        {person.timestamp}
                                    </p>
                                    <p className="text-sm font-bold text-blue-600">
                                        {Math.round(person.confidence * 100)}%
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Drones Panel */}
                <div className="p-4 border-t">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <Plane className="mr-2" size={24} />
                        Drones
                    </h2>
                    {drones.map((drone, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between mb-2 bg-gray-100 p-3 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors duration-200"
                            onClick={handleDroneClick}
                        >
                            <div className="flex items-center">
                                <Diamond
                                    fill="currentColor"
                                    size={20}
                                    className="mr-2 text-blue-500"
                                />
                                <span>{drone.name}</span>
                            </div>
                            <div className="flex items-center">
                                {drone.isConnected && (
                                    <div className="relative group">
                                        {getBatteryIcon(drone.batteryLevel)}
                                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            {drone.batteryLevel}%
                                        </span>
                                    </div>
                                )}
                                <div
                                    className={`w-3 h-3 rounded-full ${
                                        drone.isConnected
                                            ? "bg-green-500 animate-pulse"
                                            : "bg-red-500"
                                    }`}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Sidebar */}
            <div
                className={`absolute right-0 top-12 bottom-0 w-80 bg-white shadow-lg transition-all duration-300 ease-in-out ${
                    isRightPanelOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="p-4 h-full">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        {selectedHazard ? (
                            <>
                                {selectedHazard.type === "warning" ? (
                                    <AlertTriangle className="mr-2" size={24} />
                                ) : (
                                    <Flame className="mr-2" size={24} />
                                )}
                                {selectedHazard.type === "warning"
                                    ? "Warning"
                                    : "Fire"}{" "}
                                Hazard
                            </>
                        ) : (
                            <>
                                <MapPin className="mr-2" size={24} />
                                Drone Feed
                            </>
                        )}
                    </h2>
                    <div className="bg-gray-100 rounded-lg overflow-hidden">
                        {selectedHazard ? (
                            <img
                                src="https://example.com/placeholder-gaussian-splat-image.jpg"
                                alt="Gaussian Splat"
                                className="w-full h-auto"
                            />
                        ) : (
                            <canvas
                                ref={canvasRef}
                                width="320"
                                height="240"
                                className="w-full"
                            />
                        )}
                    </div>
                </div>

                {/* Toggle button for right panel */}
                <button
                    className={`absolute top-1/2 -translate-y-1/2 -left-10 z-10 bg-white p-2 rounded-l-md shadow-md transition-all duration-300 hover:bg-gray-100`}
                    onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                >
                    {isRightPanelOpen ? (
                        <ChevronRight size={24} />
                    ) : (
                        <ChevronLeft size={24} />
                    )}
                </button>
            </div>

            {/* Floating Hazard Panel */}
            <div className="absolute left-[340px] bottom-4 bg-white rounded-lg shadow-lg p-2 flex space-x-2">
                {hazards.map((hazard, index) => (
                    <button
                        key={index}
                        className={`p-2 rounded-full ${
                            hazard.type === "warning"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                        } text-white`}
                        onClick={() => handleHazardClick(hazard)}
                    >
                        {hazard.type === "warning" ? (
                            <AlertTriangle size={24} />
                        ) : (
                            <Flame size={24} />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default App;
