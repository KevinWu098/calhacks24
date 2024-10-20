import { Separator } from "@/components/ui/separator";

interface RescueWorkflowProps {
    rescueTime: number;
    accuracy: number;
}

export function RescueWorkflow({ rescueTime, accuracy }: RescueWorkflowProps) {
    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        return hours > 0
            ? `${hours} hr ${remainingMinutes} min`
            : `${remainingMinutes} min`;
    };

    return (
        <div className="w-full max-w-[500px] rounded-md border-2 border-gray-400 bg-white p-3">
            <div>
                <p className="font-semibold">Rescue Workflow</p>
                <Separator className="my-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 py-4">
                <div className="col-span-3 flex h-8 w-fit items-center justify-center rounded-sm bg-[#DBF2D9] px-3 text-sm font-medium text-[#289223]">
                    On Time
                </div>

                <div className="space-y-1">
                    <p className="text-sm leading-none text-gray-400">
                        Estimated Time
                    </p>
                    <p className="text-xl font-bold leading-none">
                        {formatTime(rescueTime)}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm leading-none text-gray-400">
                        Accuracy
                    </p>
                    <p className="text-xl font-bold leading-none">
                        {accuracy}%
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm leading-none text-gray-400">Status</p>
                    <p className="text-xl font-bold leading-none">Active</p>
                </div>
            </div>

            <Separator className="bg-black" />
        </div>
    );
}
