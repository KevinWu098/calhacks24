"use client";

import { useEffect, useState } from "react";
import { OrbitControls, Splat } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";

import "./styles.css";

// Create a component to handle movement and rotation with keys
function MovableSplat() {
    const [position, setPosition] = useState([-4, 2.5, 1.5]);
    const [rotation, setRotation] = useState([0, 0, 0]); // x, y, z rotations

    useEffect(() => {
        const handleKeyDown = (event) => {
            setPosition((prevPosition) => {
                const [x, y, z] = prevPosition;
                switch (event.key) {
                    case "ArrowUp":
                        return [x, y, z - 0.1]; // Move forward
                    case "ArrowDown":
                        return [x, y, z + 0.1]; // Move backward
                    case "ArrowLeft":
                        return [x - 0.1, y, z]; // Move left
                    case "ArrowRight":
                        return [x + 0.1, y, z]; // Move right
                    default:
                        return prevPosition;
                }
            });

            setRotation((prevRotation) => {
                const [x, y, z] = prevRotation;
                switch (event.key) {
                    case "q":
                    case "Q":
                        return [x, y + 0.025, z]; // Rotate left (Y axis)
                    case "e":
                    case "E":
                        return [x, y - 0.025, z]; // Rotate right (Y axis)
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
            src="/foo.splat"
            position={position}
            rotation={rotation}
        />
    );
}

export function Plz() {
    return (
        <div className="h-full">
            <Canvas>
                <OrbitControls
                // maxDistance={0.5}
                // minDistance={0.3}
                // maxPolarAngle={Math.PI * 0.75}
                // minPolarAngle={Math.PI * 0.25}
                // minAzimuthAngle={Math.PI * 1.75}
                // maxAzimuthAngle={Math.PI * 2.25}
                />

                <MovableSplat />
            </Canvas>
        </div>
    );
}
