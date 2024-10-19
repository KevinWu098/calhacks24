import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface DroneAssetsProps {
    onDeployDrones: () => void;
    isDronesDeployed: boolean;
}

export function DroneAssets({
    onDeployDrones,
    isDronesDeployed,
}: DroneAssetsProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (isDronesDeployed) {
            const timer = setTimeout(() => setIsVisible(false), 500); // Hide component after animation
            return () => clearTimeout(timer);
        }
    }, [isDronesDeployed]);

    if (!isVisible) return null;

    return (
        <div
            className={`z-10 w-[300px] space-y-3 rounded-sm bg-white p-3 transition-all duration-500 ease-in-out ${
                isDronesDeployed
                    ? "-translate-x-full opacity-0"
                    : "translate-x-0 opacity-100"
            }`}
        >
            <div className="space-y-1">
                <p className="text-lg font-semibold">Drone Assets</p>
                <Separator className="my-1" />
            </div>

            <div className="space-y-3">
                <div className="border-gray h-24 rounded-sm border-2 p-2">
                    foo
                </div>
                <div className="border-gray h-24 rounded-sm border-2 p-2">
                    foo
                </div>
                <div className="border-gray h-24 rounded-sm border-2 p-2">
                    foo
                </div>
                <div className="border-gray h-24 rounded-sm border-2 p-2">
                    foo
                </div>

                <Button
                    className="w-full bg-blue-400 p-2"
                    onClick={onDeployDrones}
                    disabled={isDronesDeployed}
                >
                    <p className="text-lg font-semibold">Deploy Drones (4)</p>
                </Button>
            </div>
        </div>
    );
}
