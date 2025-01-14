import { useEffect, useState } from "react";
import Image from "next/image";
import { Drone } from "@/app/(layout)/dashboard/page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import axios from "axios";
import {
    Battery,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    BatteryWarning,
    Wifi,
    WifiOff,
    X,
} from "lucide-react";

interface DroneAssetsProps {
    onDeployDrones: () => void;
    isDronesDeployed: boolean;
    drones: Drone[];
    dataMode: "fake" | "real";
    socket: WebSocket;
}

export function DroneAssets({
    onDeployDrones,
    isDronesDeployed,
    drones,
    dataMode,
    socket,
}: DroneAssetsProps) {
    const [activeDrones, setActiveDrones] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(true);
    const [availableDrones, setAvailableDrones] = useState<Drone[]>([]);

    useEffect(() => {
        if (isDronesDeployed) {
            const timer = setTimeout(() => setIsVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isDronesDeployed]);

    useEffect(() => {
        if (dataMode === "real" && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ event: "GET_DRONES" }));
        }
    }, [dataMode, socket]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.event === "DRONE_LIST") {
                setAvailableDrones(data.drones);
            }
        };

        socket.addEventListener("message", handleMessage);

        return () => {
            socket.removeEventListener("message", handleMessage);
        };
    }, [socket]);

    const getBatteryIcon = (level: number) => {
        if (level > 90) return <BatteryFull />;
        if (level > 70) return <BatteryMedium />;
        if (level > 30) return <BatteryLow />;
        return <BatteryWarning />;
    };

    const handleClickDrone = (droneName: string) => {
        if (isDronesDeployed) {
            return;
        }

        setActiveDrones((prev) => {
            const output = [...prev];
            const index = prev.indexOf(droneName);

            if (index >= 0) {
                output.splice(index, 1);
            } else {
                output.push(droneName);
            }

            return output;
        });
    };

    // fetch drone data
    useEffect(() => {
        if (dataMode === "real") {
            const fetchDronesData = async () => {
                try {
                    // Fetching real-time data from the database
                    const response = await axios.get(
                        "http://localhost:8000/api/drone_status"
                    );
                    setAvailableDrones([response.data]); // Set the drone data to state
                } catch (error) {
                    console.error("Error fetching drone data:", error);
                }
            };

            // Polling the data every second
            const interval = setInterval(fetchDronesData, 1000);

            return () => clearInterval(interval); // Cleanup the interval
        }
    }, [dataMode]);

    const dronesToDisplay: Drone[] =
        drones.length > 0
            ? drones // Use the real-time data from the database
            : [
                  {
                      name: "Drone X123",
                      isConnected: true,
                      batteryLevel: 85,
                      location: { lat: 40.7128, lng: -74.006 },
                      startingCoordinate: "40.7128, -74.006",
                      timestamp: new Date().toISOString(),
                  },
                  {
                      name: "Drone Y456",
                      isConnected: true,
                      batteryLevel: 72,
                      location: { lat: 34.0522, lng: -118.2437 },
                      startingCoordinate: "34.0522, -118.2437",
                      timestamp: new Date().toISOString(),
                  },
                  {
                      name: "Drone Z789",
                      isConnected: true,
                      batteryLevel: 93,
                      location: { lat: 51.5074, lng: -0.1278 },
                      startingCoordinate: "51.5074, -0.1278",
                      timestamp: new Date().toISOString(),
                  },
                  {
                      name: "Drone A012",
                      isConnected: true,
                      batteryLevel: 64,
                      location: { lat: 35.6762, lng: 139.6503 },
                      startingCoordinate: "35.6762, 139.6503",
                      timestamp: new Date().toISOString(),
                  },
              ];

    useEffect(() => {
        setActiveDrones([]);
    }, [dataMode]);

    return (
        <div
            className={cn(
                "z-10 w-[300px] space-y-3 rounded-sm bg-white p-3 transition-all duration-500 ease-in-out",
                false && isDronesDeployed
                    ? "-translate-x-full opacity-0"
                    : "translate-x-0 opacity-100",
                "translate-x-0 opacity-100"
            )}
        >
            <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">Drone Assets</p>
            </div>
            <Separator className="my-1" />

            <div className="space-y-3">
                {dronesToDisplay.map((drone, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex cursor-pointer items-center space-x-3 rounded-lg border p-2",
                            activeDrones.includes(drone.name) && "bg-blue-200"
                        )}
                        onClick={() => handleClickDrone(drone.name)}
                    >
                        <Image
                            src="/drone.png"
                            alt={drone.name}
                            width={60}
                            height={60}
                            className="rounded-md"
                        />
                        <div className="flex-grow">
                            <h3 className="text-lg font-semibold">
                                {drone.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {drone.startingCoordinate ||
                                    "No starting coordinate"}
                            </p>
                            <div className="mt-1 flex items-center space-x-2">
                                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                    {drone.isConnected
                                        ? "Connected"
                                        : "Available"}
                                </span>
                                {drone.isConnected ? (
                                    <Wifi
                                        className="text-green-500"
                                        size={16}
                                    />
                                ) : (
                                    <WifiOff
                                        className="text-red-500"
                                        size={16}
                                    />
                                )}
                                {getBatteryIcon(drone.batteryLevel)}
                                <span className="text-xs">
                                    {drone.batteryLevel}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                <Button
                    className={cn(
                        "w-full bg-blue-500 text-white hover:bg-blue-600",
                        isDronesDeployed && "hidden"
                    )}
                    onClick={onDeployDrones}
                    disabled={isDronesDeployed || activeDrones.length <= 0}
                >
                    <p className="text-lg font-semibold">
                        Deploy Drones ({activeDrones.length})
                    </p>
                </Button>
            </div>
        </div>
    );
}
