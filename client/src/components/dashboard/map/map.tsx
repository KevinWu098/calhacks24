import { Hazard, Person } from "@/app/(layout)/dashboard/page";
import {
    Circle,
    GoogleMap,
    Marker,
    useLoadScript,
} from "@react-google-maps/api";

interface MapProps {
    center: { lat: number; lng: number };
    currentLocation: { lat: number; lng: number } | null;
    persons: Person[];
    hazards: Hazard[];
    handlePersonClick: (person: Person) => void;
    handleHazardClick: (hazard: Hazard) => void;
    handleDroneClick: VoidFunction;
    onMapLoad: (map: google.maps.Map) => void;
}

export function Map({
    center,
    currentLocation,
    persons,
    hazards,
    handlePersonClick,
    handleHazardClick,
    handleDroneClick,
    onMapLoad,
}: MapProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string, // type cast
    });

    if (!isLoaded) {
        return (
            <div className="absolute inset-0 flex h-full items-center justify-center">
                <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0">
            <GoogleMap
                mapContainerClassName="w-full h-full"
                center={center}
                zoom={14}
                mapTypeId="satellite"
                onLoad={onMapLoad}
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
                            onClick={handleDroneClick}
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

                {persons.map((person, index) => (
                    <Marker
                        key={index}
                        position={{
                            lat: person.bbox[0],
                            lng: person.bbox[1],
                        }}
                        onClick={() => handlePersonClick(person)}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: "blue",
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
