export const fabricCategories = [
  "Performance Polyester / Microfiber",
  "Cotton Chenille",
  "Polyester Velvet",
  "Suede",
  "Linen & Jute Blend",
  "Leatherette / PU",
];

export const colours = [
  { id: "oat", name: "Oat", hex: "#c9b99e", textureOverride: null, available: true },
  { id: "moss", name: "Moss", hex: "#53604c", textureOverride: null, available: true },
  { id: "terracotta", name: "Terracotta", hex: "#9d5d47", textureOverride: null, available: true },
  { id: "ink", name: "Ink", hex: "#30383a", textureOverride: null, available: true },
  { id: "cloud", name: "Cloud", hex: "#ded9cf", textureOverride: null, available: true },
];

const colourIds = colours.map((colour) => colour.id);
const unrestrictedCompatibility = { modelIds: null, modelCategories: null };
const upholsteryTexture = (slug, repeat) => ({
  baseColor: `/assets/materials/upholstery/${slug}/basecolor-neutral.jpg?v=2`,
  normal: `/assets/materials/upholstery/${slug}/normal-gl.jpg?v=2`,
  roughness: `/assets/materials/upholstery/${slug}/roughness.jpg?v=2`,
  repeat,
});

export const fabrics = [
  {
    id: "performance-fabric",
    name: "Performance Polyester / Microfiber",
    category: "Performance Polyester / Microfiber",
    pricingTier: "Standard",
    description: "Stain-, moisture- and fade-resistant upholstery for high-traffic Indian homes.",
    texture: upholsteryTexture("performance", [10, 10]),
    durability: "High",
    careInformation: "Vacuum regularly and blot spills promptly with a clean, dry cloth.",
    climateGuidance: "Suitable for everyday use across dry, humid and air-conditioned interiors.",
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.68, metalness: 0 },
  },
  {
    id: "italian-linen",
    name: "Linen & Jute Blend",
    category: "Linen & Jute Blend",
    pricingTier: "Luxury",
    description: "A breathable, naturally textured blend for design-led, lower-traffic rooms.",
    texture: upholsteryTexture("linen-jute", [9, 9]),
    durability: "Moderate",
    careInformation: "Vacuum gently, keep dry and use professional cleaning for stains.",
    climateGuidance: "Best in dry or air-conditioned rooms; avoid prolonged humidity in coastal cities.",
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.72, metalness: 0 },
  },
  {
    id: "brushed-velvet",
    name: "Polyester Velvet",
    category: "Polyester Velvet",
    pricingTier: "Luxury",
    description: "Soft, formal upholstery with a rich directional sheen for premium living rooms.",
    texture: upholsteryTexture("velvet", [5, 5]),
    durability: "Moderate",
    careInformation: "Brush the pile regularly and avoid wet spot-cleaning that may leave watermarks.",
    climateGuidance: "Best for formal interiors with moderate use and controlled moisture.",
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.35, metalness: 0.08 },
  },
  {
    id: "suede",
    name: "Suede",
    category: "Suede",
    pricingTier: "Premium",
    description: "Soft, matte upholstery with a refined tactile finish for comfortable premium seating.",
    texture: upholsteryTexture("suede", [5, 5]),
    durability: "Medium to high",
    careInformation: "Vacuum with a soft brush, blot spills immediately and avoid soaking or harsh cleaners.",
    climateGuidance: "Best in dry or air-conditioned interiors; regular brushing helps maintain the nap in humid weather.",
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.66, metalness: 0 },
  },
  {
    id: "textured-boucle",
    name: "Cotton Chenille",
    category: "Cotton Chenille",
    pricingTier: "Premium",
    description: "Soft, breathable upholstery with a comfortable natural hand for warm Indian homes.",
    texture: upholsteryTexture("chenille", [8, 8]),
    durability: "Medium to high",
    careInformation: "Vacuum with a soft brush and apply a fabric protector in humid environments.",
    climateGuidance: "Comfortable in unconditioned rooms; protect from moisture in coastal climates.",
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.95, metalness: 0 },
  },
  {
    id: "leather",
    name: "Leatherette / PU",
    category: "Leatherette / PU",
    pricingTier: "Standard",
    description: "Budget-friendly, spill-resistant upholstery that is simple to wipe clean.",
    texture: upholsteryTexture("leatherette", [4, 4]),
    durability: "Medium",
    careInformation: "Wipe with a damp soft cloth and keep away from direct heat and harsh cleaners.",
    climateGuidance: "Easy to maintain, but less breathable in hot and humid rooms.",
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.55, metalness: 0 },
  },
];

export const collectionFabricIds = ["performance-fabric", "textured-boucle", "brushed-velvet"];

export function getFabricById(fabricId) {
  return fabrics.find((fabric) => fabric.id === fabricId) ?? null;
}

export function getColourById(colourId) {
  return colours.find((colour) => colour.id === colourId) ?? null;
}

export function getCompatibleFabrics(model) {
  return fabrics.filter((fabric) => {
    if (!fabric.available) return false;
    const { modelIds, modelCategories } = fabric.compatibility;
    return (!modelIds || modelIds.includes(model.id))
      && (!modelCategories || modelCategories.includes(model.category));
  });
}

export function getAvailableColours(fabric) {
  if (!fabric) return [];
  return fabric.colors
    .map(getColourById)
    .filter((colour) => colour?.available);
}
