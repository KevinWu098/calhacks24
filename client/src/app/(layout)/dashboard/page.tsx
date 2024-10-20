"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { ActiveDrones } from "@/components/dashboard/ActiveDrones";
import { DetectedPersons } from "@/components/dashboard/DetectedPersons";
import { DroneAssets } from "@/components/dashboard/drone-assets";
import { Header } from "@/components/dashboard/header";
import { Map } from "@/components/dashboard/map/map";
import { MapOverview } from "@/components/dashboard/map/map-overview";
import { Nav } from "@/components/dashboard/nav";
import { Details } from "@/components/dashboard/rescue/details";
import { NearbyHazards } from "@/components/dashboard/rescue/nearby-hazards";
import { RescueWorkflow } from "@/components/dashboard/rescue/rescue-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
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
    Route,
    User,
    Wifi,
    WifiOff,
} from "lucide-react";

export interface Person {
    id: string;
    confidence: number;
    bbox: [number, number, number, number];
    image: string;
    timestamp: string;
}

export interface Drone {
    name: string;
    isConnected: boolean;
    batteryLevel: number;
    startingCoordinate: string;
    location: { lat: number; lng: number };
}

interface WebSocketData {
    persons: Person[];
    frame: string;
    droneStatus: Drone;
}

export interface Hazard {
    id: string;
    type: "warning" | "fire";
    location: { lat: number; lng: number };
    severity: "Low" | "Moderate" | "High" | "Critical";
    details: string;
    createdBy: string;
    createdAt: Date;
}

type DataMode = "fake" | "real";

const socket = new WebSocket("ws://localhost:8000/ws");

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
    const [drones, setDrones] = useState<Drone[]>([]);
    const [hazards, setHazards] = useState<Hazard[]>([]);
    const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
    const [_focusedItem, setFocusedItem] = useState<
        "drone" | "hazard" | "person" | null
    >(null);
    const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
    const [isDronesDeployed, setIsDronesDeployed] = useState(false);
    const [mapZoom, setMapZoom] = useState(10); // Start with a more zoomed out view
    const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(false);
    const [dataMode, setDataMode] = useState<DataMode>("fake");
    const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
    const [rescueRoute, setRescueRoute] = useState<google.maps.LatLng[]>([]);
    const [selectMode, setSelectMode] = useState(false);

    // Add fake data
    const fakeDrones: Drone[] = [
        {
            name: "Drone X123",
            isConnected: true,
            batteryLevel: 85,
            startingCoordinate: "40.7128° N, 74.0060° W",
            location: { lat: 40.7128, lng: -74.006 },
        },
        {
            name: "Drone Y456",
            isConnected: true,
            batteryLevel: 72,
            startingCoordinate: "34.0522° N, 118.2437° W",
            location: { lat: 34.0522, lng: -118.2437 },
        },
        {
            name: "Drone Z789",
            isConnected: true,
            batteryLevel: 93,
            startingCoordinate: "51.5074° N, 0.1278° W",
            location: { lat: 51.5074, lng: -0.1278 },
        },
        {
            name: "Drone A012",
            isConnected: true,
            batteryLevel: 64,
            startingCoordinate: "35.6762° N, 139.6503° E",
            location: { lat: 35.6762, lng: 139.6503 },
        },
    ];

    const fakeHazards: Hazard[] = [
        {
            type: "warning",
            location: { lat: 0, lng: 0 },
            severity: "Low",
            details: "Potential hazard detected",
            createdBy: "AI System",
            createdAt: new Date(),
            id: crypto.randomUUID(),
        },
        {
            type: "fire",
            location: { lat: 0, lng: 0 },
            severity: "Critical",
            details: "Active fire detected",
            createdBy: "Thermal Sensor",
            createdAt: new Date(),
            id: crypto.randomUUID(),
        },
    ];

    // Update the fakeDrones array to be a function that generates drones based on current location
    const generateFakeDrones = useCallback(
        (center: { lat: number; lng: number }): Drone[] => {
            return [
                {
                    name: "Drone X123",
                    isConnected: true,
                    batteryLevel: 85,
                    startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                    location: {
                        lat: center.lat + (Math.random() - 0.5) * 0.01,
                        lng: center.lng + (Math.random() - 0.5) * 0.01,
                    },
                },
                {
                    name: "Drone Y456",
                    isConnected: true,
                    batteryLevel: 72,
                    startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                    location: {
                        lat: center.lat + (Math.random() - 0.5) * 0.01,
                        lng: center.lng + (Math.random() - 0.5) * 0.01,
                    },
                },
                {
                    name: "Drone Z789",
                    isConnected: true,
                    batteryLevel: 93,
                    startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                    location: {
                        lat: center.lat + (Math.random() - 0.5) * 0.01,
                        lng: center.lng + (Math.random() - 0.5) * 0.01,
                    },
                },
                {
                    name: "Drone A012",
                    isConnected: true,
                    batteryLevel: 64,
                    startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                    location: {
                        lat: center.lat + (Math.random() - 0.5) * 0.01,
                        lng: center.lng + (Math.random() - 0.5) * 0.01,
                    },
                },
            ];
        },
        []
    );

    // Modify the useEffect for WebSocket to use real data when in "real" mode
    useEffect(() => {
        if (dataMode === "real") {
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
                    const existingDrone = prevDrones.find(
                        (d) => d.name === data.droneStatus.name
                    );
                    if (existingDrone) {
                        return prevDrones.map((drone) =>
                            drone.name === data.droneStatus.name
                                ? data.droneStatus
                                : drone
                        );
                    } else {
                        return [...prevDrones, data.droneStatus];
                    }
                });
            };

            socket.onclose = () => {
                console.log("WebSocket connection closed");
                setIsConnected(false);
                setDrones([]);
            };

            return () => {
                socket.close();
            };
        }
    }, [dataMode]);

    // Modify the useEffect for setting hazards and drones to use fake data when in "fake" mode
    useEffect(() => {
        if (currentLocation) {
            if (dataMode === "fake") {
                // Set hazards with random offsets
                setHazards([
                    {
                        type: "warning",
                        location: {
                            lat: center.lat + (Math.random() - 0.5) * 0.01,
                            lng: center.lng + (Math.random() - 0.5) * 0.01,
                        },
                        severity: "Low",
                        details: "",
                        createdBy: "",
                        createdAt: new Date(),
                        id: crypto.randomUUID(),
                    },
                    {
                        type: "fire",
                        location: {
                            lat: center.lat + (Math.random() - 0.5) * 0.01,
                            lng: center.lng + (Math.random() - 0.5) * 0.01,
                        },
                        severity: "Critical",
                        details: "",
                        createdBy: "",
                        createdAt: new Date(),
                        id: crypto.randomUUID(),
                    },
                ]);

                // Set fake drones around the current location
                setDrones(generateFakeDrones(currentLocation));

                // Set persons with random offsets
                const newPersons: Person[] = Array(5)
                    .fill(null)
                    .map(() => ({
                        id: crypto.randomUUID(),
                        confidence: 0.95,
                        bbox: [
                            center.lat + (Math.random() - 0.5) * 0.01,
                            center.lng + (Math.random() - 0.5) * 0.01,
                            0,
                            0,
                        ],
                        image: "",
                        timestamp: new Date().toLocaleTimeString(),
                    }));

                setPersons(newPersons);
            } else {
                // Clear fake data when in real mode
                setHazards([]);
                setPersons([]);
                setDrones([]);
            }
        }
    }, [currentLocation, dataMode, generateFakeDrones]);

    // Modify the toggle function for data mode
    const toggleDataMode = useCallback(() => {
        setDataMode((prevMode) => (prevMode === "real" ? "fake" : "real"));
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
                    if (dataMode === "fake") {
                        setDrones(generateFakeDrones(newCenter));
                    }
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

    const handleHazardClick = (hazard: Hazard) => {
        setSelectedHazard(hazard);
        setIsRightPanelOpen(true);
        setShowHumanPanel(false);
        setFocusedItem("hazard");
        if (mapRef) {
            mapRef.panTo(hazard.location);
            smoothZoom(mapRef, 16, mapRef.getZoom() as number);
        }
    };

    const handlePersonSelection = useCallback(
        (person: Person, multiSelect: boolean) => {
            console.log(
                "Selecting person:",
                person.id,
                "Multi-select:",
                multiSelect
            );
            setSelectedPersons((prev) => {
                const isSelected = prev.some((p) => p.id === person.id);
                console.log("Is already selected:", isSelected);
                if (isSelected) {
                    return prev.filter((p) => p.id !== person.id);
                } else {
                    const newSelection = multiSelect
                        ? [...prev, person]
                        : [person];
                    console.log(
                        "New selection:",
                        newSelection.map((p) => p.id)
                    );
                    return newSelection;
                }
            });
        },
        []
    );

    const handlePersonClick = useCallback(
        (person: Person) => {
            if (selectMode) {
                handlePersonSelection(person, false);
            } else {
                setFocusedItem("person");
                setIsRightPanelOpen(false);
                setShowHumanPanel(true);
                setSelectedHazard(null);
                if (mapRef) {
                    const targetLatLng = new google.maps.LatLng(
                        person.bbox[0],
                        person.bbox[1] + 0.005 // slight offset for panel
                    );
                    mapRef.panTo(targetLatLng);
                    smoothZoom(mapRef, 16, mapRef.getZoom() as number);
                }
            }
        },
        [selectMode, handlePersonSelection, mapRef]
    );

    const handleDroneClick = (droneName: string) => {
        setIsRightPanelOpen(true);
        setSelectedHazard(null);
        setFocusedItem("drone");
        const clickedDrone = drones.find((drone) => drone.name === droneName);
        if (mapRef && clickedDrone && "location" in clickedDrone) {
            mapRef.panTo(clickedDrone.location);
            smoothZoom(mapRef, 15, mapRef.getZoom() as number);
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
        setIsLeftPanelVisible(true);

        if (mapRef && currentLocation) {
            mapRef.panTo(currentLocation);
            smoothZoom(mapRef, 15, mapRef.getZoom() as number);
        }

        if (dataMode === "fake") {
            // For fake mode, immediately set the drones
            setDrones(generateFakeDrones(currentLocation!));
        } else {
            // For real mode, simulate drone deployment (keep existing logic)
            setTimeout(() => {
                setDrones((prevDrones) =>
                    prevDrones.map((drone) => ({ ...drone, isConnected: true }))
                );
            }, 1000);
        }

        socket.send(
            JSON.stringify({
                event: "DEPLOY",
            })
        );
    }, [currentLocation, dataMode, generateFakeDrones, mapRef]);

    const getSeverityColor = (severity: Hazard["severity"]) => {
        switch (severity) {
            case "Low":
                return "bg-blue-100 text-blue-800";
            case "Moderate":
                return "bg-yellow-100 text-yellow-800";
            case "High":
                return "bg-orange-100 text-orange-800";
            case "Critical":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const planRescueRoute = useCallback(() => {
        if (currentLocation && selectedPersons.length > 0 && mapRef) {
            const directionsService = new google.maps.DirectionsService();
            const waypoints = selectedPersons.map((person) => ({
                location: new google.maps.LatLng(
                    person.bbox[0],
                    person.bbox[1]
                ),
                stopover: true,
            }));

            directionsService.route(
                {
                    origin: new google.maps.LatLng(
                        currentLocation.lat,
                        currentLocation.lng
                    ),
                    destination: new google.maps.LatLng(
                        currentLocation.lat,
                        currentLocation.lng
                    ),
                    waypoints: waypoints,
                    optimizeWaypoints: true,
                    travelMode: google.maps.TravelMode.WALKING,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK && result) {
                        const route = result.routes[0].overview_path;
                        setRescueRoute(route);
                    }
                }
            );
        }
    }, [currentLocation, selectedPersons, mapRef]);

    const toggleSelectMode = useCallback(() => {
        setSelectMode((prev) => !prev);
        if (selectMode) {
            setSelectedPersons([]);
        }
    }, [selectMode]);

    const smoothZoom = (
        map: google.maps.Map,
        targetZoom: number,
        currentZoom: number
    ) => {
        if (currentZoom !== targetZoom) {
            google.maps.event.addListenerOnce(map, "zoom_changed", () => {
                smoothZoom(map, targetZoom, map.getZoom() as number);
            });
            setTimeout(() => {
                map.setZoom(currentZoom + (targetZoom > currentZoom ? 1 : -1));
            }, 80);
        }
    };

    const [showHumanPanel, setShowHumanPanel] = useState(false);

    const handleCloseHumanPanel = () => {
        setShowHumanPanel(false);
    };

    return (
        <div className="relative h-full w-full overflow-hidden bg-gray-100 text-gray-800">
            {/* Overlay container for all UI elements */}
            <div className="relative z-10">
                <div className="pointer-events-auto">
                    <Nav
                        isConnected={isConnected}
                        dataMode={dataMode}
                        toggleDataMode={toggleDataMode}
                    />

                    {/* <Header
                        isConnected={isConnected}
                        dataMode={dataMode}
                        toggleDataMode={toggleDataMode}
                    /> */}
                </div>
                <div className="pointer-events-auto absolute left-4 top-16 z-20">
                    <DroneAssets
                        onDeployDrones={handleDeployDrones}
                        isDronesDeployed={isDronesDeployed}
                        drones={drones}
                        dataMode={dataMode}
                        socket={socket}
                    />
                </div>
                <div
                    className={cn(
                        "absolute right-4 top-16",
                        isDronesDeployed && "translate-x-[120%] transition-all"
                    )}
                >
                    <MapOverview />
                </div>
                {/* Left Sidebar */}
                {/* <div
                    className={`pointer-events-auto absolute bottom-0 left-0 top-12 z-10 w-80 overflow-auto bg-white shadow-lg transition-all duration-500 ease-in-out ${
                        isLeftPanelVisible
                            ? "translate-x-0"
                            : "-translate-x-full"
                    }`}
                >
                    <DetectedPersons
                        persons={persons}
                        handlePersonClick={handlePersonClick}
                        selectedPersons={selectedPersons}
                        handlePersonSelection={handlePersonSelection}
                        planRescueRoute={planRescueRoute}
                        selectMode={selectMode}
                        toggleSelectMode={toggleSelectMode}
                    />
                    <ActiveDrones
                        drones={drones}
                        handleDroneClick={handleDroneClick}
                    />
                </div> */}
                {showHumanPanel ? (
                    <div className="absolute right-4 top-16 flex flex-row space-x-2">
                        <div className="space-y-2">
                            <Details handleClose={handleCloseHumanPanel} />
                            <NearbyHazards />
                        </div>
                        <RescueWorkflow />
                    </div>
                ) : null}

                {/* Right Sidebar */}
                <div
                    className={`pointer-events-auto absolute right-4 top-16 flex w-80 flex-col rounded-sm border-2 border-gray-400 bg-white shadow-lg transition-all duration-300 ease-in-out ${
                        isRightPanelOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    {selectedHazard && (
                        <div className="flex h-fit flex-col rounded-sm bg-white p-4">
                            <div className="mb-4 flex h-fit items-center justify-between bg-white">
                                <h2 className="text-xl font-bold">
                                    {selectedHazard.type === "warning" ? (
                                        <AlertTriangle
                                            className="mr-2 inline"
                                            size={24}
                                        />
                                    ) : (
                                        <Flame
                                            className="mr-2 inline"
                                            size={24}
                                        />
                                    )}
                                    {selectedHazard.type === "warning"
                                        ? "Warning"
                                        : "Fire"}{" "}
                                    Hazard
                                </h2>
                                <Badge
                                    className={getSeverityColor(
                                        selectedHazard.severity
                                    )}
                                >
                                    {selectedHazard.severity}
                                </Badge>
                            </div>
                            <div className="mb-4 overflow-hidden rounded-lg bg-gray-100">
                                <div className="h-44 w-full bg-neutral-400" />
                            </div>
                            <div className="mb-4 space-y-2 text-sm">
                                <p>
                                    <span className="font-semibold">
                                        Location:{" "}
                                    </span>
                                    {selectedHazard.location.lat.toFixed(4)}° N,{" "}
                                    {selectedHazard.location.lng.toFixed(4)}° W
                                </p>
                                <p>
                                    <span className="font-semibold">
                                        Created:{" "}
                                    </span>
                                    {formatTimeAgo(selectedHazard.createdAt)} by{" "}
                                    {selectedHazard.createdBy}
                                </p>
                            </div>
                            <div className="mb-4 flex-grow">
                                <h3 className="mb-2 font-semibold">Details</h3>
                                <p className="text-sm">
                                    {selectedHazard.details}
                                </p>
                            </div>
                            <Button className="w-full bg-blue-500 text-white hover:bg-blue-600">
                                Handoff to operator
                            </Button>
                        </div>
                    )}

                    {!selectedHazard && drones.length > 0 && (
                        <div className="flex h-full flex-col p-4">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold">
                                    <Plane
                                        className="mr-2 inline"
                                        size={24}
                                    />
                                    Drone Details
                                </h2>
                                <Badge
                                    className={`${drones[0].isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                                >
                                    {drones[0].isConnected
                                        ? "Connected"
                                        : "Disconnected"}
                                </Badge>
                            </div>
                            <div className="mb-4 overflow-hidden rounded-lg bg-gray-100">
                                <div className="h-44 w-full bg-neutral-400" />
                            </div>
                            <div className="mb-4 space-y-2 text-sm">
                                <p>
                                    <span className="font-semibold">
                                        Name:{" "}
                                    </span>
                                    {drones[0].name}
                                </p>
                                <p>
                                    <span className="font-semibold">
                                        Starting Coordinate:{" "}
                                    </span>
                                    {drones[0].startingCoordinate}
                                </p>
                                <p>
                                    <span className="font-semibold">
                                        Current Location:{" "}
                                    </span>
                                    {drones[0].location.lat.toFixed(4)}° N,{" "}
                                    {drones[0].location.lng.toFixed(4)}° W
                                </p>
                            </div>
                            <div className="mb-4 flex-grow">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">
                                        Battery Level
                                    </h3>
                                    <span>{drones[0].batteryLevel}%</span>
                                </div>
                                <Progress
                                    value={drones[0].batteryLevel}
                                    className="mt-2"
                                />
                            </div>
                            <Button className="w-full bg-blue-500 text-white hover:bg-blue-600">
                                Request manual control
                            </Button>
                        </div>
                    )}

                    {/* Toggle button for right panel */}
                    <button
                        className={`absolute -left-10 top-1/2 z-10 -translate-y-1/2 rounded-l-md bg-white p-2 shadow-md transition-all duration-300 hover:bg-gray-100`}
                        onClick={() => {
                            setIsRightPanelOpen(!isRightPanelOpen);
                            setShowHumanPanel(false);
                        }}
                    >
                        {isRightPanelOpen ? (
                            <ChevronRight size={24} />
                        ) : (
                            <ChevronLeft size={24} />
                        )}
                    </button>
                </div>
            </div>

            <div className="absolute inset-0 z-0">
                <Map
                    center={center}
                    zoom={mapZoom}
                    setZoom={setMapZoom}
                    currentLocation={isDronesDeployed ? currentLocation : null}
                    persons={isDronesDeployed ? persons : []}
                    hazards={isDronesDeployed ? hazards : []}
                    drones={isDronesDeployed ? drones : []}
                    handlePersonClick={handlePersonClick}
                    handleHazardClick={handleHazardClick}
                    handleDroneClick={handleDroneClick}
                    onMapLoad={onMapLoad}
                    rescueRoute={rescueRoute}
                    selectMode={selectMode}
                    selectedPersons={selectedPersons}
                />
            </div>

            {isDronesDeployed && (
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
            )}

            {/* Add this block for the DetectedPersons panel */}
            {isDronesDeployed && (
                <div className="pointer-events-auto absolute bottom-4 left-4 z-10 w-80 rounded-lg bg-white shadow-lg">
                    <DetectedPersons
                        persons={persons}
                        handlePersonClick={handlePersonClick}
                        selectedPersons={selectedPersons}
                        handlePersonSelection={handlePersonSelection}
                        planRescueRoute={planRescueRoute}
                        selectMode={selectMode}
                        toggleSelectMode={toggleSelectMode}
                    />
                </div>
            )}
        </div>
    );
}

// Helper function to format the time ago
function formatTimeAgo(date: Date) {
    const now = new Date();
    const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hr ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
}
