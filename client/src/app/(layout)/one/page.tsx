"use client";

import { useCallback, useEffect, useState } from "react";
import { Drone, Hazard, Person } from "@/app/(layout)/dashboard/page";
import { DroneAssets } from "@/components/dashboard/drone-assets";
import { HereMap } from "@/components/dashboard/map/new-map";
import { Nav } from "@/components/dashboard/nav";
import { calculateRescueTime } from "@/lib/utils";

const socket = new WebSocket("ws://localhost:8000/ws");

export default function OnePage() {
    const [persons, setPersons] = useState<Person[]>([]);
    const [center, setCenter] = useState({ lat: 0, lng: 0 });
    const [isDronesDeployed, setIsDronesDeployed] = useState(false);
    const [mapZoom, setMapZoom] = useState(12);
    const [mapInstance, setMapInstance] = useState<H.Map | null>(null);
    // Add these new state variables
    const [showDrones, setShowDrones] = useState(true);
    const [showPeople, setShowPeople] = useState(true);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setCenter({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            });
        }
    }, []);

    const handleDeployDrones = useCallback(() => {
        setIsDronesDeployed(true);
        // socket.send(JSON.stringify({ event: "DEPLOY" }));

        console.log("Deploying drones");
        // Set timer to add person 5 seconds after drone deployment
        setTimeout(() => {
            console.log("Adding person");
            const newPerson: Person = {
                id: "single-person",
                confidence: 0.95,
                bbox: [center.lat, center.lng + 0.0002, 0, 0], // Slightly to the right of center
                image: "",
                timestamp: new Date().toISOString(),
            };
            setPersons([newPerson]);
        }, 5000);
    }, [center]);

    const handlePersonClick = useCallback(
        (person: Person) => {
            if (mapInstance) {
                mapInstance.setCenter({
                    lat: person.bbox[0],
                    lng: person.bbox[1],
                });
                mapInstance.setZoom(16);
            }
        },
        [mapInstance]
    );

    const planHereRoute = useCallback(() => {
        // This function is left empty as we're not showing the rescue workflow
    }, []);

    return (
        <div className="relative h-full w-full overflow-hidden bg-gray-100 text-gray-800">
            <div className="relative z-10">
                <Nav
                    isConnected={true}
                    dataMode="fake"
                    toggleDataMode={() => {}}
                />

                <div className="pointer-events-auto absolute left-4 top-16 z-20">
                    <DroneAssets
                        onDeployDrones={handleDeployDrones}
                        isDronesDeployed={isDronesDeployed}
                        drones={[]}
                        dataMode="fake"
                        socket={socket}
                    />
                </div>
            </div>

            <div className="absolute inset-0 z-0">
                <HereMap
                    apikey={process.env.NEXT_PUBLIC_HERE_KEY as string}
                    center={center}
                    zoom={mapZoom}
                    setZoom={setMapZoom}
                    persons={persons}
                    hazards={[]}
                    drones={[]}
                    handlePersonClick={handlePersonClick}
                    handleHazardClick={() => {}}
                    handleDroneClick={() => {}}
                    planHereRoute={planHereRoute}
                    displayedHazards={[]}
                    avoidedHazards={[]}
                    setMapInstance={setMapInstance}
                    showDrones={showDrones}
                    showPeople={showPeople}
                    destinationId={undefined}
                />
            </div>
        </div>
    );
}
