import { Drone } from "@/app/(layout)/dashboard/page";
import {
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    BatteryWarning,
    Diamond,
    Plane,
} from "lucide-react";

interface ActiveDronesProps {
    drones: Drone[];
    handleDroneClick: () => void;
}

export function ActiveDrones({ drones, handleDroneClick }: ActiveDronesProps) {
    const getBatteryIcon = (level: number) => {
        if (level > 90) return <BatteryFull />;
        if (level > 70) return <BatteryMedium />;
        if (level > 30) return <BatteryLow />;
        return <BatteryWarning />;
    };

    return (
        <div className="border-t p-4">
            <h2 className="mb-4 flex items-center text-xl font-bold">
                <Plane
                    className="mr-2"
                    size={24}
                />
                Active Drones
            </h2>
            {drones.map((drone, index) => (
                <div
                    key={index}
                    className="mb-2 flex cursor-pointer items-center justify-between rounded-lg bg-gray-100 p-3 transition-colors duration-200 hover:bg-gray-200"
                    onClick={handleDroneClick}
                >
                    <div className="flex items-center">
                        <Diamond
                            fill="currentColor"
                            size={20}
                            className="mr-2 text-blue-500"
                        />
                        <span>{drone.name}</span>
                    </div>
                    <div className="flex items-center">
                        {drone.isConnected && (
                            <div className="group relative">
                                {getBatteryIcon(drone.batteryLevel)}
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 transform rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    {drone.batteryLevel}%
                                </span>
                            </div>
                        )}
                        <div
                            className={`ml-2 h-3 w-3 rounded-full ${
                                drone.isConnected
                                    ? "animate-pulse bg-green-500"
                                    : "bg-red-500"
                            }`}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
