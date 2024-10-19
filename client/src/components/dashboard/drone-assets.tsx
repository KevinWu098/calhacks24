import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Battery, Wifi, WifiOff, X } from "lucide-react";

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
}

export function DroneAssets({
    onDeployDrones,
    isDronesDeployed,
    drones,
}: DroneAssetsProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (isDronesDeployed) {
            const timer = setTimeout(() => setIsVisible(false), 500); // Hide component after animation
            return () => clearTimeout(timer);
        }
    }, [isDronesDeployed]);

    if (!isVisible) return null;

    const getBatteryIcon = (level: number) => {
        if (level > 75) return <Battery />;
        if (level > 50) return <Battery className="text-yellow-500" />;
        if (level > 25) return <Battery className="text-orange-500" />;
        return <Battery className="text-red-500" />;
    };

    return (
        <div
            className={`z-10 w-[300px] space-y-3 rounded-sm bg-white p-3 transition-all duration-500 ease-in-out ${
                isDronesDeployed
                    ? "-translate-x-full opacity-0"
                    : "translate-x-0 opacity-100"
            }`}
        >
            <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">Drone Assets</p>
                <X className="cursor-pointer text-gray-500 hover:text-gray-700" />
            </div>
            <Separator className="my-1" />

            <div className="space-y-3">
                {drones.map((drone, index) => (
                    <div
                        key={index}
                        className="flex items-center space-x-3 rounded-lg border p-2"
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
                    disabled={isDronesDeployed}
                >
                    <p className="text-lg font-semibold">
                        Deploy Drones ({drones.length})
                    </p>
                </Button>
            </div>
        </div>
    );
}
