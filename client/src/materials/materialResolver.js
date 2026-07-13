const FALLBACK_COLOR = "#777777";
const DEFAULT_REPEAT = [1, 1];

function clamp(value, minimum, maximum, fallback) {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

export function resolveTextureReference(value) {
  if (typeof value !== "string") return null;
  const reference = value.trim();
  if (!reference || /^(?:javascript|vbscript):/i.test(reference)) return null;
  return /^(?:https?:\/\/|\/(?!\/)|\.{1,2}\/)/i.test(reference) ? reference : null;
}

export function resolveTextureRepeat(value) {
  if (!Array.isArray(value) || value.length !== 2) return DEFAULT_REPEAT;
  const [x, y] = value;
  return Number.isFinite(x) && x > 0 && Number.isFinite(y) && y > 0
    ? [x, y]
    : DEFAULT_REPEAT;
}

export function resolveSofaMaterial({ color, material, texture } = {}) {
  const safeColor = typeof color === "string" && /^#[\da-f]{6}$/i.test(color)
    ? color
    : FALLBACK_COLOR;

  return {
    color: safeColor,
    roughness: clamp(material?.roughness, 0.2, 1, 0.72),
    metalness: clamp(material?.metalness, 0, 0.15, 0),
    maps: {
      baseColor: resolveTextureReference(texture?.baseColor),
      normal: resolveTextureReference(texture?.normal),
      roughness: resolveTextureReference(texture?.roughness),
    },
    repeat: resolveTextureRepeat(texture?.repeat),
  };
}
