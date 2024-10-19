export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">{children}</div>
        </div>
    );
}
