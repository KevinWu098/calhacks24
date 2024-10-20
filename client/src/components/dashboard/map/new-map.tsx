"use client";

import React, { useEffect, useRef } from "react";
import { Drone, Hazard, Person } from "@/app/(layout)/dashboard/page";
import H from "@here/maps-api-for-javascript";

interface MapProps {
    apikey: string;
    center: { lat: number; lng: number };
    zoom: number;
    setZoom: (zoom: number) => void;
    persons: Person[];
    hazards: Hazard[];
    planHereRoute: (map: any, route: any) => void;
    drones: Drone[];
    handlePersonClick: (person: Person) => void;
    handleHazardClick: (hazard: Hazard) => void;
    handleDroneClick: (droneName: string) => void;
    displayedHazards: string[];
    avoidedHazards: string[];
    setMapInstance: (map: H.Map) => void;
    showDrones: boolean;
    showPeople: boolean;
    destinationId: string | undefined;
}

export const HereMap = ({
    apikey,
    center: _center,
    zoom: _zoom,
    setZoom,
    persons,
    hazards,
    drones,
    planHereRoute,
    handlePersonClick,
    handleHazardClick,
    handleDroneClick,
    displayedHazards,
    avoidedHazards,
    setMapInstance,
    showPeople,
    showDrones,
    destinationId,
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
                    zoom: 14, // Adjust initial zoom level
                    center: _center, // Use the provided center
                }
            );

            setMapInstance(map.current); // Set the map instance

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
    }, [apikey, setZoom, _center, setMapInstance]);

    // Pan to center when it changes
    useEffect(() => {
        if (map.current) {
            map.current.setCenter(_center);
            map.current.setZoom(15);
        }
    }, [_center]);

    useEffect(() => {
        if (map.current) {
            console.log("in useeffect");
            planHereRoute(map, router);
        }
    }, [planHereRoute, destinationId, avoidedHazards]);

    useEffect(() => {
        if (map.current) {
            map.current.getObjects().forEach((obj) => {
                if (obj.getData && obj.getData() === "marker") {
                    map.current?.removeObject(obj);
                }
            });

            if (_center) {
                const centerMarker = new H.map.Marker(_center);

                centerMarker.setData("marker");
                centerMarker.addEventListener("tap", () => {
                    handleDroneClick("You");
                });

                map.current.addObject(centerMarker);
            }

            showPeople &&
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
            hazards
                .filter(
                    (h) =>
                        displayedHazards[0] === "all" ||
                        displayedHazards.includes(h.type)
                )
                .forEach((hazard) => {
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

            showDrones &&
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
    }, [_center, persons, hazards, drones, displayedHazards]);

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
