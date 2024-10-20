import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

interface DetailsProps {
    handleClose: VoidFunction;
}

export function Details({ handleClose }: DetailsProps) {
    return (
        <div className="max-w-[500px] space-y-4 rounded-sm border-2 border-gray-400 bg-white p-3">
            <div className="space-y-1">
                <div className="flex-between">
                    <p className="font-semibold">Human Detection</p>
                    <X
                        onClick={handleClose}
                        className="cursor-pointer"
                    />
                </div>
                <Separator />
            </div>

            <div className="space-y-4">
                <div className="h-[200px] rounded-sm bg-gray-400" />

                <div className="flex-between">
                    <div>
                        <p className="text-xl font-semibold">
                            Human in the forest
                        </p>
                        <p className="text-gray-500">ID: HUM423</p>
                    </div>

                    <div className="mb-auto flex h-5 w-fit items-center rounded-sm bg-[#FFCECE] p-3 text-sm font-medium text-[#BF0000]">
                        Severe
                    </div>
                </div>

                <div className="grid grid-cols-2 grid-rows-2 gap-3">
                    <div className="space-y-1">
                        <p className="text-lg leading-none text-gray-500">
                            Location
                        </p>
                        <p className="line-clamp-1 text-ellipsis text-lg font-semibold leading-none">
                            37.7843° N, 122.4034° W
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg leading-none text-gray-500">
                            Last taken
                        </p>
                        <p className="line-clamp-1 text-ellipsis text-lg font-semibold leading-none">
                            3 min ago by Cadet Daniels
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg leading-none text-gray-500">
                            Condition
                        </p>
                        <p className="line-clamp-1 text-ellipsis text-lg font-semibold leading-none">
                            Distress signals
                        </p>
                    </div>
                </div>
            </div>

            <Separator className="bg-black" />

            <div className="space-y-1">
                <p className="text-lg leading-none text-gray-500">Details</p>
                <p className="max-w-[500px] text-lg font-semibold leading-none">
                    Human appears to be trapped inside of a home. The
                    neighboring power lines appear to be down.
                </p>
            </div>
        </div>
    );
}
