import { Separator } from "@/components/ui/separator";

export function RescueWorkflow() {
    return (
        <div className="h-full w-[250px] rounded-md border-2 border-gray-400 bg-white p-3">
            <div>
                <p className="font-semibold">Rescue Workflow</p>
                <Separator className="" />
            </div>

            <div className="space-y-4 py-4">
                <div className="flex h-5 w-fit items-center rounded-sm bg-[#DBF2D9] p-3 text-sm font-medium text-[#289223]">
                    On Time
                </div>

                <div className="space-y-1">
                    <p className="leading-none text-gray-400">Total Time</p>
                    <p className="text-xl font-bold leading-none">26 min</p>
                </div>
                <div className="space-y-1">
                    <p className="leading-none text-gray-400">Accuracy</p>
                    <p className="text-xl font-bold leading-none">
                        95% accuracy
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="leading-none text-gray-400">Total Time</p>
                    <p className="text-xl font-bold leading-none">26 min</p>
                </div>
            </div>

            <Separator className="bg-black" />
        </div>
    );
}
