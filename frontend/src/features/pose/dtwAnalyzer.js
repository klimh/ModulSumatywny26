const RAD_SCALE = 1.0 / 180.0;

const normalizeAngle = (angle) => angle * RAD_SCALE;

const gaussianScore = (d, sigma = 0.12) =>
    100 * Math.exp(-((d / sigma) ** 2));

const frameDistance = (a, b, weights = null) => {
    const keys = Object.keys(a);
    let sum = 0;
    let weightSum = 0;
    for (const k of keys) {
        if (!(k in b)) continue;
        const w = weights ? (weights[k] ?? 1.0) : 1.0;
        sum += Math.abs(normalizeAngle(a[k]) - normalizeAngle(b[k])) * w;
        weightSum += w;
    }
    return weightSum > 0 ? sum / weightSum : 0;
};

const cosineSimilarity = (a, b) => {
    const keys = Object.keys(a).filter((k) => k in b);
    let dot = 0, magA = 0, magB = 0;
    for (const k of keys) {
        const va = normalizeAngle(a[k]);
        const vb = normalizeAngle(b[k]);
        dot += va * vb;
        magA += va * va;
        magB += vb * vb;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 1;
};

function computeDerivatives(seq) {
    if (seq.length < 2) return [];
    const keys = Object.keys(seq[0]);
    const derivs = [];
    for (let i = 1; i < seq.length; i++) {
        const d = {};
        for (const k of keys) {
            d[k] = seq[i][k] - seq[i - 1][k];
        }
        derivs.push(d);
    }
    return derivs;
}

function motionEnergy(seq) {
    if (seq.length < 2) return 0;
    const keys = Object.keys(seq[0]);
    let total = 0;
    for (let i = 1; i < seq.length; i++) {
        for (const k of keys) {
            total += Math.abs(normalizeAngle(seq[i][k]) - normalizeAngle(seq[i - 1][k]));
        }
    }
    return total / ((seq.length - 1) * keys.length);
}

function computeJointWeights(seq) {
    if (seq.length < 2) return null;

    const keys = Object.keys(seq[0]);
    const n = seq.length;
    const FLOOR = 0.3;
    const BOOST_FACTOR = 2.5;

    const means = {};
    const variances = {};

    for (const k of keys) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += normalizeAngle(seq[i][k]);
        means[k] = sum / n;

        let sumSq = 0;
        for (let i = 0; i < n; i++) {
            const diff = normalizeAngle(seq[i][k]) - means[k];
            sumSq += diff * diff;
        }
        variances[k] = sumSq / n;
    }

    let maxVar = 0;
    for (const k of keys) maxVar = Math.max(maxVar, variances[k]);

    const weights = {};
    if (maxVar < 1e-8) {
        for (const k of keys) weights[k] = 1.0;
    } else {
        for (const k of keys) {
            weights[k] = FLOOR + BOOST_FACTOR * (variances[k] / maxVar);
        }
        let wSum = 0;
        for (const k of keys) wSum += weights[k];
        const wMean = wSum / keys.length;
        for (const k of keys) weights[k] /= wMean;
    }

    return weights;
}

export function computeDTW(seq1, seq2, bandRatio = 0.3, weights = null) {
    const n = seq1.length;
    const m = seq2.length;
    if (n === 0 || m === 0) return Infinity;

    const w = Math.max(Math.ceil(Math.max(n, m) * bandRatio), Math.abs(n - m));
    let prev = new Float64Array(m + 1).fill(Infinity);
    let curr = new Float64Array(m + 1).fill(Infinity);

    prev[0] = 0;

    for (let i = 1; i <= n; i++) {
        curr.fill(Infinity);
        const jMin = Math.max(1, Math.ceil((i * m) / n) - w);
        const jMax = Math.min(m, Math.floor((i * m) / n) + w);

        for (let j = jMin; j <= jMax; j++) {
            const cost = frameDistance(seq1[i - 1], seq2[j - 1], weights);
            curr[j] = cost + Math.min(prev[j], curr[j - 1], prev[j - 1]);
        }

        [prev, curr] = [curr, prev];
    }

    const pathLength = n + m;
    return prev[m] / pathLength;
}

function staticMatchScore(camBuffer, refBuffer, weights) {
    const count = Math.min(camBuffer.length, refBuffer.length, 10);
    if (count === 0) return 100;

    let distSum = 0;
    let cosSum = 0;

    for (let i = 0; i < count; i++) {
        const ci = camBuffer[camBuffer.length - 1 - i];
        const ri = refBuffer[refBuffer.length - 1 - i];
        distSum += frameDistance(ci, ri, weights);
        cosSum += cosineSimilarity(ci, ri);
    }

    const avgDist = distSum / count;
    const avgCos = cosSum / count;
    const distScore = gaussianScore(avgDist, 0.15);
    const cosFactor = Math.max(0, (avgCos + 1) / 2);
    return distScore * (0.7 + 0.3 * cosFactor);
}

function detectLoopReset(buffer, threshold = 0.25) {
    if (buffer.length < 2) return false;
    const prev = buffer[buffer.length - 2];
    const curr = buffer[buffer.length - 1];
    const keys = Object.keys(curr);
    let totalDelta = 0;
    for (const k of keys) {
        if (k in prev) {
            totalDelta += Math.abs(normalizeAngle(curr[k]) - normalizeAngle(prev[k]));
        }
    }
    const avgDelta = totalDelta / keys.length;
    return avgDelta > threshold;
}

export class DTWAnalyzer {
    constructor(opts = {}) {
        this.windowSize = opts.windowSize ?? 90;
        this.computeEvery = opts.computeEvery ?? 15;
        this.smoothingFactor = opts.smoothingFactor ?? 0.5;
        this.bandRatio = opts.bandRatio ?? 0.3;
        this.idleThreshold = opts.idleThreshold ?? 0.003;
        this.minConfidence = opts.minConfidence ?? 0.1;
        this.spikeDampenThreshold = opts.spikeDampenThreshold ?? 25;
        this.spikeSmoothingFactor = opts.spikeSmoothingFactor ?? 0.92;

        this.cameraBuffer = [];
        this.referenceBuffer = [];

        this._frameCounter = 0;
        this._currentMatch = 0;
        this._smoothedMatch = 0;
        this._initialized = false;

        this._scoreSum = 0;
        this._scoreCount = 0;

        this._refsSinceLastCam = 0;

        this.lastJointWeights = null;
    }

    addCameraFrame(angles, confidence = 1.0) {
        if (confidence < this.minConfidence) return;

        this.cameraBuffer.push(angles);
        if (this.cameraBuffer.length > this.windowSize) {
            this.cameraBuffer.shift();
        }
        this._frameCounter++;
        this._refsSinceLastCam = 0;
    }

    addReferenceFrame(angles, confidence = 1.0) {
        if (confidence < this.minConfidence) return;

        this.referenceBuffer.push(angles);
        this._refsSinceLastCam++;

        if (this.referenceBuffer.length > 2 && detectLoopReset(this.referenceBuffer)) {
            const latest = this.referenceBuffer[this.referenceBuffer.length - 1];
            this.referenceBuffer = [latest];
            return;
        }

        if (this.referenceBuffer.length > this.windowSize) {
            this.referenceBuffer.shift();
        }
    }

    getMatch() {
        const MIN_FRAMES = 15;
        if (
            this.cameraBuffer.length < MIN_FRAMES ||
            this.referenceBuffer.length < MIN_FRAMES
        ) {
            return this._initialized ? this._currentMatch : null;
        }

        if (this._refsSinceLastCam > 5 && this._initialized) {
            const decayRate = 0.97;
            this._currentMatch *= decayRate;
            this._smoothedMatch *= decayRate;

            if (this._frameCounter % this.computeEvery === 0) {
                this._scoreSum += this._smoothedMatch;
                this._scoreCount++;
            }
            return this._currentMatch;
        }

        if (this._frameCounter % this.computeEvery !== 0) {
            return this._currentMatch;
        }

        const jointWeights = computeJointWeights(this.referenceBuffer);
        this.lastJointWeights = jointWeights;
        const camEnergy = motionEnergy(this.cameraBuffer);
        const refEnergy = motionEnergy(this.referenceBuffer);
        const bothIdle =
            camEnergy < this.idleThreshold && refEnergy < this.idleThreshold;

        let blended;

        if (bothIdle) {
            blended = staticMatchScore(
                this.cameraBuffer,
                this.referenceBuffer,
                jointWeights
            );
        } else {
            const rawDist = computeDTW(
                this.cameraBuffer,
                this.referenceBuffer,
                this.bandRatio,
                jointWeights
            );
            const rawScore = gaussianScore(rawDist, 0.10);
            const camDerivs = computeDerivatives(this.cameraBuffer);
            const refDerivs = computeDerivatives(this.referenceBuffer);

            let derivScore = rawScore;
            if (camDerivs.length >= 4 && refDerivs.length >= 4) {
                const derivDist = computeDTW(
                    camDerivs,
                    refDerivs,
                    this.bandRatio,
                    jointWeights
                );
                derivScore = gaussianScore(derivDist, 0.08);
            }

            const latestCam = this.cameraBuffer[this.cameraBuffer.length - 1];
            const latestRef = this.referenceBuffer[this.referenceBuffer.length - 1];
            const cos = cosineSimilarity(latestCam, latestRef);
            const cosScore = Math.max(0, ((cos + 1) / 2) * 100);

            const maxEnergy = Math.max(camEnergy, refEnergy);
            const motionLevel = Math.min(1.0, maxEnergy / 0.02);

            const wRaw = 0.45 - 0.15 * motionLevel;
            const wDeriv = 0.25 + 0.20 * motionLevel;
            const wCos = 0.30 - 0.05 * motionLevel;

            let score = rawScore * wRaw + derivScore * wDeriv + cosScore * wCos;

            if (refEnergy > this.idleThreshold) {
                const energyRatio = camEnergy / Math.max(refEnergy, 1e-6);
                if (energyRatio < 0.5) {
                    const penalty = Math.max(0.05, Math.pow(energyRatio / 0.5, 1.5));
                    score *= penalty;
                }
            }

            blended = score;
        }

        blended = Math.max(0, Math.min(100, blended));

        const delta = Math.abs(blended - this._smoothedMatch);
        let alpha;

        if (blended > this._smoothedMatch + 20) {
            alpha = this.smoothingFactor;
        } else if (delta > this.spikeDampenThreshold) {
            alpha = this.spikeSmoothingFactor;
        } else {
            alpha = this.smoothingFactor;
        }

        if (!this._initialized) {
            this._currentMatch = blended;
            this._smoothedMatch = blended;
            this._initialized = true;
        } else {
            this._smoothedMatch = this._smoothedMatch * alpha + blended * (1 - alpha);
            this._currentMatch = this._currentMatch * 0.2 + blended * 0.8;
        }

        this._scoreSum += this._smoothedMatch;
        this._scoreCount++;

        return this._currentMatch;
    }

    get cameraFrameCount() {
        return this.cameraBuffer.length;
    }

    get referenceFrameCount() {
        return this.referenceBuffer.length;
    }

    get isCameraStale() {
        return this._refsSinceLastCam > 5 && this._initialized;
    }

    getMeanAccuracy() {
        return this._scoreCount > 0 ? this._scoreSum / this._scoreCount : 0;
    }

    reset() {
        this.cameraBuffer = [];
        this.referenceBuffer = [];
        this._frameCounter = 0;
        this._currentMatch = 0;
        this._smoothedMatch = 0;
        this._initialized = false;
        this._scoreSum = 0;
        this._scoreCount = 0;
        this._refsSinceLastCam = 0;
        this.lastJointWeights = null;
    }
}
