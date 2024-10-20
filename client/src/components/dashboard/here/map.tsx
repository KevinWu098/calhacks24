"use client";

import React, { useEffect, useRef, useState } from "react";
import H from "@here/maps-api-for-javascript";

export const HereMap = ({ apikey }: { apikey: string }) => {
    const mapRef = useRef(null);
    const map = useRef<H.Map | null>(null);
    const platform = useRef<H.service.Platform | null>(null);
    const router = useRef<H.service.RoutingService | null>(null);

    useEffect(() => {
        if (!map.current) {
            platform.current = new H.service.Platform({
                apikey,
            });

            const defaultLayers = platform.current.createDefaultLayers();

            // Create a new map instance
            const newMap = new H.Map(
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
            const behavior = new H.mapevents.Behavior(
                new H.mapevents.MapEvents(newMap)
            );

            H.ui.UI.createDefault(newMap, defaultLayers);

            map.current = newMap;

            // Initialize routing service
            router.current = platform.current.getRoutingService(null, 8);

            // Define the two main markers
            const markers = [
                {
                    lat: 37.78180695689574,
                    lng: -122.3883965072328,
                },
                {
                    lat: 37.771009206167854,
                    lng: -122.39335969355355,
                },
            ];

            // Calculate the midpoint for the third marker
            const thirdMarker = {
                lat: (markers[0].lat + markers[1].lat) / 2 - 0.004,
                lng: (markers[0].lng + markers[1].lng) / 2 + 0.0009,
            };

            // Add markers and route
            addMarkersAndRoute(newMap, markers, thirdMarker);
        }
    }, [apikey]);

    const addMarkersAndRoute = (mapInstance, markerData, thirdMarker) => {
        // Remove existing markers and routes
        mapInstance.getObjects().forEach((obj) => {
            if (obj instanceof H.map.Marker || obj instanceof H.map.Polyline) {
                mapInstance.removeObject(obj);
            }
        });

        // Add the main markers
        const markerObjects = markerData.map(({ lat, lng }) => {
            const marker = new H.map.Marker({ lat, lng });
            mapInstance.addObject(marker);
            return { lat, lng };
        });

        // Add the third marker
        const avoidanceMarker = new H.map.Marker(thirdMarker);
        mapInstance.addObject(avoidanceMarker);

        // Calculate and display the route avoiding the third marker
        if (markerObjects.length === 2) {
            const [start, end] = markerObjects;

            // Define an avoidance area around the third marker
            const avoidAreaSize = 0.0005;
            const avoidArea = {
                topLeft: {
                    lat: thirdMarker.lat + avoidAreaSize,
                    lng: thirdMarker.lng - avoidAreaSize,
                },
                bottomRight: {
                    lat: thirdMarker.lat - avoidAreaSize,
                    lng: thirdMarker.lng + avoidAreaSize,
                },
            };

            // Create a routing request with updated parameters
            const routingParameters: H.service.ServiceParameters = {
                routingMode: "fast",
                transportMode: "car",
                origin: `${start.lat},${start.lng}`,
                destination: `${end.lat},${end.lng}`,
                return: "polyline",
                "avoid[areas]": `bbox:${avoidArea.topLeft.lng},${avoidArea.topLeft.lat},${avoidArea.bottomRight.lng},${avoidArea.bottomRight.lat}`,
            };

            // Callback function for successful route calculation
            const onResult = (result) => {
                if (result.routes && result.routes.length > 0) {
                    console.log(result);
                    const route = result.routes[0];

                    route.sections.forEach((section) => {
                        // Decode the route geometry
                        const linestring =
                            H.geo.LineString.fromFlexiblePolyline(
                                section.polyline
                            );

                        // Create a polyline to display the route
                        const routeLine = new H.map.Polyline(linestring, {
                            style: { strokeColor: "blue", lineWidth: 4 },
                        });

                        // Add the route polyline to the map
                        mapInstance.addObject(routeLine);

                        // Zoom the map to fit the route
                        mapInstance.getViewModel().setLookAtData({
                            bounds: routeLine.getBoundingBox(),
                        });
                    });
                }
            };

            // Callback function for route calculation error
            const onError = (error) => {
                console.error("Error calculating route: ", error);
            };

            // Request a route from HERE API
            router.current?.calculateRoute(
                routingParameters,
                onResult,
                onError
            );
        }
    };

    // Return a div element to hold the map
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
