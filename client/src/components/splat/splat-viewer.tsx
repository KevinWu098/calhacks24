"use client";

import { useEffect, useState } from "react";
import { OrbitControls, Splat } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import "./styles.css";

import { cn } from "@/lib/utils";

function MovableSplat({ splat }: { splat: string }) {
    const [position, setPosition] = useState<number[]>([-4, 2.5, 1.5]);
    const [rotation, setRotation] = useState<number[]>([0, 0, 0]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            setPosition((prevPosition) => {
                const [x, y, z] = prevPosition;
                switch (event.key) {
                    case "ArrowUp":
                        return [x, y, z - 0.1];
                    case "ArrowDown":
                        return [x, y, z + 0.1];
                    case "ArrowLeft":
                        return [x - 0.1, y, z];
                    case "ArrowRight":
                        return [x + 0.1, y, z];
                    default:
                        return prevPosition;
                }
            });

            setRotation((prevRotation) => {
                const [x, y, z] = prevRotation;
                switch (event.key) {
                    case "q":
                    case "Q":
                        return [x, y + 0.025, z];
                    case "e":
                    case "E":
                        return [x, y - 0.025, z];
                    default:
                        return prevRotation;
                }
            });
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <Splat
            src={`/${splat}.splat`}
            // @ts-expect-error trust me bro
            position={position}
            // @ts-expect-error trust me bro
            rotation={rotation}
        />
    );
}

interface SplatViewerProps {
    splat: string;
    className?: string;
}

export function SplatViewer({ splat, className }: SplatViewerProps) {
    return (
        <div className={cn("h-full", className)}>
            <Canvas>
                <OrbitControls />

                <MovableSplat splat={splat} />
            </Canvas>
        </div>
    );
}
