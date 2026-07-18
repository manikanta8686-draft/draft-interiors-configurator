const FALLBACK_COLOR = "#777777";
const DEFAULT_REPEAT = [1, 1];
const DEFAULT_PRESENTATION = {
  roughnessFloor: 0.74,
  sheen: 0.03,
  sheenRoughness: 0.92,
  clearcoat: 0,
  clearcoatRoughness: 0.86,
  normalStrength: 0.5,
  specularIntensity: 0.32,
  envMapIntensity: 0.56,
};
const FABRIC_PRESENTATION = {
  "italian-linen": { roughnessFloor: 0.82, sheen: 0.035, normalStrength: 0.85, specularIntensity: 0.26 },
  "brushed-velvet": { roughnessFloor: 0.52, sheen: 0.18, sheenRoughness: 0.82, normalStrength: 0.25, specularIntensity: 0.32, envMapIntensity: 0.5 },
  suede: { roughnessFloor: 0.76, sheen: 0.1, sheenRoughness: 0.94, normalStrength: 0.5, specularIntensity: 0.24, envMapIntensity: 0.42 },
  "textured-boucle": { roughnessFloor: 0.94, sheen: 0.025, sheenRoughness: 0.96, normalStrength: 1.15, specularIntensity: 0.22, envMapIntensity: 0.46 },
  leather: { roughnessFloor: 0.58, sheen: 0.02, clearcoat: 0.16, clearcoatRoughness: 0.68, normalStrength: 0.65, specularIntensity: 0.56, envMapIntensity: 0.68 },
  cotton: { roughnessFloor: 0.82, sheen: 0.025, normalStrength: 0.54, specularIntensity: 0.26 },
  "performance-fabric": { roughnessFloor: 0.74, sheen: 0.03, normalStrength: 0.65, specularIntensity: 0.28 },
};

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

export function resolveFabricPresentation(fabricId) {
  return { ...DEFAULT_PRESENTATION, ...FABRIC_PRESENTATION[fabricId] };
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
