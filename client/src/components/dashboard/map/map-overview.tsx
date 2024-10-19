import Image from "next/image";

export function MapOverview() {
    return (
        <div className="flex-center flex-col space-y-1 rounded-sm bg-white p-2">
            <div className="w-full">
                <Image
                    src={"/lines.svg"}
                    alt="lines"
                    width={200}
                    height={25}
                    className="mx-auto"
                />
                <div className="flex-between w-full">
                    <p className="text-xs">E</p>
                    <p className="text-base">N</p>
                    <p className="text-xs">W</p>
                </div>
            </div>

            <Image
                src={"/map-overview.png"}
                alt="map overview"
                width={300}
                height={200}
                className="rounded-sm"
            />
        </div>
    );
}
