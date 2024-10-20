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
                mapTypeId="roadmap"
                onLoad={handleMapLoad}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    clickableIcons: false,
                    mapId: null,
                    styles: [
                        {
                            elementType: "labels",
                            stylers: [{ visibility: "off" }],
                        },
                    ],
                    // animation: google.maps.Animation.SMOOTH,
                }}
            >
                {currentLocation && (
                    <>
                        {/* <Circle
                            center={currentLocation}
                            radius={50}
                            options={{
                                fillColor: "#10B981",
                                fillOpacity: 0.3,
                                strokeColor: "#10B981",
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                            }}
                        /> */}
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
                        key={hazard.id}
                        position={hazard.location}
                        onClick={() => handleHazardClick(hazard)}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor:
                                hazard.type === "warning" ? "orange" : "red",
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
                            path: `M25 9.04761C25.8462 9.04761 26.6577 9.38375 27.256 9.98208C27.8543 10.5804 28.1905 11.3919 28.1905 12.2381C28.1905 13.0843 27.8543 13.8958 27.256 14.4941C26.6577 15.0924 25.8462 15.4286 25 15.4286C24.1538 15.4286 23.3423 15.0924 22.744 14.4941C22.1457 13.8958 21.8095 13.0843 21.8095 12.2381C21.8095 11.3919 22.1457 10.5804 22.744 9.98208C23.3423 9.38375 24.1538 9.04761 25 9.04761ZM22.6071 17.0238H27.3929C28.239 17.0238 29.0505 17.3599 29.6489 17.9583C30.2472 18.5566 30.5833 19.3681 30.5833 20.2143V28.9881H28.1905V40.9524H21.8095V28.9881H19.4167V20.2143C19.4167 19.3681 19.7528 18.5566 20.3511 17.9583C20.9495 17.3599 21.761 17.0238 22.6071 17.0238Z`,
                            fillColor: "#FFCDA1",
                            fillOpacity: 1,
                            strokeColor: "black",
                            strokeWeight: 2,
                        }}
                    />
                ))}

                {/* {drones.map((drone, index) => (
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
                ))} */}
            </GoogleMap>
        </div>
    );
}
