import { useEffect, useRef } from "react";
import { Hazard, Person } from "@/app/(layout)/dashboard/page";
import {
    Circle,
    GoogleMap,
    Marker,
    useLoadScript,
} from "@react-google-maps/api";

interface MapProps {
    center: { lat: number; lng: number };
    zoom: number;
    setZoom: (zoom: number) => void;
    currentLocation: { lat: number; lng: number } | null;
    persons: Person[];
    hazards: Hazard[];
    drones: { name: string; location: { lat: number; lng: number } }[];
    handlePersonClick: (person: Person) => void;
    handleHazardClick: (hazard: Hazard) => void;
    handleDroneClick: (droneName: string) => void;
    onMapLoad: (map: google.maps.Map) => void;
    rescueRoute: google.maps.LatLng[];
    selectMode: boolean;
    selectedPersons: Person[];
}

export function Map({
    center,
    zoom,
    setZoom,
    currentLocation,
    persons,
    hazards,
    drones,
    handlePersonClick,
    handleHazardClick,
    handleDroneClick,
    onMapLoad,
    rescueRoute,
    selectMode,
    selectedPersons,
}: MapProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string, // type cast
    });

    const mapRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        if (isLoaded && currentLocation && mapRef.current) {
            mapRef.current.panTo(currentLocation);
            mapRef.current.setZoom(15);
        }
    }, [isLoaded, currentLocation]);

    const handleMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
        onMapLoad(map);
    };

    useEffect(() => {
        if (mapRef.current && rescueRoute.length > 0) {
            const rescueRoutePath = new google.maps.Polyline({
                path: rescueRoute,
                geodesic: true,
                strokeColor: "#FF0000",
                strokeOpacity: 1.0,
                strokeWeight: 2,
            });
            rescueRoutePath.setMap(mapRef.current);

            return () => {
                rescueRoutePath.setMap(null);
            };
        }
    }, [mapRef, rescueRoute]);

    if (!isLoaded) {
        return (
            <div className="absolute inset-0 -z-10 flex h-full items-center justify-center">
                <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-0">
            <GoogleMap
                mapContainerClassName="w-full h-full"
                center={center}
                zoom={zoom}
                mapTypeId="satellite"
                onLoad={handleMapLoad}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    // animation: google.maps.Animation.SMOOTH,
                }}
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
                            onClick={() => handleDroneClick("You")}
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
                                hazard.type === "warning" ? "yellow" : "red",
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 2,
                            scale: 8,
                        }}
                    />
                ))}

                {persons.map((person) => (
                    <Marker
                        key={person.id}
                        position={{
                            lat: person.bbox[0],
                            lng: person.bbox[1],
                        }}
                        onClick={() => handlePersonClick(person)}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: selectedPersons.some(
                                (p) => p.id === person.id
                            )
                                ? "blue"
                                : "lightblue",
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 2,
                            scale: 8,
                        }}
                    />
                ))}

                {drones.map((drone, index) => (
                    <Marker
                        key={`drone-${index}`}
                        position={drone.location}
                        onClick={() => handleDroneClick(drone.name)}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: "lime",
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 2,
                            scale: 8,
                        }}
                    />
                ))}
            </GoogleMap>
        </div>
    );
}
