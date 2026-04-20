import PoseDetector from "./PoseDetector";

export const metadata = {
    title: "RehabSense — Analiza Postawy",
    description: "Analiza postawy ciała w czasie rzeczywistym z wykorzystaniem kamery i MediaPipe",
};

export default function PosePage() {
    return (
        <div className="w-full min-h-screen flex flex-col items-center px-4 py-8 gap-6">
            <header className="flex flex-col items-center gap-2 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                    Analiza Postawy
                </h1>
            </header>

            <PoseDetector />
        </div>
    );
}
