import Image from "next/image";
import { Separator } from "@/components/ui/separator";

export function NearbyHazards() {
    return (
        <div className="max-w-[500px] space-y-4 rounded-sm border-2 border-gray-400 bg-white p-3">
            <div className="space-y-1">
                <p className="font-semibold">Nearby Hazards</p>
                <Separator />
            </div>

            <div className="grid grid-cols-3 space-x-3">
                <div className="space-y-1 rounded-sm border-2 border-gray-400 p-2">
                    {/* <Image /> */}
                    <div className="h-28 rounded-sm bg-gray-400" />
                    <div className="space-y-1">
                        <p className="line-clamp-1 overflow-hidden text-ellipsis font-semibold leading-none">
                            Downed Power Line
                        </p>
                        <p className="text-sm leading-none">UAV 234</p>
                    </div>
                </div>
                <div className="space-y-1 rounded-sm border-2 border-gray-400 p-2">
                    {/* <Image /> */}
                    <div className="h-28 rounded-sm bg-gray-400" />
                    <div className="space-y-1">
                        <p className="line-clamp-1 overflow-hidden text-ellipsis font-semibold leading-none">
                            Downed Power Line
                        </p>
                        <p className="text-sm leading-none">UAV 234</p>
                    </div>
                </div>
                <div className="space-y-1 rounded-sm border-2 border-gray-400 p-2">
                    {/* <Image /> */}
                    <div className="h-28 rounded-sm bg-gray-400" />
                    <div className="space-y-1">
                        <p className="line-clamp-1 overflow-hidden text-ellipsis font-semibold leading-none">
                            Downed Power Line
                        </p>
                        <p className="text-sm leading-none">UAV 234</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
