import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function DroneAssets() {
    return (
        <div className="z-10 w-[300px] space-y-3 rounded-sm bg-white p-3">
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

                <Button className="w-full bg-blue-400 p-2">
                    <p className="text-lg font-semibold">Deploy Drones (4)</p>
                </Button>
            </div>
        </div>
    );
}
