"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { ActiveDrones } from "@/components/dashboard/ActiveDrones";
import { DetectedPersons } from "@/components/dashboard/DetectedPersons";
import { DroneAssets } from "@/components/dashboard/drone-assets";
import { Map } from "@/components/dashboard/map/map";
import { MapOverview } from "@/components/dashboard/map/map-overview";
import { HereMap } from "@/components/dashboard/map/new-map";
import { Nav } from "@/components/dashboard/nav";
import { Details } from "@/components/dashboard/rescue/details";
import { NearbyHazards } from "@/components/dashboard/rescue/nearby-hazards";
import { RescueWorkflow } from "@/components/dashboard/rescue/rescue-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { calculateRescueTime, cn } from "@/lib/utils";
import axios from "axios";
import {
    AlertTriangle,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    BatteryWarning,
    ChevronLeft,
    ChevronRight,
    Flame,
    Loader2,
    Plane,
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
    location: { lat: number; lng: number };
    startingCoordinate: string;
    timestamp: string;
}

interface WebSocketData {
    persons: Person[];
    frame: string;
    droneStatus: Drone;
}

export interface Hazard {
    id: string;
    type: "power" | "fire";
    location: { lat: number; lng: number };
    severity: "Low" | "Moderate" | "High" | "Critical";
    details: string;
    createdBy: string;
    createdAt: Date;
}

type DataMode = "fake" | "real";

const socket = new WebSocket("ws://localhost:8000/ws");

const socketTwo = new WebSocket(
    "wss://fitting-correctly-lioness.ngrok-free.app/ws_agent"
);

export default function Page() {
    const [persons, setPersons] = useState<Person[]>([]);
    const [center] = useState({ lat: 35.7796, lng: -78.6382 }); // Centered on Raleigh, NC
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
    const [mapZoom, setMapZoom] = useState(11); // Start with a more zoomed out view
    const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(false);
    const [dataMode, setDataMode] = useState<DataMode>("fake");
    const [selectedPersons, setSelectedPersons] = useState<Person[]>([]);
    const [rescueRoute, setRescueRoute] = useState<google.maps.LatLng[]>([]);
    const [selectMode, setSelectMode] = useState(false);
    const [mapInstance, setMapInstance] = useState<H.Map | null>(null);
    const [rescueTime, setRescueTime] = useState<number | null>(null);
    const [rescueAccuracy, setRescueAccuracy] = useState<number>(95); // Default accuracy

    // Add fake data
    const fakeDrones: Drone[] = [
        {
            name: "Drone X123",
            isConnected: true,
            batteryLevel: 85,
            startingCoordinate: "40.7128° N, 74.0060° W",
            location: { lat: 40.7128, lng: -74.006 },
            timestamp: new Date().toISOString(),
        },
        {
            name: "Drone Y456",
            isConnected: true,
            batteryLevel: 72,
            startingCoordinate: "34.0522° N, 118.2437° W",
            location: { lat: 34.0522, lng: -118.2437 },
            timestamp: new Date().toISOString(),
        },
        {
            name: "Drone Z789",
            isConnected: true,
            batteryLevel: 93,
            startingCoordinate: "51.5074° N, 0.1278° W",
            location: { lat: 51.5074, lng: -0.1278 },
            timestamp: new Date().toISOString(),
        },
        {
            name: "Drone A012",
            isConnected: true,
            batteryLevel: 64,
            startingCoordinate: "35.6762° N, 139.6503° E",
            location: { lat: 35.6762, lng: 139.6503 },
            timestamp: new Date().toISOString(),
        },
    ];

    const fakeHazards: Hazard[] = [
        {
            type: "power",
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

    // Update the generateFakeDrones function
    const generateFakeDrones = useCallback(
        (center: { lat: number; lng: number }): Drone[] => {
            return [
                {
                    name: "Drone X123",
                    isConnected: true,
                    batteryLevel: 85,
                    startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                    location: {
                        lat: center.lat + 0.0032, // Adjusted offset
                        lng: center.lng + 0.0022, // Adjusted offset
                    },
                    timestamp: new Date().toISOString(),
                },
                {
                    name: "Drone Y456",
                    isConnected: true,
                    batteryLevel: 72,
                    startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                    location: {
                        lat: center.lat - 0.0026, // Adjusted offset
                        lng: center.lng - 0.0055, // Adjusted offset
                    },
                    timestamp: new Date().toISOString(),
                },
                {
                    name: "Drone Z789",
                    isConnected: true,
                    batteryLevel: 93,
                    startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                    location: {
                        lat: center.lat + 0.0015, // Adjusted offset
                        lng: center.lng - 0.0034, // Adjusted offset
                    },
                    timestamp: new Date().toISOString(),
                },
                {
                    name: "Drone A012",
                    isConnected: true,
                    batteryLevel: 64,
                    startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                    location: {
                        lat: center.lat - 0.0034, // Adjusted offset
                        lng: center.lng + 0.0061, // Adjusted offset
                    },
                    timestamp: new Date().toISOString(),
                },
            ];
        },
        []
    );

    // Modify the useEffect hook that fetches data
    useEffect(() => {
        // Fetch data from SingleStore when real-time mode is active
        if (dataMode === "real") {
            const fetchData = async () => {
                try {
                    const [personsResponse, droneResponse] = await Promise.all([
                        axios.get("http://localhost:8000/api/persons"),
                        axios.get("http://localhost:8000/api/drone_status"),
                    ]);

                    setPersons(personsResponse.data);
                    setDrones([droneResponse.data]);
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            };

            const interval = setInterval(fetchData, 1000); // Fetch data every second

            return () => clearInterval(interval);
        }
    }, [dataMode]);

    // Update the useEffect for setting hazards and persons
    // useEffect(() => {
    //     if (dataMode === "fake") {
    //         // Set hazards with adjusted offsets
    //         setHazards([
    //             {
    //                 type: "power",
    //                 location: {
    //                     lat: center.lat - 0.003,
    //                     lng: center.lng + 0.0024,
    //                 },
    //                 severity: "Low",
    //                 details: "",
    //                 createdBy: "",
    //                 createdAt: new Date(),
    //                 id: crypto.randomUUID(),
    //             },
    //             {
    //                 type: "fire",
    //                 location: {
    //                     lat: center.lat + 0.0,
    //                     lng: center.lng - 0.0095,
    //                 },
    //                 severity: "Critical",
    //                 details: "",
    //                 createdBy: "",
    //                 createdAt: new Date(),
    //                 id: crypto.randomUUID(),
    //             },
    //         ]);

    //         // Set fake drones around the current location
    //         setDrones(generateFakeDrones(center));

    //         // Set persons with adjusted offsets
    //         const newPersons: Person[] = [
    //             {
    //                 id: crypto.randomUUID(),
    //                 confidence: 0.95,
    //                 bbox: [center.lat + 0.002, center.lng - 0.012, 0, 0],
    //                 image: "",
    //                 timestamp: new Date().toISOString(),
    //             },
    //             {
    //                 id: crypto.randomUUID(),
    //                 confidence: 0.95,
    //                 bbox: [center.lat - 0.005, center.lng + 0.0026, 0, 0],
    //                 image: "",
    //                 timestamp: new Date().toISOString(),
    //             },
    //         ];

    //         // setPersons(newPersons);
    //     } else {
    //         // Clear fake data when in real mode
    //         setHazards([]);
    //         setPersons([]);
    //         setDrones([]);
    //     }
    // }, [center, dataMode, generateFakeDrones]);

    // Modify the toggle function for data mode
    const toggleDataMode = useCallback(() => {
        setDataMode((prevMode) => (prevMode === "real" ? "fake" : "real"));
    }, []);

    // Add this useEffect to set the currentLocation to the center
    useEffect(() => {
        setCurrentLocation(center);
        // if (dataMode === "fake") {
        //     setDrones(generateFakeDrones(center));
        // }
    }, [center, dataMode, generateFakeDrones]);

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
                // if (mapRef) {
                //     const targetLatLng = new google.maps.LatLng(
                //         person.bbox[0],
                //         person.bbox[1] + 0.005 // slight offset for panel
                //     );
                //     mapRef.panTo(targetLatLng);
                //     smoothZoom(mapRef, 16, mapRef.getZoom() as number);
                // }
            }
        },
        [selectMode, handlePersonSelection]
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

        // Generate all data here
        const newCenter = currentLocation || center;
        const newData = generateSimulationData(newCenter);

        setHazards(newData.hazards);
        setPersons(newData.persons);
        setDrones(newData.drones);

        if (dataMode === "real") {
            socket.send(
                JSON.stringify({
                    event: "DEPLOY",
                })
            );
        }
    }, [currentLocation, dataMode, mapRef, center, socket]);

    useEffect(() => {
        const newCenter = currentLocation || center;
        const newData = generateSimulationData(newCenter);

        setHazards(newData.hazards);
        setPersons(newData.persons);
        setDrones(newData.drones);
    }, []);

    // Add this new function to generate simulation data
    const generateSimulationData = (center: { lat: number; lng: number }) => {
        const hazardOffset1 = { lat: 0.005, lng: 0.007 };
        const hazardOffset2 = { lat: -0.003, lng: 0.006 };
        const hazardOffset3 = { lat: 0, lng: 0.003 }; // New fire offset
        const personOffset1 = { lat: 0.002, lng: -0.004 };
        const personOffset2 = { lat: -0.006, lng: 0.003 };
        const personOffset3 = { lat: 0.002, lng: 0.01 }; // New person offset
        const personOffset4 = { lat: -0.006, lng: -0.003 }; // New person offset
        const droneOffset1 = { lat: 0.004, lng: 0.005 };
        const droneOffset2 = { lat: -0.005, lng: -0.002 };

        const hazards: Hazard[] = [
            {
                id: "hazard1",
                type: "power",
                location: {
                    lat: center.lat + hazardOffset1.lat,
                    lng: center.lng + hazardOffset1.lng,
                },
                severity: "Moderate",
                details: "Potential structural damage detected",
                createdBy: "AI System",
                createdAt: new Date(),
            },
            {
                id: "hazard2",
                type: "fire",
                location: {
                    lat: center.lat + hazardOffset2.lat,
                    lng: center.lng + hazardOffset2.lng,
                },
                severity: "High",
                details: "Active fire detected in residential area",
                createdBy: "Thermal Sensor",
                createdAt: new Date(),
            },
            {
                id: "hazard3",
                type: "fire",
                location: {
                    lat: center.lat + hazardOffset3.lat,
                    lng: center.lng + hazardOffset3.lng,
                },
                severity: "Critical",
                details: "Large fire spreading rapidly",
                createdBy: "Drone Camera",
                createdAt: new Date(),
            },
        ];

        const persons: Person[] = [
            {
                id: "person1",
                confidence: 0.95,
                bbox: [
                    center.lat + personOffset1.lat,
                    center.lng + personOffset1.lng,
                    0,
                    0,
                ],
                image: "",
                timestamp: new Date().toISOString(),
            },
            {
                id: "person2",
                confidence: 0.88,
                bbox: [
                    center.lat + personOffset2.lat,
                    center.lng + personOffset2.lng,
                    0,
                    0,
                ],
                image: "",
                timestamp: new Date().toISOString(),
            },
            {
                id: "person3",
                confidence: 0.92,
                bbox: [
                    center.lat + personOffset3.lat,
                    center.lng + personOffset3.lng,
                    0,
                    0,
                ],
                image: "",
                timestamp: new Date().toISOString(),
            },
            {
                id: "person4",
                confidence: 0.85,
                bbox: [
                    center.lat + personOffset4.lat,
                    center.lng + personOffset4.lng,
                    0,
                    0,
                ],
                image: "",
                timestamp: new Date().toISOString(),
            },
        ];

        const drones: Drone[] = [
            {
                name: "Drone X123",
                isConnected: true,
                batteryLevel: 85,
                location: {
                    lat: center.lat + droneOffset1.lat,
                    lng: center.lng + droneOffset1.lng,
                },
                startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                timestamp: new Date().toISOString(),
            },
            {
                name: "Drone Y456",
                isConnected: true,
                batteryLevel: 72,
                location: {
                    lat: center.lat + droneOffset2.lat,
                    lng: center.lng + droneOffset2.lng,
                },
                startingCoordinate: `${center.lat.toFixed(4)}° N, ${center.lng.toFixed(4)}° W`,
                timestamp: new Date().toISOString(),
            },
        ];

        return { hazards, persons, drones };
    };

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

    const [displayedHazards, setDisplayedHazards] = useState<string[]>(["all"]);
    const [avoidedHazards, setAvoidedHazards] = useState<string[]>([]);
    const [showPeople, setShowPeople] = useState<boolean>(true);
    const [showDrones, setShowDrones] = useState<boolean>(true);
    const [query, setQuery] = useState("");
    const [destination, setDestination] = useState();
    const [loading, setLoading] = useState(false);

    const handleQuery = (input: string) => {
        if (input.trim() !== "") {
            setLoading(true);
            socketTwo.send(
                JSON.stringify({
                    event: "query",
                    message: input,
                })
            );
            console.log("Query sent:", input);
            setQuery("");
        }
    };

    const handleInputChange = useCallback(
        (e: { currentTarget: { value: React.SetStateAction<string> } }) => {
            setQuery(e.currentTarget.value);
        },
        []
    );

    const { toast } = useToast();
    const [agentMessage, setAgentMessage] = useState("");
    useEffect(() => {
        socketTwo.onopen = () => {
            console.log("WebSocket connection established");

            socketTwo.onmessage = (event) => {
                console.log("Received message");
                const message = JSON.parse(event.data);
                console.log("message:", message);
                const messageEvent = message.event;
                const hazards = message.hazards;
                console.log("event:", event);

                if (messageEvent === "display_hazards") {
                    setDisplayedHazards(hazards);
                    setShowDrones(message.drones);
                    setShowPeople(message.humans);
                }

                if (messageEvent === "plan_route") {
                    setAvoidedHazards(hazards);
                    setDestination(message.id);
                }

                if (messageEvent === "chat_chunk") {
                    console.log(agentMessage);
                    setAgentMessage((prev) => (prev += message.content));
                }

                if (messageEvent === "AGENT_RESPONSE_COMPLETE") {
                    console.log("herer!");
                    toast({
                        title: "Summary",
                        description: agentMessage,
                        className: "w-[500px] z-50 mr-16",
                        duration: 8000,
                    });
                    setAgentMessage("");
                    setLoading(false);
                }
            };

            socketTwo.onclose = () => {
                console.log("Closing websocket");
            };
        };
    }, []);

    const planHereRoute = useCallback(
        (map: any, router: any) => {
            if (map.current && router.current) {
                const start = center; // Use center instead of currentLocation

                const endPerson = persons.find((p) => p.id === destination);

                console.log("endPErson", endPerson);

                const end = {
                    lat: endPerson?.bbox[0],
                    lng: endPerson?.bbox[1],
                };

                const waypoint = selectedPersons.at(1)
                    ? {
                        lat: selectedPersons[1]?.bbox[0],
                        lng: selectedPersons[1]?.bbox[1],
                    }
                    : null;

                // Define avoid areas based on hazards
                const avoidAreas = hazards
                    .filter((h) => !avoidedHazards.includes(h.type))
                    .map((hazard) => {
                        const avoidAreaSize = 0.0005;
                        return `bbox:${hazard.location.lng - avoidAreaSize},${hazard.location.lat + avoidAreaSize},${hazard.location.lng + avoidAreaSize},${hazard.location.lat - avoidAreaSize}`;
                    })
                    .join("|");

                const routingParameters = {
                    routingMode: "fast",
                    transportMode: "pedestrian",
                    origin: `${start.lat},${start.lng}`,
                    destination: `${end.lat},${end.lng}`,
                    return: "polyline",
                    ...(waypoint && { via: `${waypoint.lat},${waypoint.lng}` }),
                    ...(avoidAreas && { "avoid[areas]": avoidAreas }),
                };

                const onResult = (result: any) => {
                    if (result.routes && result.routes.length > 0) {
                        const currentObjects = map.current?.getObjects();
                        if (currentObjects) {
                            currentObjects.forEach((object: any) => {
                                if (object instanceof H.map.Polyline) {
                                    map.current?.removeObject(object);
                                }
                            });
                        }

                        const route = result.routes[0];
                        route.sections.forEach((section: any) => {
                            const linestring =
                                H.geo.LineString.fromFlexiblePolyline(
                                    section.polyline
                                );
                            const routeLine = new H.map.Polyline(linestring, {
                                style: { strokeColor: "blue", lineWidth: 4 },
                                data: {},
                            });
                            map.current?.addObject(routeLine);
                            map.current?.getViewModel().setLookAtData({
                                bounds: routeLine.getBoundingBox()!,
                                zoom: 16,
                            });
                        });

                        // Calculate and set the rescue time
                        const totalDistance = result.routes[0].sections.reduce(
                            (acc: number, section: any) =>
                                acc + section.summary.length,
                            0
                        );
                        const estimatedTime =
                            calculateRescueTime(totalDistance);
                        setRescueTime(estimatedTime);
                    }
                };

                const onError = (error: unknown) => {
                    console.error("Error calculating route:", error);
                };

                router.current.calculateRoute(
                    routingParameters,
                    onResult,
                    onError
                );
            }
        },
        [center, selectedPersons, hazards, avoidedHazards]
    );

    // Load fake data
    // useEffect(() => {
    //     if (dataMode === "fake") {
    //         // Fake persons data with more spread out coordinates
    //         const fakePersons: Person[] = [
    //             {
    //                 id: "person1",
    //                 confidence: 0.95,
    //                 bbox: [35.7826, -78.6412, 0, 0], // Northwest of center
    //                 image: "base64_encoded_image_data_here",
    //                 timestamp: new Date().toISOString(),
    //             },
    //             {
    //                 id: "person2",
    //                 confidence: 0.88,
    //                 bbox: [35.7766, -78.6352, 0, 0], // Southeast of center
    //                 image: "base64_encoded_image_data_here",
    //                 timestamp: new Date().toISOString(),
    //             },
    //             {
    //                 id: "person3",
    //                 confidence: 0.92,
    //                 bbox: [35.7811, -78.6332, 0, 0], // East of center
    //                 image: "base64_encoded_image_data_here",
    //                 timestamp: new Date().toISOString(),
    //             },
    //         ];
    //         // setPersons(fakePersons);

    //         // Fake hazards data with more spread out coordinates
    //         const fakeHazards: Hazard[] = [
    //             {
    //                 id: "hazard1",
    //                 type: "power",
    //                 location: { lat: 35.7836, lng: -78.6422 }, // Northwest of center
    //                 severity: "Moderate",
    //                 details: "Potential structural damage detected",
    //                 createdBy: "AI System",
    //                 createdAt: new Date(),
    //             },
    //             {
    //                 id: "hazard2",
    //                 type: "fire",
    //                 location: { lat: 35.7756, lng: -78.6342 }, // Southeast of center
    //                 severity: "High",
    //                 details: "Active fire detected in residential area",
    //                 createdBy: "Thermal Sensor",
    //                 createdAt: new Date(),
    //             },
    //             {
    //                 id: "hazard3",
    //                 type: "power",
    //                 location: { lat: 35.7816, lng: -78.6302 }, // East of center
    //                 severity: "Low",
    //                 details: "Minor electrical issue reported",
    //                 createdBy: "Ground Team",
    //                 createdAt: new Date(),
    //             },
    //         ];
    //         setHazards(fakeHazards);

    //         // Fake drones data with more spread out coordinates
    //         const fakeDrones: Drone[] = [
    //             {
    //                 name: "Drone X123",
    //                 isConnected: true,
    //                 batteryLevel: 85,
    //                 location: { lat: 35.7826, lng: -78.6352 }, // Northeast of center
    //                 startingCoordinate: "35.7826, -78.6352",
    //                 timestamp: new Date().toISOString(),
    //             },
    //             {
    //                 name: "Drone Y456",
    //                 isConnected: true,
    //                 batteryLevel: 72,
    //                 location: { lat: 35.7766, lng: -78.6412 }, // Southwest of center
    //                 startingCoordinate: "35.7766, -78.6412",
    //                 timestamp: new Date().toISOString(),
    //             },
    //             {
    //                 name: "Drone Z789",
    //                 isConnected: true,
    //                 batteryLevel: 93,
    //                 location: { lat: 35.7796, lng: -78.6322 }, // East of center
    //                 startingCoordinate: "35.7796, -78.6322",
    //                 timestamp: new Date().toISOString(),
    //             },
    //         ];
    //         setDrones(fakeDrones);
    //     } else {
    //         // Clear fake data when in real mode
    //         setPersons([]);
    //         setHazards([]);
    //         setDrones([]);
    //     }
    // }, [dataMode]);

    const handleFloatingHazardClick = (type: "warning" | "fire") => {
        const hazard = hazards.find((h) => h.type === type);
        if (hazard && mapInstance) {
            handleHazardClick(hazard);
            mapInstance.getViewModel().setLookAtData({
                position: {
                    lat: hazard.location.lat,
                    lng: hazard.location.lng,
                },
                zoom: 16,
            });
        }
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
                {/* <div
                    className={cn(
                        "absolute right-4 top-16",
                        isDronesDeployed && "translate-x-[120%] transition-all"
                    )}
                >
                    <MapOverview />
                </div> */}
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
                            <Details
                                detailId="foo" // ! FIX ME
                                handleClose={handleCloseHumanPanel}
                                person={selectedPersons[0]}
                            />
                            <RescueWorkflow
                                rescueTime={persons.length * 8}
                                accuracy={rescueAccuracy}
                            />
                        </div>
                    </div>
                ) : null}

                {/* Right Sidebar */}
                <div
                    className={`pointer-events-auto absolute right-4 top-16 flex w-80 flex-col rounded-sm border-2 border-gray-400 bg-white shadow-lg transition-all duration-300 ease-in-out ${isRightPanelOpen ? "translate-x-0" : "translate-x-full"
                        }`}
                >
                    {selectedHazard && (
                        <div className="flex h-fit flex-col rounded-sm bg-white p-4">
                            <div className="mb-4 flex h-fit items-center justify-between bg-white">
                                <h2 className="text-xl font-bold">
                                    {selectedHazard.type === "power" ? (
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
                                    {selectedHazard.type === "power"
                                        ? "power"
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
                <HereMap
                    apikey={process.env.NEXT_PUBLIC_HERE_KEY as string}
                    center={center}
                    zoom={mapZoom}
                    setZoom={setMapZoom}
                    persons={persons}
                    hazards={hazards}
                    drones={drones}
                    handlePersonClick={handlePersonClick}
                    handleHazardClick={handleHazardClick}
                    handleDroneClick={handleDroneClick}
                    planHereRoute={planHereRoute}
                    displayedHazards={displayedHazards}
                    avoidedHazards={avoidedHazards}
                    setMapInstance={setMapInstance}
                    showDrones={showDrones}
                    showPeople={showPeople}
                    destinationId={destination}
                />
            </div>

            {isDronesDeployed && (
                <div className="absolute bottom-4 left-[340px] flex space-x-2 rounded-lg bg-white p-2 shadow-lg">
                    {["power", "fire"].map((hazardType, index) => (
                        <button
                            key={index}
                            className={`rounded-full p-2 ${hazardType === "power"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                } text-white`}
                            onClick={() =>
                                handleFloatingHazardClick(
                                    hazardType as "warning" | "fire"
                                )
                            }
                        >
                            {hazardType === "power" ? (
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
                        // planRescueRoute={planHereRoute}
                        selectMode={selectMode}
                        toggleSelectMode={toggleSelectMode}
                    />
                </div>
            )}

            <div className="absolute bottom-8 left-1/2 flex -translate-x-[50%] items-center space-x-2">
                <Input
                    className="w-[500px] text-lg"
                    placeholder="Interact with data..."
                    value={query}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleQuery(e.currentTarget.value);
                            setQuery("");
                        }
                    }}
                    onChange={handleInputChange}
                />
                {loading && (
                    <Loader2 className="size-8 animate-spin stroke-blue-500" />
                )}
            </div>
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
