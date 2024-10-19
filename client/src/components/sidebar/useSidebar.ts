export interface UseSidebarProps {
    isOpen: boolean;
    toggle: VoidFunction;
}

let isOpen = false;

export const useSidebar = (): UseSidebarProps => {
    const toggle = () => {
        isOpen = !isOpen;
    };

    return {
        isOpen,
        toggle,
    };
};
