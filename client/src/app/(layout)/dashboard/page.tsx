"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { DroneAssets } from "@/components/dashboard/drone-assets";
import { Header } from "@/components/dashboard/header";
import { Map } from "@/components/dashboard/map/map";
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
} from "lucide-react";

export interface Person {
    confidence: number;
    bbox: [number, number, number, number];
    image: string;
    timestamp: string;
}

interface Drone {
    name: string;
    isConnected: boolean;
    batteryLevel: number;
    startingCoordinate: string;
}

interface WebSocketData {
    persons: Person[];
    frame: string;
    droneStatus: Drone;
}

export interface Hazard {
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
        {
            name: "Drone X123",
            isConnected: false,
            batteryLevel: 0,
            startingCoordinate: "40.7128° N, 74.0060° W",
        },
        // Add more drones as needed
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
    const [isDronesDeployed, setIsDronesDeployed] = useState(false);
    const [mapZoom, setMapZoom] = useState(10); // Start with a more zoomed out view

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

    const handleDeployDrones = useCallback(() => {
        setIsDronesDeployed(true);

        // Smoothly zoom in on the drone location
        if (mapRef && currentLocation) {
            mapRef.panTo(currentLocation);
            mapRef.setZoom(15);
        }

        // Simulate drone deployment
        setTimeout(() => {
            setDrones((prevDrones) =>
                prevDrones.map((drone) => ({ ...drone, isConnected: true }))
            );
        }, 1000);

        // Simulate person detection
        setTimeout(() => {
            setPersons([
                {
                    confidence: 0.95,
                    bbox: [
                        center.lat + (Math.random() - 0.5) * 0.005,
                        center.lng + (Math.random() - 0.5) * 0.005,
                        0,
                        0,
                    ],
                    image: "",
                    timestamp: new Date().toLocaleTimeString(),
                },
            ]);
        }, 3000);

        // Simulate hazard detection
        setTimeout(() => {
            setHazards([
                {
                    type: "warning",
                    location: {
                        lat: center.lat + (Math.random() - 0.5) * 0.01,
                        lng: center.lng + (Math.random() - 0.5) * 0.01,
                    },
                },
                {
                    type: "fire",
                    location: {
                        lat: center.lat + (Math.random() - 0.5) * 0.01,
                        lng: center.lng + (Math.random() - 0.5) * 0.01,
                    },
                },
            ]);
        }, 5000);
    }, [center, currentLocation, mapRef]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-gray-100 text-gray-800">
            {/* Map container */}
            <div className="absolute inset-0 z-0">
                <Map
                    center={center}
                    zoom={mapZoom}
                    setZoom={setMapZoom} // Add this line to pass setZoom function to Map component
                    currentLocation={isDronesDeployed ? currentLocation : null}
                    persons={isDronesDeployed ? persons : []}
                    hazards={isDronesDeployed ? hazards : []}
                    handlePersonClick={handlePersonClick}
                    handleHazardClick={handleHazardClick}
                    handleDroneClick={handleDroneClick}
                    onMapLoad={onMapLoad}
                />
            </div>

            {/* Overlay container for all UI elements */}
            <div className="relative z-10 h-full w-full">
                <Header isConnected={isConnected} />

                <div className="absolute left-4 top-16 z-20">
                    <DroneAssets
                        onDeployDrones={handleDeployDrones}
                        isDronesDeployed={isDronesDeployed}
                        drones={drones}
                    />
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
        </div>
    );
}
