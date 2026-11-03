const RAD2DEG = 180 / Math.PI;

function applyDeadZone(value, deadZoneThreshold) {
  if (Math.abs(value) <= deadZoneThreshold) return 0;
  return value > 0 ? value - deadZoneThreshold : value + deadZoneThreshold;
}

export function computeTrunkMetrics(landmarks) {
  if (!landmarks || landmarks.length <= 24) return null;

  const sL = landmarks[11]; // Lewy bark
  const sR = landmarks[12]; // Prawy bark
  const hL = landmarks[23]; // Lewe biodro
  const hR = landmarks[24]; // Prawe biodro

  if (!sL || !sR || !hL || !hR) return null;
  if (
    typeof sL.x !== "number" ||
    typeof sR.x !== "number" ||
    typeof hL.x !== "number" ||
    typeof hR.x !== "number"
  ) {
    return null;
  }

  const dxS = Math.abs(sL.x - sR.x) || 1e-6;
  const dyS = sL.y - sR.y;
  const shoulderRoll = Math.atan2(dyS, dxS) * RAD2DEG;

  const dxH = Math.abs(hL.x - hR.x) || 1e-6;
  const dyH = hL.y - hR.y;
  const hipRoll = Math.atan2(dyH, dxH) * RAD2DEG;

  let rawTilt = Math.abs(shoulderRoll - hipRoll);
  if (rawTilt > 180) rawTilt = 360 - rawTilt;
  const lateralTiltDev = Math.min(180, rawTilt);

  const dzS = sL.z - sR.z;
  const shoulderYaw = Math.atan2(dzS, dxS) * RAD2DEG;

  const dzH = hL.z - hR.z;
  const hipYaw = Math.atan2(dzH, dxH) * RAD2DEG;

  let rawTwist = Math.abs(shoulderYaw - hipYaw);
  if (rawTwist > 180) rawTwist = 360 - rawTwist;
  const trunkTwist = Math.min(180, rawTwist);

  const centerShoulder = {
    x: (sL.x + sR.x) / 2,
    y: (sL.y + sR.y) / 2,
    z: (sL.z + sR.z) / 2,
  };
  const centerHip = {
    x: (hL.x + hR.x) / 2,
    y: (hL.y + hR.y) / 2,
    z: (hL.z + hR.z) / 2,
  };

  const spineVec = {
    x: centerShoulder.x - centerHip.x,
    y: centerShoulder.y - centerHip.y,
    z: centerShoulder.z - centerHip.z,
  };

  const upY = Math.abs(spineVec.y) || 1e-6;
  const pitchAngle = Math.min(
    180,
    Math.abs(Math.atan2(spineVec.z, upY) * RAD2DEG),
  );

  const filteredTilt = applyDeadZone(lateralTiltDev, 3.0);
  const filteredTwist = applyDeadZone(trunkTwist, 8.0);
  const filteredPitch = applyDeadZone(pitchAngle, 10.0);

  const compensationScore = Math.min(
    100,
    1.0 * filteredTilt + 0.8 * filteredTwist + 0.6 * filteredPitch,
  );

  const stabilityIndex = Math.max(0, 100 - compensationScore);

  return {
    shoulderRoll,
    hipRoll,
    lateralTiltDev,
    shoulderYaw,
    hipYaw,
    trunkTwist,
    pitchAngle,
    compensationScore,
    stabilityIndex,
  };
}