"use client";

import { usePathname } from "next/navigation";

import { NAV_LINKS } from "./sidebar-constants";
import { SidebarLink } from "./sidebar-link";
import { useOpenItemHook } from "./useOpenItem";
import { useSidebar } from "./useSidebar";

interface SidebarNavProps {
    setOpen?: (open: boolean) => void;
}

export function SidebarNav({ setOpen }: SidebarNavProps) {
    const path = usePathname();
    const { isOpen } = useSidebar();
    const { handleClick } = useOpenItemHook({ isOpen, setOpen });

    return (
        <nav className="flex flex-col gap-y-2 overflow-hidden py-2">
            {NAV_LINKS.map((item) => (
                <SidebarLink
                    key={item.title}
                    item={item}
                    isOpen={isOpen}
                    path={path}
                    handleClick={handleClick}
                />
            ))}
        </nav>
    );
}
