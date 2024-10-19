"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import {
    Circle,
    GoogleMap,
    Marker,
    useLoadScript,
} from "@react-google-maps/api";
import {
    AlertTriangle,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    BatteryWarning,
    ChevronLeft,
    ChevronRight,
    Diamond,
    Flame,
    MapPin,
    Plane,
    User,
    Wifi,
    WifiOff,
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

export default function Page() {
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
    const [_focusedItem, setFocusedItem] = useState<
        "drone" | "hazard" | "person" | null
    >(null);
    const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string, // type cast
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
        <div className="relative h-screen w-screen overflow-x-hidden bg-gray-100 text-gray-800">
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
                    <div className="flex h-full items-center justify-center">
                        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
                    </div>
                )}
            </div>

            {/* Connection status and battery bar */}
            <div className="absolute left-0 top-0 z-10 flex h-12 w-full items-center justify-between bg-white px-4 shadow-md">
                <div className="flex items-center space-x-2">
                    {isConnected ? (
                        <Wifi
                            className="text-green-500"
                            size={24}
                        />
                    ) : (
                        <WifiOff
                            className="text-red-500"
                            size={24}
                        />
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
            <div className="absolute bottom-0 left-0 top-12 w-80 overflow-auto bg-white shadow-lg transition-all duration-300 ease-in-out">
                {/* Persons Panel */}
                <div className="p-4">
                    <h2 className="mb-4 flex items-center text-xl font-bold">
                        <User
                            className="mr-2"
                            size={24}
                        />
                        Detected Persons
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {persons.map((person, index) => (
                            <div
                                key={index}
                                className="cursor-pointer overflow-hidden rounded-lg bg-gray-100 shadow-sm"
                                onClick={() => handlePersonClick(person)}
                            >
                                <NextImage
                                    src={`data:image/jpeg;base64,${person.image}`}
                                    alt={`Person ${index + 1}`}
                                    className="aspect-square w-full object-cover"
                                    width={300}
                                    height={300}
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
                <div className="border-t p-4">
                    <h2 className="mb-4 flex items-center text-xl font-bold">
                        <Plane
                            className="mr-2"
                            size={24}
                        />
                        Drones
                    </h2>
                    {drones.map((drone, index) => (
                        <div
                            key={index}
                            className="mb-2 flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-3 transition-colors duration-200 hover:bg-gray-200"
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
                                    <div className="group relative">
                                        {getBatteryIcon(drone.batteryLevel)}
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                            {drone.batteryLevel}%
                                        </span>
                                    </div>
                                )}
                                <div
                                    className={`h-3 w-3 rounded-full ${
                                        drone.isConnected
                                            ? "animate-pulse bg-green-500"
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
                className={`absolute bottom-0 right-0 top-12 w-80 bg-white shadow-lg transition-all duration-300 ease-in-out ${
                    isRightPanelOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="h-full p-4">
                    <h2 className="mb-4 flex items-center text-xl font-bold">
                        {selectedHazard ? (
                            <>
                                {selectedHazard.type === "warning" ? (
                                    <AlertTriangle
                                        className="mr-2"
                                        size={24}
                                    />
                                ) : (
                                    <Flame
                                        className="mr-2"
                                        size={24}
                                    />
                                )}
                                {selectedHazard.type === "warning"
                                    ? "Warning"
                                    : "Fire"}{" "}
                                Hazard
                            </>
                        ) : (
                            <>
                                <MapPin
                                    className="mr-2"
                                    size={24}
                                />
                                Drone Feed
                            </>
                        )}
                    </h2>
                    <div className="overflow-hidden rounded-lg bg-gray-100">
                        {selectedHazard ? (
                            // <NextImage
                            //     src="https://example.com/placeholder-gaussian-splat-image.jpg"
                            //     alt="Gaussian Splat"
                            //     className="h-auto w-full"
                            //     width={200}
                            //     height={200}
                            // />
                            <div className="h-44 w-full bg-neutral-400" />
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
                    className={`absolute -left-10 top-1/2 z-10 -translate-y-1/2 rounded-l-md bg-white p-2 shadow-md transition-all duration-300 hover:bg-gray-100`}
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
            <div className="absolute bottom-4 left-[340px] flex space-x-2 rounded-lg bg-white p-2 shadow-lg">
                {hazards.map((hazard, index) => (
                    <button
                        key={index}
                        className={`rounded-full p-2 ${
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
