// This Bezier maps exactly to smoothstep: 3t² - 2t³.
export const PREMIUM_EASE = [1 / 3, 0, 2 / 3, 1];

export const PREMIUM_MOTION = Object.freeze({
  uiDuration: 0.22,
  viewerDuration: 0.48,
});

export function easePremium(progress) {
  const value = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return value * value * (3 - 2 * value);
}

export function resolveViewerMotion(reducedMotion) {
  return reducedMotion
    ? { revealDuration: 0, cameraDuration: 0, settleDistance: 0 }
    : {
      revealDuration: PREMIUM_MOTION.viewerDuration,
      cameraDuration: PREMIUM_MOTION.viewerDuration,
      settleDistance: 0.04,
    };
}
