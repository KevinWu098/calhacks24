import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    FullscreenIcon,
    MapPinIcon,
    PencilRulerIcon,
    Wifi,
    WifiOff,
} from "lucide-react";

interface HeaderProps {
    isConnected: boolean;
    dataMode: "fake" | "real";
    toggleDataMode: () => void;
}

export function Nav({ isConnected, dataMode, toggleDataMode }: HeaderProps) {
    return (
        <div className="flex-between h-12 flex-row bg-white p-2 px-4">
            <div className="flex h-full flex-row items-center space-x-2">
                <FullscreenIcon className="size-5" />
                <Separator
                    orientation="vertical"
                    className="h-5 bg-black"
                />
            </div>

            <div className="absolute left-1/2 clear-start flex -translate-x-[50%] flex-row space-x-2">
                <div className="flex h-7 flex-row items-center space-x-1 rounded-sm bg-gray-600 p-2">
                    <MapPinIcon className="size-4 stroke-white" />
                    <p className="text-sm text-white">Satellite</p>
                </div>

                <div className="flex h-7 flex-row items-center space-x-1 rounded-sm bg-gray-600 p-2">
                    <MapPinIcon className="size-4 stroke-white" />
                    <p className="text-sm text-white">Depth Imagery</p>
                </div>

                <div className="flex h-7 flex-row items-center space-x-1 rounded-sm bg-gray-600 p-2">
                    <PencilRulerIcon className="size-4 stroke-white" />
                    <p className="text-sm text-white">Elevation</p>
                </div>
            </div>

            <div className="flex-between h-10 w-full border-b bg-white px-4 py-2">
                <div className="flex items-center space-x-2">
                    {isConnected ? (
                        <Wifi
                            className="text-green-500"
                            size={24}
                        />
                    ) : (
                        <WifiOff
                            className="text-red-500"
                            size={24}
                        />
                    )}
                    <span
                        className={`font-semibold ${
                            isConnected ? "text-green-500" : "text-red-500"
                        }`}
                    >
                        {isConnected ? "Connected" : "Disconnected"}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Live Data</span>
                    <Switch
                        checked={dataMode === "real"}
                        onCheckedChange={() => toggleDataMode()}
                    />
                </div>
            </div>
        </div>
    );
}
