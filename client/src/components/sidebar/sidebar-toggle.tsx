import { cn } from "@/lib/utils";
import { ChevronLeftIcon } from "lucide-react";

interface SidebarToggleProps {
    isOpen: boolean;
    handleToggle: VoidFunction;
}

export function SidebarToggle({ isOpen, handleToggle }: SidebarToggleProps) {
    return (
        <div
            className={cn(
                "text-xxs flex h-3 w-fit cursor-pointer",
                !isOpen && "w-full"
            )}
            onClick={handleToggle}
        >
            <ChevronLeftIcon
                className={cn(
                    "my-auto h-full w-fit",
                    !isOpen && "w-full rotate-180"
                )}
            />
            <p className={cn(!isOpen && "hidden")}>Collapse</p>
        </div>
    );
}
