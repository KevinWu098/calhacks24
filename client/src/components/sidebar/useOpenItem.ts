import { useEffect, useState } from "react";

interface UseOpenItemHookProps {
    isOpen: boolean;
    setOpen?: (open: boolean) => unknown;
}

export const useOpenItemHook = ({ isOpen, setOpen }: UseOpenItemHookProps) => {
    const [openItem, setOpenItem] = useState("");
    const [lastOpenItem, setLastOpenItem] = useState("");

    const handleClick = () => {
        if (setOpen) {
            setOpen(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setOpenItem(lastOpenItem);
        } else {
            setLastOpenItem(openItem);
            setOpenItem("");
        }
    }, [isOpen]);

    return {
        openItem,
        setOpenItem,
        lastOpenItem,
        setLastOpenItem,
        handleClick,
    };
};
