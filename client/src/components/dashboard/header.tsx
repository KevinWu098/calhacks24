import { Wifi, WifiOff } from "lucide-react";

interface HeaderProps {
    isConnected: boolean;
}

export function Header({ isConnected }: HeaderProps) {
    return (
        <div className="flex-between absolute top-0 h-12 w-full border-b bg-white px-4 py-2">
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
        </div>
    );
}
