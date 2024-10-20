"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";

import test from "../../../public/test.ply";

const PlyViewer = () => {
    const containerRef = useRef();

    useEffect(() => {
        const container = containerRef.current;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        container.appendChild(renderer.domElement);

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#dedef0");

        const loader = new PLYLoader();

        loader.load(test, function (geometry) {
            geometry.computeFaceNormals();
            geometry.computeVertexNormals();
            geometry.center();
            geometry.computeBoundingBox();

            const x = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
            const y = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
            const z = geometry.boundingBox.max.z - geometry.boundingBox.min.z;

            const cameraZ = Math.max(x * 2.5, y * 2.5, z * 2.5);

            const material = new THREE.MeshLambertMaterial({
                color: "#b0b0b0",
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const camera = new THREE.PerspectiveCamera(
                30,
                window.innerWidth / window.innerHeight,
                1,
                1000
            );
            camera.position.set(0, 0, cameraZ);
            camera.lookAt(mesh);

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableZoom = true;
            controls.autoRotate = true;

            const lightHolder = new THREE.Group();

            const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
            directionalLight1.position.set(1, 1, 0).normalize();
            lightHolder.add(directionalLight1);

            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
            directionalLight2.position.set(-1, -1, 0).normalize();
            lightHolder.add(directionalLight2);

            scene.add(lightHolder);

            const ambientLight = new THREE.AmbientLight("#FFF");
            scene.add(ambientLight);
            scene.add(mesh);

            function animate() {
                requestAnimationFrame(animate);
                lightHolder.quaternion.copy(camera.quaternion);
                controls.update();
                renderer.render(scene, camera);
            }

            animate();
        });

        const handleResize = () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "100vh" }}
        />
    );
};

export default PlyViewer;
