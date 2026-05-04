import PoseDetector from "@/features/pose/PoseDetector";

export const metadata = {
    title: "RehabSense — Pose Analysis",
    description: "Real-time body pose detection and exercise comparison using MediaPipe AI",
};

export default function PosePage() {
    return (
        <div className="w-full min-h-screen flex flex-col items-center px-4 py-8 gap-6">
            <header className="flex flex-col items-center gap-2 animate-fade-in">
                <h1 className="page-title">
                    Pose Analysis
                </h1>
            </header>

            <PoseDetector />
        </div>
    );
}
