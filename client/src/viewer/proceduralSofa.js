const SIZE_WIDTHS = {
  Compact: 3.25,
  Standard: 4.15,
  Grand: 4.85,
};

const LEG_FINISHES = {
  Oak: { color: "#9b7249", metalness: 0, roughness: 0.48 },
  Walnut: { color: "#49352b", metalness: 0, roughness: 0.4 },
  Brass: { color: "#b18a46", metalness: 0.82, roughness: 0.27 },
};

function finiteCushionCount(value) {
  return Number.isInteger(value) ? Math.min(5, Math.max(2, value)) : 3;
}

export function calculateProceduralDimensions({ size = "Standard", type = "Standard" } = {}) {
  const width = SIZE_WIDTHS[size] ?? SIZE_WIDTHS.Standard;
  const chaise = type === "Chaise";

  return {
    width,
    depth: chaise ? 2.55 : 1.58,
    height: 1.82,
    seatTop: 0.94,
    armWidth: 0.31,
    groundClearance: 0.34,
    chaise,
  };
}

export function calculateCushionLayout({ width, cushions, chaise = false }) {
  const count = finiteCushionCount(cushions);
  const innerWidth = width - 0.78;
  const gap = 0.055;
  const cushionWidth = (innerWidth - gap * (count - 1)) / count;
  const firstX = -innerWidth / 2 + cushionWidth / 2;

  return Array.from({ length: count }, (_, index) => {
    const isChaiseCushion = chaise && index === count - 1;
    return {
      id: index,
      x: firstX + index * (cushionWidth + gap),
      seatZ: isChaiseCushion ? 0.46 : 0.06,
      seatDepth: isChaiseCushion ? 2.18 : 1.13,
      seatRotation: (index - (count - 1) / 2) * 0.004,
      backRotation: (index - (count - 1) / 2) * -0.008,
      width: cushionWidth,
    };
  });
}

export function calculateCameraFraming(dimensions, aspectRatio = 1.45) {
  const width = dimensions?.width ?? SIZE_WIDTHS.Standard;
  const depth = dimensions?.depth ?? 1.58;
  const chaiseOffset = dimensions?.chaise ? 0.28 : 0;
  const distance = Math.max(5.35, width * 1.16 + depth * 0.58);
  const narrowViewportScale = Number.isFinite(aspectRatio) && aspectRatio < 1.2
    ? 1.2 / Math.max(0.7, aspectRatio)
    : 1;

  return {
    position: [width * 0.74 * narrowViewportScale, 2.55 + (width - SIZE_WIDTHS.Standard) * 0.12, distance * narrowViewportScale],
    target: [0, 0.9, chaiseOffset],
    minDistance: Math.max(4.2, distance * 0.72 * narrowViewportScale),
    maxDistance: distance * 1.48 * narrowViewportScale,
  };
}

export function resolveLegFinish(finish) {
  return LEG_FINISHES[finish] ?? LEG_FINISHES.Oak;
}
