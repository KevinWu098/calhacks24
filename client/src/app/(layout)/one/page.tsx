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
    const [center] = useState({ lat: 37.784161, lng: -122.403549 });
    const [isDronesDeployed, setIsDronesDeployed] = useState(false);
    const [mapZoom, setMapZoom] = useState(12);
    const [mapInstance, setMapInstance] = useState<H.Map | null>(null);

    const handleDeployDrones = useCallback(() => {
        setIsDronesDeployed(true);
        socket.send(JSON.stringify({ event: "DEPLOY" }));

        // Set timer to add person 7 seconds after drone deployment
        setTimeout(() => {
            const newPerson: Person = {
                id: "single-person",
                confidence: 0.95,
                bbox: [37.784161, -122.403549, 0, 0],
                image: "",
                timestamp: new Date().toISOString(),
            };
            setPersons([newPerson]);
        }, 5000);
    }, []);

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
                />
            </div>
        </div>
    );
}
