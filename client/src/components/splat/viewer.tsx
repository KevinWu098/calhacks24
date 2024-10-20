"use client";

import React, { useEffect, useRef, useState } from "react";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

const SplatViewer = () => {
    const viewerRef = useRef(null); // Reference for the DOM container
    const [isViewerInitialized, setIsViewerInitialized] = useState(false); // Track initialization state

    useEffect(() => {
        if (viewerRef.current && !isViewerInitialized) {
            // Ensure viewer is only initialized once
            const viewer = new GaussianSplats3D.Viewer({
                cameraUp: [0, -1, -0.6],
                initialCameraPosition: [-1, -4, 6],
                initialCameraLookAt: [0, 4, 0],
                container: viewerRef.current, // Attach viewer to the ref container
            });

            viewer
                .addSplatScene("./test.ply", {
                    splatAlphaRemovalThreshold: 5,
                    showLoadingUI: true,
                    position: [0, 1, 0],
                    rotation: [0, 0, 0, 1],
                    scale: [1.5, 1.5, 1.5],
                })
                .then(() => {
                    viewer.start();
                    setIsViewerInitialized(true); // Mark viewer as initialized
                })
                .catch((err) => {
                    console.error("Error loading splat scene:", err); // Handle errors if any
                });

            // Optional cleanup on unmount
            return () => {
                // viewer.dispose();
            };
        }
    }, [isViewerInitialized]); // Add isViewerInitialized to avoid re-initialization

    return (
        <div
            ref={viewerRef}
            style={{ width: "100%", height: "100vh" }} // Ensure the div takes full height
            className="bg-red-500"
        />
    );
};

export default SplatViewer;
