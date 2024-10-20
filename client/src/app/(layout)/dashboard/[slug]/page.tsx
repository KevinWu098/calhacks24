"use client";

import { SplatViewer } from "@/components/splat/splat-viewer";

export default function Page({ params }) {
    const { slug } = params;

    if (!slug) {
        return <div>Loading...</div>;
    }

    return (
        <div className="h-full bg-black">
            <SplatViewer splat={slug ?? "foo"} />
        </div>
    );
}
