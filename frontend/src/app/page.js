import Link from "next/link";

export default function Home() {
    return (
        <div className="flex flex-col items-center gap-8 py-16 px-4">
            <div className="flex flex-col items-center gap-2 animate-fade-in">
                <h1 className="text-5xl font-bold tracking-tight">RehabSense</h1>
                <span className="font-mono font-light text-muted">
                    Your journey back to strength.
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl animate-scale-up">
                <Link
                    href="/pose"
                    className="
                        group flex flex-col items-center gap-3 p-8 rounded-2xl
                        bg-panel border border-outline shadow-panel
                        hover:shadow-hover hover:-translate-y-1
                        transition-all duration-300 no-underline
                    "
                >
                    <span className="font-semibold text-lg">Analiza Postawy</span>
                    <span className="text-xs text-muted text-center">
                        Wykrywanie postawy ciała w czasie rzeczywistym
                    </span>
                </Link>
            </div>
        </div>
    );
}
