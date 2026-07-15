// This Bezier maps exactly to smoothstep: 3t² - 2t³.
export const PREMIUM_EASE = [1 / 3, 0, 2 / 3, 1];

export const PREMIUM_MOTION = Object.freeze({
  instantDuration: 0.12,
  uiDuration: 0.22,
  panelDuration: 0.36,
  viewerDuration: 0.48,
});

export const pageTransition = Object.freeze({
  duration: PREMIUM_MOTION.uiDuration,
  ease: PREMIUM_EASE,
});

export const revealTransition = (delay = 0) => ({
  duration: PREMIUM_MOTION.panelDuration,
  delay,
  ease: PREMIUM_EASE,
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
