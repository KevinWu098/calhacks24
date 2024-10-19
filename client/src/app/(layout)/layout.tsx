import { Sidebar } from "@/components/sidebar/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-[100dvh] max-h-[100dvh] min-w-[100dvw] max-w-[100dvw] overflow-hidden">
            <Sidebar />

            <div className="w-full">{children}</div>
        </div>
    );
}
