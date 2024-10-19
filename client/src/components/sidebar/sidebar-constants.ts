import { LayoutDashboard, type LucideIcon } from "lucide-react";

export interface NavLinkItem {
    title: string;
    href: string;
    icon: LucideIcon;
    disabled?: boolean;
}

export interface NavAccordionItem extends Omit<NavLinkItem, "href"> {
    isChildren?: boolean;
    children?: NavLinkItem[];
}

export const NAV_LINKS: NavLinkItem[] = [
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
    },
];
