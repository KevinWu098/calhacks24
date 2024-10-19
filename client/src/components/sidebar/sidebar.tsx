"use client";

import React, { useCallback, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { WaypointsIcon } from "lucide-react";

import { SidebarNav } from "./sidebar-nav";
import { SidebarToggle } from "./sidebar-toggle";
import { useSidebar } from "./useSidebar";

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const { isOpen, toggle } = useSidebar();
    const [status, setStatus] = useState(false);

    const handleToggle = useCallback(() => {
        setStatus(true);
        toggle();
        setTimeout(() => setStatus(false), 500);
    }, [toggle]);

    return (
        <nav
            className={cn(
                `relative z-50 hidden h-screen border-r-2 px-2 pb-4 pt-3 md:block`,
                status && "duration-500",
                isOpen ? "w-52 min-w-52" : "w-[50px] min-w-[50px]",
                className
            )}
        >
            {/* <SidebarToggle
                isOpen={isOpen}
                handleToggle={handleToggle}
            /> */}

            {/* <Separator className="mt-2 h-[1px]" /> */}

            <div className="flex-center pb-1">
                <WaypointsIcon className="size-5" />
            </div>

            <SidebarNav />
        </nav>
    );
}
