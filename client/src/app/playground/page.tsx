import { HereMap } from "@/components/dashboard/here/map";
import { SplatViewer } from "@/components/splat/splat-viewer";

export default function Playground() {
    return (
        // <div className="h-full">
        //     <SplatViewer splat="foo" />
        // </div>

        <div className="h-[100dvh] min-h-[100dvh] w-full">
            <HereMap apikey={process.env.NEXT_PUBLIC_HERE_KEY} />
        </div>
    );
}
