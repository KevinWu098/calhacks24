"use client";

import React, { useEffect, useRef } from "react";
import { Drone, Hazard, Person } from "@/app/(layout)/dashboard/page";
import H from "@here/maps-api-for-javascript";
import { FlameIcon } from "lucide-react";

interface MapProps {
    apikey: string;
    center: { lat: number; lng: number };
    zoom: number;
    setZoom: (zoom: number) => void;
    currentLocation: { lat: number; lng: number } | null;
    persons: Person[];
    hazards: Hazard[];
    planHereRoute: (map: any, route: any) => void;
    drones: Drone[];
    handlePersonClick: (person: Person) => void;
    handleHazardClick: (hazard: Hazard) => void;
    handleDroneClick: (droneName: string) => void;
}

export const HereMap = ({
    apikey,
    center: _center,
    zoom: _zoom,
    setZoom,
    currentLocation,
    persons,
    hazards,
    drones,
    planHereRoute,
    handlePersonClick,
    handleHazardClick,
    handleDroneClick,
}: MapProps) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const map = useRef<H.Map | null>(null);
    const platform = useRef<H.service.Platform | null>(null);
    const behavior = useRef<H.mapevents.Behavior | null>(null);
    const ui = useRef<H.ui.UI | null>(null);
    const router = useRef<H.service.RoutingService | null>(null);

    useEffect(() => {
        if (!map.current && mapRef.current) {
            platform.current = new H.service.Platform({
                apikey: apikey,
            });

            const defaultLayers: any = platform.current.createDefaultLayers();

            // Create a new map instance
            map.current = new H.Map(
                mapRef.current,
                defaultLayers.vector.normal.map, // Use vector map layer
                {
                    zoom: 15,
                    center: {
                        lat: 37.776, // Center the map between the two markers
                        lng: -122.391,
                    },
                }
            );

            // Enable map interactions
            behavior.current = new H.mapevents.Behavior(
                new H.mapevents.MapEvents(map.current)
            );

            H.ui.UI.createDefault(map.current, defaultLayers);

            router.current = platform.current.getRoutingService(undefined, 8);

            map.current.addEventListener("mapviewchangeend", () => {
                setZoom(map.current!.getZoom());
            });
        }

        return () => {
            if (map.current) {
                map.current.dispose();
                map.current = null;
            }
        };
    }, [apikey, setZoom]);

    // Pan to current location when it changes
    useEffect(() => {
        if (currentLocation && map.current) {
            map.current.setCenter(currentLocation);
            map.current.setZoom(15);
        }
    }, [currentLocation]);

    useEffect(() => {
        if (map.current) {
            planHereRoute(map, router);
        }
    }, [planHereRoute]);

    useEffect(() => {
        if (map.current) {
            map.current.getObjects().forEach((obj) => {
                if (obj.getData && obj.getData() === "marker") {
                    map.current!.removeObject(obj);
                }
            });

            if (currentLocation) {
                const currentLocationMarker = new H.map.Marker(currentLocation);

                currentLocationMarker.setData("marker");
                currentLocationMarker.addEventListener("tap", () => {
                    handleDroneClick("You");
                });

                map.current.addObject(currentLocationMarker);
            }

            persons.forEach((person) => {
                const icon = new H.map.Icon("/location-man.svg", {
                    size: { w: 32, h: 32 },
                });

                const personMarker = new H.map.Marker(
                    { lat: person.bbox[0], lng: person.bbox[1] },
                    {
                        icon: icon,
                        data: {},
                    }
                );
                personMarker.setData("marker");
                personMarker.addEventListener("tap", () => {
                    handlePersonClick(person);
                    map.current?.getViewModel().setLookAtData({
                        position: {
                            lat: person.bbox[0] - 0.001,
                            lng: person.bbox[1] + 0.0035,
                        },
                        zoom: 16,
                    });
                });

                map.current!.addObject(personMarker);
            });

            // Add hazard markers
            hazards.forEach((hazard) => {
                const flameIcon = new H.map.Icon("/flame.svg", {
                    size: { w: 32, h: 32 },
                });
                const powerIcon = new H.map.Icon("/utility-pole.svg", {
                    size: { w: 32, h: 32 },
                });

                // Create a marker with the custom icon
                const hazardMarker = new H.map.Marker(hazard.location, {
                    icon: hazard.type === "fire" ? flameIcon : powerIcon,
                    data: {},
                });

                hazardMarker.setData("marker");
                hazardMarker.addEventListener("tap", () => {
                    handleHazardClick(hazard);
                    map.current?.getViewModel().setLookAtData({
                        position: {
                            lat: hazard.location.lat + 0.001,
                            lng: hazard.location.lng - 0.0035,
                        },
                        zoom: 16,
                    });
                });

                map.current!.addObject(hazardMarker);
            });

            drones.forEach((drone) => {
                const icon = new H.map.Icon("/drone.svg", {
                    size: { w: 32, h: 32 },
                });

                const droneMarker = new H.map.Marker(drone.location, {
                    icon: icon,
                    data: {},
                });
                droneMarker.setData("marker");
                droneMarker.addEventListener("tap", () => {
                    handleDroneClick(drone.name);
                });

                map.current!.addObject(droneMarker);
            });
        }
    }, [
        currentLocation,
        persons,
        hazards,
        drones,
        handleDroneClick,
        handlePersonClick,
        handleHazardClick,
    ]);

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
            }}
            ref={mapRef}
        />
    );
};
