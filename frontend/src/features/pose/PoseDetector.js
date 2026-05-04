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

const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

const getPoseAngles = (landmarks) => {
    return {
        leftElbow: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
        rightElbow: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
        leftShoulder: calculateAngle(landmarks[23], landmarks[11], landmarks[13]),
        rightShoulder: calculateAngle(landmarks[24], landmarks[12], landmarks[14]),
        leftHip: calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
        rightHip: calculateAngle(landmarks[12], landmarks[24], landmarks[26]),
        leftKnee: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
        rightKnee: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
    };
};

const comparePoses = (pose1, pose2) => {
    if (!pose1 || !pose2) return 0;
    const angles1 = getPoseAngles(pose1);
    const angles2 = getPoseAngles(pose2);

    const keys = Object.keys(angles1);
    let totalDiff = 0;

    keys.forEach(k => {
        let diff = Math.abs(angles1[k] - angles2[k]);
        totalDiff += diff;
    });

    const avgDiff = totalDiff / keys.length;

    const match = Math.max(0, 100 - (avgDiff / 90 * 100));
    return match;
};

export default function PoseDetector() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const refVideoRef = useRef(null);
    const refCanvasRef = useRef(null);
    const fileInputRef = useRef(null);

    const poseLandmarkerRef = useRef(null);
    const handLandmarkerRef = useRef(null);
    const animFrameRef = useRef(null);
    const streamRef = useRef(null);

    const [mode, setModeState] = useState("waving");
    const modeRef = useRef("waving");
    const [videoUrl, setVideoUrl] = useState(null);
    const videoUrlRef = useRef(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fps, setFps] = useState(0);
    const [isWaving, setIsWaving] = useState(false);
    const [matchPercentage, setMatchPercentage] = useState(0);

    const isWavingRef = useRef(false);
    const matchPercentageRef = useRef(0);
    const leftWristHistoryRef = useRef([]);
    const rightWristHistoryRef = useRef([]);

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

        if (refVideoRef.current) {
            refVideoRef.current.pause();
        }

        setCameraActive(false);
        setFps(0);
        setIsWaving(false);
        setMatchPercentage(0);
        isWavingRef.current = false;
        matchPercentageRef.current = 0;
        leftWristHistoryRef.current = [];
        rightWristHistoryRef.current = [];
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            videoUrlRef.current = url;

            setMatchPercentage(0);
            matchPercentageRef.current = 0;
        }
    };

    const changeMode = (newMode) => {
        setModeState(newMode);
        modeRef.current = newMode;
        if (newMode === 'waving') {
            setMatchPercentage(0);
            matchPercentageRef.current = 0;
        } else {
            setIsWaving(false);
            isWavingRef.current = false;
            leftWristHistoryRef.current = [];
            rightWristHistoryRef.current = [];
        }
    };

    const detectPose = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const poseLandmarker = poseLandmarkerRef.current;
        const handLandmarker = handLandmarkerRef.current;

        if (!video || !canvas || (!poseLandmarker && !handLandmarker)) return;

        const ctx = canvas.getContext("2d");
        const drawingUtils = new DrawingUtils(ctx);

        let lastTime = -1;
        let lastRefTime = -1;
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

            let currentPoseLandmarks = null;
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
                        currentPoseLandmarks = poseResult.landmarks[0];
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

                    if (modeRef.current === "waving" && currentPoseLandmarks) {
                        const rawLandmarks = currentPoseLandmarks;
                        const leftWrist = rawLandmarks[15];
                        const rightWrist = rawLandmarks[16];
                        const leftShoulder = rawLandmarks[11];
                        const rightShoulder = rawLandmarks[12];
                        const checkWaving = (wrist, shoulder, history) => {
                            if (!wrist || !shoulder) return false;

                            history.push({ x: wrist.x, time: now });

                            while (history.length > 0 && now - history[0].time > 2000) {
                                history.shift();
                            }

                            if (wrist.y > shoulder.y + 0.35) {
                                return false;
                            }

                            if (history.length < 5) return false;

                            let changes = 0;
                            let state = -1;
                            let lastPivotX = history[0].x;

                            const threshold = 0.05;

                            for (let i = 1; i < history.length; i++) {
                                let x = history[i].x;
                                let dx = x - lastPivotX;

                                if (state === -1) {
                                    if (dx > threshold) { state = 1; lastPivotX = x; }
                                    else if (dx < -threshold) { state = 0; lastPivotX = x; }
                                } else if (state === 1) {
                                    if (dx < -threshold) {
                                        state = 0;
                                        changes++;
                                        lastPivotX = x;
                                    } else if (dx > 0) {
                                        lastPivotX = Math.max(lastPivotX, x);
                                    }
                                } else if (state === 0) {
                                    if (dx > threshold) {
                                        state = 1;
                                        changes++;
                                        lastPivotX = x;
                                    } else if (dx < 0) {
                                        lastPivotX = Math.min(lastPivotX, x);
                                    }
                                }
                            }

                            return changes >= 3;
                        };

                        const leftWaving = checkWaving(leftWrist, leftShoulder, leftWristHistoryRef.current);
                        const rightWaving = checkWaving(rightWrist, rightShoulder, rightWristHistoryRef.current);

                        const currentlyWaving = leftWaving || rightWaving;

                        if (currentlyWaving !== isWavingRef.current) {
                            isWavingRef.current = currentlyWaving;
                            setIsWaving(currentlyWaving);
                        }
                    }
                } catch (e) {
                    console.warn(e);
                }
            }

            const refVideo = refVideoRef.current;
            const refCanvas = refCanvasRef.current;

            if (modeRef.current === "comparison" && videoUrlRef.current && refVideo && refCanvas && refVideo.readyState >= 2) {
                const refCtx = refCanvas.getContext("2d");
                const refDrawingUtils = new DrawingUtils(refCtx);

                try {
                    let refPoseLandmarks = null;
                    if (refVideo.currentTime !== lastRefTime) {
                        lastRefTime = refVideo.currentTime;

                        if (refCanvas.width !== refVideo.videoWidth || refCanvas.height !== refVideo.videoHeight) {
                            refCanvas.width = refVideo.videoWidth;
                            refCanvas.height = refVideo.videoHeight;
                        }

                        refCtx.save();
                        refCtx.drawImage(refVideo, 0, 0, refCanvas.width, refCanvas.height);
                        refCtx.restore();

                        const refPoseResult = poseLandmarker ? poseLandmarker.detectForVideo(refVideo, performance.now()) : null;

                        if (refPoseResult && refPoseResult.landmarks && refPoseResult.landmarks.length > 0) {
                            refPoseLandmarks = refPoseResult.landmarks[0];
                            for (const landmarks of refPoseResult.landmarks) {
                                refDrawingUtils.drawConnectors(
                                    landmarks,
                                    POSE_CONNECTIONS,
                                    { color: "rgba(180, 0, 230, 0.7)", lineWidth: 4 }
                                );
                                refDrawingUtils.drawLandmarks(landmarks, {
                                    color: "rgba(255, 255, 255, 0.9)",
                                    fillColor: "rgba(160, 0, 200, 0.85)",
                                    lineWidth: 2, radius: 4
                                });
                            }
                        }
                    }

                    if (refPoseLandmarks) {

                    }

                } catch (e) {
                    console.warn(e);
                }
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };

        loop();
    }, []);
    const lastCameraPoseRef = useRef(null);
    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const poseLandmarker = poseLandmarkerRef.current;
        const handLandmarker = handLandmarkerRef.current;

        if (!video || !canvas || !cameraActive || !poseLandmarker) return;

        let frameCount = 0;
        let fpsAccum = 0;
        let lastTime = -1;
        let lastRefTime = -1;

        const loop = () => {
            if (!videoRef.current?.srcObject) return;
            const now = performance.now();

            frameCount++;
            if (now - fpsAccum >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                fpsAccum = now;
            }

            const ctx = canvas.getContext("2d");
            const drawingUtils = new DrawingUtils(ctx);

            if (video.currentTime !== lastTime) {
                lastTime = video.currentTime;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.save();
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                ctx.restore();

                let currentPose = null;
                try {
                    const poseResult = poseLandmarker.detectForVideo(video, now);
                    if (poseResult?.landmarks?.length > 0) {
                        currentPose = poseResult.landmarks[0];
                        lastCameraPoseRef.current = currentPose;
                        const mirrored = currentPose.map((lm) => ({ ...lm, x: 1 - lm.x }));
                        drawingUtils.drawConnectors(mirrored, POSE_CONNECTIONS, { color: "rgba(0, 230, 180, 0.7)", lineWidth: 4 });
                        drawingUtils.drawLandmarks(mirrored, { color: "rgba(255, 255, 255, 0.9)", fillColor: "rgba(0, 200, 160, 0.85)", lineWidth: 2, radius: 5 });
                    }
                    if (handLandmarker) {
                        const handResult = handLandmarker.detectForVideo(video, now);
                        if (handResult?.landmarks?.length > 0) {
                            for (const landmarks of handResult.landmarks) {
                                const mirrored = landmarks.map((lm) => ({ ...lm, x: 1 - lm.x }));
                                drawingUtils.drawConnectors(mirrored, HAND_CONNECTIONS, { color: "rgba(255, 120, 120, 0.7)", lineWidth: 3 });
                                drawingUtils.drawLandmarks(mirrored, { color: "rgba(255, 255, 255, 0.9)", fillColor: "rgba(255, 80, 80, 0.85)", lineWidth: 1, radius: 3 });
                            }
                        }
                    }
                } catch (e) { }

                // machanie
                if (modeRef.current === "waving" && currentPose) {
                    const l = currentPose[15], r = currentPose[16], ls = currentPose[11], rs = currentPose[12];
                    const checkWave = (wrist, shoulder, history) => {
                        if (!wrist || !shoulder) return false;
                        history.push({ x: wrist.x, time: now });
                        while (history.length > 0 && now - history[0].time > 2000) history.shift();
                        if (wrist.y > shoulder.y + 0.35) return false;
                        if (history.length < 5) return false;
                        let changes = 0, state = -1, lastX = history[0].x;
                        for (let i = 1; i < history.length; i++) {
                            let dx = history[i].x - lastX;
                            if (state === -1) {
                                if (dx > 0.05) { state = 1; lastX = history[i].x; }
                                else if (dx < -0.05) { state = 0; lastX = history[i].x; }
                            } else if (state === 1) {
                                if (dx < -0.05) { state = 0; changes++; lastX = history[i].x; }
                                else if (dx > 0) lastX = Math.max(lastX, history[i].x);
                            } else if (state === 0) {
                                if (dx > 0.05) { state = 1; changes++; lastX = history[i].x; }
                                else if (dx < 0) lastX = Math.min(lastX, history[i].x);
                            }
                        }
                        return changes >= 3;
                    };
                    const wave = checkWave(l, ls, leftWristHistoryRef.current) || checkWave(r, rs, rightWristHistoryRef.current);
                    if (wave !== isWavingRef.current) {
                        isWavingRef.current = wave;
                        setIsWaving(wave);
                    }
                }
            }

            const refVideo = refVideoRef.current;
            const refCanvas = refCanvasRef.current;

            // porownywanie z filmikiem
            if (modeRef.current === "comparison" && videoUrlRef.current && refVideo && refCanvas && refVideo.readyState >= 2) {
                if (refVideo.currentTime !== lastRefTime) {
                    lastRefTime = refVideo.currentTime;
                    try {
                        const rCtx = refCanvas.getContext("2d");
                        const rUtils = new DrawingUtils(rCtx);
                        if (refCanvas.width !== refVideo.videoWidth || refCanvas.height !== refVideo.videoHeight) {
                            refCanvas.width = refVideo.videoWidth;
                            refCanvas.height = refVideo.videoHeight;
                        }

                        rCtx.save();
                        rCtx.translate(refCanvas.width, 0);
                        rCtx.scale(-1, 1);
                        rCtx.drawImage(refVideo, 0, 0, refCanvas.width, refCanvas.height);
                        rCtx.restore();

                        const refPoseResult = poseLandmarker.detectForVideo(refVideo, performance.now());

                        if (refPoseResult?.landmarks?.length > 0) {
                            const refPose = refPoseResult.landmarks[0];
                            const mirroredRefPose = refPose.map((lm) => ({ ...lm, x: 1 - lm.x }));

                            rUtils.drawConnectors(mirroredRefPose, POSE_CONNECTIONS, { color: "rgba(180, 0, 230, 0.7)", lineWidth: 4 });
                            rUtils.drawLandmarks(mirroredRefPose, { color: "rgba(255, 255, 255, 0.9)", fillColor: "rgba(160, 0, 200, 0.85)", lineWidth: 2, radius: 4 });

                            if (lastCameraPoseRef.current) {
                                const match = comparePoses(lastCameraPoseRef.current, refPose);
                                const smoothed = matchPercentageRef.current * 0.8 + match * 0.2;
                                matchPercentageRef.current = smoothed;
                                setMatchPercentage(Math.round(smoothed));
                            }
                        }
                        
                        if (handLandmarker) {
                            const refHandResult = handLandmarker.detectForVideo(refVideo, performance.now());
                            if (refHandResult?.landmarks?.length > 0) {
                                for (const landmarks of refHandResult.landmarks) {
                                    const mirroredRefHand = landmarks.map((lm) => ({ ...lm, x: 1 - lm.x }));
                                    rUtils.drawConnectors(mirroredRefHand, HAND_CONNECTIONS, { color: "rgba(255, 120, 120, 0.7)", lineWidth: 3 });
                                    rUtils.drawLandmarks(mirroredRefHand, { color: "rgba(255, 255, 255, 0.9)", fillColor: "rgba(255, 80, 80, 0.85)", lineWidth: 1, radius: 3 });
                                }
                            }
                        }
                    } catch (e) { }
                }
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        }
    }, [cameraActive]);

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
        <div className={`w-full ${mode === 'comparison' ? 'max-w-7xl' : 'max-w-4xl'} flex flex-col items-center gap-5 animate-scale-up transition-all duration-500`}>

            <div className="flex bg-panel border border-outline rounded-2xl p-1 shadow-panel mb-2 z-10 relative">
                <button
                    onClick={() => changeMode("waving")}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${mode === "waving"
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20"
                        : "text-muted hover:text-white hover:bg-white/5"
                        }`}
                >
                    Wykrywanie Machania
                </button>
                <button
                    onClick={() => changeMode("comparison")}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${mode === "comparison"
                        ? "bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white shadow-md shadow-purple-500/20"
                        : "text-muted hover:text-white hover:bg-white/5"
                        }`}
                >
                    Porównywanie Pozycji z Filmikiem
                    {mode === "comparison" && <span className="flex w-2 h-2 rounded-full bg-white animate-pulse"></span>}
                </button>
            </div>

            <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex flex-wrap justify-center items-center gap-4">
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
                            Zatrzymaj wszystko
                        </button>
                    )}

                    {mode === "comparison" && (
                        <div className="relative z-10">
                            <input
                                type="file"
                                accept="video/*"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-3 rounded-2xl font-semibold text-sm bg-panel border-2 border-dashed border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500 transition-all duration-300 cursor-pointer"
                            >
                                {videoUrl ? "Zmień filmik referencyjny" : "Wgraj filmik referencyjny (MP4)"}
                            </button>
                        </div>
                    )}

                    {cameraActive && (
                        <span className="px-4 py-2 rounded-xl text-xs font-mono bg-panel border border-outline shadow-panel">
                            {fps} FPS
                        </span>
                    )}
                </div>

                {cameraActive && mode === "waving" && (
                    <div className="w-full max-w-sm bg-panel border border-outline rounded-2xl p-4 shadow-panel flex items-center justify-between animate-fade-in translate-y-1">
                        <span className="text-sm font-medium text-muted">Test:</span>
                        {isWaving ? (
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                Wykryto machanie! No elo elo!!
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-panel border border-outline rounded-xl text-sm text-muted">
                                We no mi pomachaj...
                            </span>
                        )}
                    </div>
                )}

                {cameraActive && mode === "comparison" && videoUrl && (
                    <div className="w-full max-w-sm flex items-center justify-center p-3 animate-fade-in translate-y-1 bg-panel border border-outline rounded-2xl shadow-panel">
                        <div className="flex flex-col items-center w-full">
                            <span className="text-sm font-semibold text-muted mb-2">Poprawność wykonania (na podstawie stawów):</span>
                            <div className="w-full h-4 bg-black/50 rounded-full overflow-hidden relative border border-outline">
                                <div
                                    className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${matchPercentage > 80 ? 'bg-emerald-500' :
                                        matchPercentage > 50 ? 'bg-amber-400' : 'bg-rose-500'
                                        }`}
                                    style={{ width: `${matchPercentage}%` }}
                                />
                            </div>
                            <span className={`text-3xl font-black mt-2 transition-colors duration-300 ${matchPercentage > 80 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' :
                                matchPercentage > 50 ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'text-rose-500'
                                }`}>
                                {matchPercentage}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="px-6 py-3 rounded-xl text-sm bg-danger-panel border border-danger-outline text-danger animate-fade-in">
                    ⚠️ {error}
                </div>
            )}

            <div className={`grid gap-6 w-full transition-all duration-500 ${mode === 'comparison' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

                <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-panel border border-outline shadow-panel flex-1 transition-all duration-300 ${mode === 'comparison' && cameraActive ? 'ring-2 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : ''}`}>
                    {mode === 'comparison' && (
                        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/50 backdrop-blur-md text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-500/30 uppercase tracking-widest">
                            Ty (Kamera)
                        </div>
                    )}
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
                            <span className="text-sm font-medium">Czekam na uruchomienie kamery...</span>
                        </div>
                    )}
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-panel/80 backdrop-blur-sm">
                            <Spinner size="lg" />
                        </div>
                    )}
                </div>

                {mode === "comparison" && (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-panel border-2 border-dashed border-purple-500/20 shadow-panel flex-1 transition-all duration-300 hover:border-purple-500/40 flex items-center justify-center">
                        {videoUrl && (
                            <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-purple-500/20 text-purple-300 backdrop-blur-md rounded-lg text-xs font-semibold border border-purple-500/30 uppercase tracking-widest">
                                Wzorzec Filmowy
                            </div>
                        )}
                        <video
                            ref={refVideoRef}
                            src={videoUrl || undefined}
                            playsInline
                            muted
                            autoPlay
                            loop
                            className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                        />
                        <canvas
                            ref={refCanvasRef}
                            className={`absolute z-0 inset-0 w-full h-full object-cover transition-opacity duration-500 ${videoUrl ? "opacity-100" : "opacity-0"}`}
                        />
                        {!videoUrl && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-purple-400/50">
                                <svg className="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium">Brak wybranego wideo do naśladowania</span>
                            </div>
                        )}
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
