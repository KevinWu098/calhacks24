import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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

interface Drone {
    name: string;
    isConnected: boolean;
    batteryLevel: number;
    startingCoordinate: string;
}

interface DroneAssetsProps {
    onDeployDrones: () => void;
    isDronesDeployed: boolean;
    drones: Drone[];
    dataMode: "fake" | "real";
}

export function DroneAssets({
    onDeployDrones,
    isDronesDeployed,
    drones,
    dataMode,
}: DroneAssetsProps) {
    const [activeDrones, setActiveDrones] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (isDronesDeployed) {
            const timer = setTimeout(() => setIsVisible(false), 500); // Hide component after animation
            return () => clearTimeout(timer);
        }
    }, [isDronesDeployed]);

    // if (!isVisible) return null;

    const getBatteryIcon = (level: number) => {
        if (level > 90) return <BatteryFull />;
        if (level > 70) return <BatteryMedium />;
        if (level > 30) return <BatteryLow />;
        return <BatteryWarning />;
    };

    const handleClickDrone = (droneName: string) => {
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

    const dronesToDisplay =
        dataMode === "fake" && drones.length === 0
            ? [
                  {
                      name: "Drone X123",
                      isConnected: true,
                      batteryLevel: 85,
                      startingCoordinate: "40.7128° N, 74.0060° W",
                  },
                  {
                      name: "Drone Y456",
                      isConnected: true,
                      batteryLevel: 72,
                      startingCoordinate: "34.0522° N, 118.2437° W",
                  },
                  {
                      name: "Drone Z789",
                      isConnected: true,
                      batteryLevel: 93,
                      startingCoordinate: "51.5074° N, 0.1278° W",
                  },
                  {
                      name: "Drone A012",
                      isConnected: true,
                      batteryLevel: 64,
                      startingCoordinate: "35.6762° N, 139.6503° E",
                  },
              ]
            : drones;

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
                                {drone.startingCoordinate}
                            </p>
                            <div className="mt-1 flex items-center space-x-2">
                                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                    Active
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
                    className="w-full bg-blue-500 text-white hover:bg-blue-600"
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
