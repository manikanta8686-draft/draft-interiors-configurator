export const fabricCategories = [
  "Velvet",
  "Bouclé",
  "Linen",
  "Leather",
  "Cotton",
  "Performance Fabric",
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
const pendingTexture = { baseColor: null, normal: null, roughness: null };

export const fabrics = [
  {
    id: "italian-linen",
    name: "Italian Linen",
    category: "Linen",
    description: null,
    priceAdjustment: 0,
    texture: pendingTexture,
    durability: null,
    careInformation: null,
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.72, metalness: 0 },
  },
  {
    id: "brushed-velvet",
    name: "Brushed Velvet",
    category: "Velvet",
    description: null,
    priceAdjustment: 12500,
    texture: pendingTexture,
    durability: null,
    careInformation: null,
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.35, metalness: 0.08 },
  },
  {
    id: "textured-boucle",
    name: "Textured Boucle",
    category: "Bouclé",
    description: null,
    priceAdjustment: 21000,
    texture: pendingTexture,
    durability: null,
    careInformation: null,
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.95, metalness: 0 },
  },
  {
    id: "leather",
    name: "Leather",
    category: "Leather",
    description: null,
    priceAdjustment: null,
    texture: pendingTexture,
    durability: null,
    careInformation: null,
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.72, metalness: 0 },
  },
  {
    id: "cotton",
    name: "Cotton",
    category: "Cotton",
    description: null,
    priceAdjustment: null,
    texture: pendingTexture,
    durability: null,
    careInformation: null,
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.72, metalness: 0 },
  },
  {
    id: "performance-fabric",
    name: "Performance Fabric",
    category: "Performance Fabric",
    description: null,
    priceAdjustment: null,
    texture: pendingTexture,
    durability: null,
    careInformation: null,
    compatibility: unrestrictedCompatibility,
    available: true,
    colors: colourIds,
    material: { roughness: 0.72, metalness: 0 },
  },
];

export const collectionFabricIds = ["italian-linen", "brushed-velvet", "textured-boucle"];

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
