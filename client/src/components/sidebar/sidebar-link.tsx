import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { NavLinkItem } from "./sidebar-constants";

interface SidebarLinkProps {
    item: NavLinkItem;
    isOpen: boolean;
    path: string;
    handleClick: VoidFunction;
}

export function SidebarLink({
    item,
    isOpen,
    path,
    handleClick,
}: SidebarLinkProps) {
    return (
        <Link
            key={item.title}
            href={item.href}
            className={cn("w-full", item.disabled && "pointer-events-none")}
        >
            <Button
                variant={"secondary"}
                className={cn(
                    "flex w-full justify-center space-x-2 overflow-hidden bg-transparent font-normal",
                    isOpen && "justify-start",
                    !isOpen && "w-fit max-w-full",
                    path === item.href && "text-blue-500"
                )}
                disabled={item.disabled}
                onClick={handleClick}
            >
                <item.icon className={cn("size-4 min-h-4 min-w-4")} />

                <p className={cn("flex", !isOpen && "hidden opacity-0")}>
                    {item.title}
                </p>
            </Button>
        </Link>
    );
}
