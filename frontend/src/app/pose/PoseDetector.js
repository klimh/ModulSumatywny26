"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
    PoseLandmarker,
    HandLandmarker,
    FilesetResolver,
    DrawingUtils,
} from "@mediapipe/tasks-vision";

const POSE_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS;
const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;

export default function PoseDetector() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const poseLandmarkerRef = useRef(null);
    const handLandmarkerRef = useRef(null);
    const animFrameRef = useRef(null);
    const streamRef = useRef(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fps, setFps] = useState(0);

    useEffect(() => {
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        const filterArgs = (args) => {
            if (typeof args[0] === "string") {
                const msg = args[0];
                if (msg.includes("TensorFlow Lite XNNPACK delegate") ||
                    msg.includes("[browser]") ||
                    msg.includes("landmark_projection_calculator")) {
                    return true;
                }
            }
            return false;
        };

        console.error = (...args) => {
            if (filterArgs(args)) return;
            originalConsoleError.apply(console, args);
        };

        console.warn = (...args) => {
            if (filterArgs(args)) return;
            originalConsoleWarn.apply(console, args);
        };

        return () => {
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
        };
    }, []);

    const initPoseLandmarker = useCallback(async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            const poseModelUrl =
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
            const handModelUrl =
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

            const createPoseLandmarker = (delegate) =>
                PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: poseModelUrl,
                        delegate,
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                });

            const createHandLandmarker = (delegate) =>
                HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: handModelUrl,
                        delegate,
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                });

            const initModels = async (delegate) => {
                poseLandmarkerRef.current = await createPoseLandmarker(delegate);
                handLandmarkerRef.current = await createHandLandmarker(delegate);
            };

            const isFirefox = /Firefox/i.test(navigator.userAgent);
            if (isFirefox) {
                console.log("Firefox wykryty: wymuszanie CPU dla lepszej wydajności z MediaPipe.");
                await initModels("CPU");
            } else {
                try {
                    await initModels("GPU");
                } catch {
                    console.warn("GPU delegate unavailable, falling back to CPU");
                    await initModels("CPU");
                }
            }
        } catch (err) {
            console.error("MediaPipe init error:", err);
            setError("Nie udało się załadować modeli MediaPipe.");
        }
    }, []);

    const startCamera = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (!poseLandmarkerRef.current || !handLandmarkerRef.current) {
                await initPoseLandmarker();
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
                audio: false,
            });

            streamRef.current = stream;
            const video = videoRef.current;
            video.srcObject = stream;

            await new Promise((resolve) => {
                video.onloadeddata = resolve;
            });
            await video.play();

            setCameraActive(true);
            setLoading(false);
            detectPose();
        } catch (err) {
            console.error("Camera error:", err);
            setError("Nie udało się uzyskać dostępu do kamery. Sprawdź uprawnienia.");
            setLoading(false);
        }
    }, [initPoseLandmarker]);
    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraActive(false);
        setFps(0);
    }, []);

    const detectPose = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const poseLandmarker = poseLandmarkerRef.current;
        const handLandmarker = handLandmarkerRef.current;

        if (!video || !canvas || (!poseLandmarker && !handLandmarker)) return;

        const ctx = canvas.getContext("2d");
        const drawingUtils = new DrawingUtils(ctx);

        let lastTime = -1;
        let frameCount = 0;
        let fpsAccum = 0;

        const loop = () => {
            if (!videoRef.current?.srcObject) return;

            const now = performance.now();

            frameCount++;
            if (now - fpsAccum >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                fpsAccum = now;
            }

            if (video.currentTime !== lastTime) {
                lastTime = video.currentTime;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                ctx.save();
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                ctx.restore();

                try {
                    const poseResult = poseLandmarker ? poseLandmarker.detectForVideo(video, now) : null;
                    const handResult = handLandmarker ? handLandmarker.detectForVideo(video, now) : null;

                    if (poseResult && poseResult.landmarks && poseResult.landmarks.length > 0) {
                        for (const landmarks of poseResult.landmarks) {
                            const mirrored = landmarks.map((lm) => ({
                                ...lm,
                                x: 1 - lm.x,
                            }));

                            drawingUtils.drawConnectors(
                                mirrored,
                                POSE_CONNECTIONS,
                                {
                                    color: "rgba(0, 230, 180, 0.7)",
                                    lineWidth: 4,
                                }
                            );

                            drawingUtils.drawLandmarks(mirrored, {
                                color: "rgba(255, 255, 255, 0.9)",
                                fillColor: "rgba(0, 200, 160, 0.85)",
                                lineWidth: 2,
                                radius: 5,
                            });
                        }
                    }

                    if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
                        for (const landmarks of handResult.landmarks) {
                            const mirrored = landmarks.map((lm) => ({
                                ...lm,
                                x: 1 - lm.x,
                            }));

                            drawingUtils.drawConnectors(
                                mirrored,
                                HAND_CONNECTIONS,
                                {
                                    color: "rgba(255, 120, 120, 0.7)",
                                    lineWidth: 3,
                                }
                            );

                            drawingUtils.drawLandmarks(mirrored, {
                                color: "rgba(255, 255, 255, 0.9)",
                                fillColor: "rgba(255, 80, 80, 0.85)",
                                lineWidth: 1,
                                radius: 3,
                            });
                        }
                    }
                } catch {
                    //nic
                }
            }
            animFrameRef.current = requestAnimationFrame(loop);
        };

        loop();
    }, []);

    useEffect(() => {
        return () => {
            stopCamera();
            if (poseLandmarkerRef.current) {
                poseLandmarkerRef.current.close();
            }
            if (handLandmarkerRef.current) {
                handLandmarkerRef.current.close();
            }
        };
    }, [stopCamera]);

    const startBtnClass = [
        "relative px-8 py-3 rounded-2xl font-semibold text-sm",
        "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500",
        "text-white shadow-lg shadow-teal-500/30",
        "hover:shadow-xl hover:shadow-teal-500/40",
        "hover:scale-105 active:scale-95",
        "transition-all duration-300 ease-out",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
    ].join(" ");

    const stopBtnClass = [
        "px-8 py-3 rounded-2xl font-semibold text-sm",
        "bg-gradient-to-r from-rose-500 to-pink-500",
        "text-white shadow-lg shadow-rose-500/30",
        "hover:shadow-xl hover:shadow-rose-500/40",
        "hover:scale-105 active:scale-95",
        "transition-all duration-300 ease-out",
    ].join(" ");

    return (
        <div className="w-full max-w-4xl flex flex-col items-center gap-5 animate-scale-up">
            <div className="flex items-center gap-4">
                {!cameraActive ? (
                    <button
                        id="start-camera-btn"
                        onClick={startCamera}
                        disabled={loading}
                        className={startBtnClass}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Spinner />
                                Ładowanie…
                            </span>
                        ) : (
                            "Uruchom kamerę"
                        )}
                    </button>
                ) : (
                    <button
                        id="stop-camera-btn"
                        onClick={stopCamera}
                        className={stopBtnClass}
                    >
                        ⏹ Zatrzymaj
                    </button>
                )}

                {cameraActive && (
                    <span className="px-4 py-2 rounded-xl text-xs font-mono bg-panel border border-outline shadow-panel">
                        {fps} FPS
                    </span>
                )}
            </div>

            {error && (
                <div className="px-6 py-3 rounded-xl text-sm bg-danger-panel border border-danger-outline text-danger animate-fade-in">
                    ⚠️ {error}
                </div>
            )}

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-panel border border-outline shadow-panel transition-all duration-500">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                />

                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${cameraActive ? "opacity-100" : "opacity-0"}`}
                />

                {!cameraActive && !loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted">
                        <svg
                            className="w-16 h-16 opacity-30"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
                            />
                        </svg>
                        <span className="text-sm font-medium">
                            Kliknij &quot;Uruchom kamerę&quot;, aby rozpocząć
                        </span>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-panel/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                            <Spinner size="lg" />
                            <span className="text-sm text-muted font-medium">
                                Inicjalizacja modelu AI…
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Spinner({ size = "sm" }) {
    const dim = size === "lg" ? "w-8 h-8" : "w-4 h-4";
    return (
        <svg
            className={`${dim} animate-spin`}
            viewBox="0 0 24 24"
            fill="none"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    );
}
