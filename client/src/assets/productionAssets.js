export const PRODUCTION_ASSET_SCHEMA_VERSION = 1;

export const REQUIRED_MESH_ROLES = Object.freeze([
  "frame",
  "arm_left",
  "arm_right",
  "seat_cushion_01",
  "seat_cushion_02",
  "seat_cushion_03",
  "back_cushion_01",
  "back_cushion_02",
  "back_cushion_03",
  "leg_front_left",
  "leg_front_right",
  "leg_rear_left",
  "leg_rear_right",
  "leg_support_center",
]);

export const REQUIRED_MATERIAL_ROLES = Object.freeze([
  "upholstery_primary",
  "piping",
  "stitching",
  "legs_matte_black",
]);

export const butterflyProductionAsset = Object.freeze({
  schemaVersion: PRODUCTION_ASSET_SCHEMA_VERSION,
  id: "butterfly",
  displayName: "Butterfly",
  catalogueModelId: null,
  version: "0.5.2",
  status: "review",
  sourceRevision: "butterfly-geometry-v03-approved-arm-culling-repair-v052",
  coordinateSystem: Object.freeze({
    units: "metres",
    upAxis: "Y",
    origin: "floor-centre",
    forwardAxis: "Z",
  }),
  measurementsMm: Object.freeze({
    overallWidth: 1880,
    overallDepth: 900,
    overallHeightIncludingCushions: 1020,
    upholsteredFrameHeight: 900,
    seatHeight: 450,
    seatDepthUsable: 560,
    seatCushionWidth: 580,
    seatCushionThickness: 200,
    seatCushionCount: 3,
    backFrameHeightAboveSeat: 450,
    backCushionWidth: 560,
    backCushionHeight: 560,
    backCushionThickness: 200,
    backCushionCount: 3,
    armWidth: 75,
    armHeightFromFloor: 700,
    armLength: 900,
    legHeight: 200,
  }),
  construction: Object.freeze({
    frame: "MS metal frame, fully upholstered",
    upholstery: "Blue velvet with double stitching and piped edges",
    cushions: "Three removable button-tufted back cushions with zip covers",
    legs: "Bolted tapered MS metal legs in matte black with centre supports",
  }),
  meshRoles: REQUIRED_MESH_ROLES,
  materialRoles: REQUIRED_MATERIAL_ROLES,
  internalReview: Object.freeze({
    enabled: true,
    catalogueModelIds: Object.freeze(["the-mercer"]),
  }),
  variants: Object.freeze([
    Object.freeze({
      id: "butterfly-1880",
      label: "1880 × 900 mm",
      assetUri: "/assets/products/butterfly/delivery/0.5.2/models/butterfly-1880-lod0.glb",
      fallbackImageUri: "/assets/products/butterfly/delivery/0.5.2/previews/butterfly-v052-preview.png",
      expectedBoundsMetres: Object.freeze({ x: 1.88, y: 1.02, z: 0.9 }),
      status: "review",
    }),
  ]),
});

const productionAssets = new Map([[butterflyProductionAsset.id, butterflyProductionAsset]]);

export function getProductionAsset(assetId) {
  return productionAssets.get(assetId) ?? null;
}

export function getInternalReviewProductionAsset(modelId) {
  if (typeof modelId !== "string" || !modelId) return null;
  return [...productionAssets.values()].find((asset) => (
    asset.internalReview?.enabled
    && asset.internalReview.catalogueModelIds?.includes(modelId)
  )) ?? null;
}

export function getPreferredProductionVariant(asset) {
  return asset?.variants?.find((variant) => variant.assetUri) ?? null;
}

export function validateProductionAssetManifest(asset) {
  const errors = [];
  if (!asset || typeof asset !== "object") return { valid: false, errors: ["Manifest is required."] };
  if (asset.schemaVersion !== PRODUCTION_ASSET_SCHEMA_VERSION) errors.push("Unsupported schema version.");
  if (!asset.id || typeof asset.id !== "string") errors.push("Asset id is required.");
  if (asset.coordinateSystem?.units !== "metres") errors.push("Model units must be metres.");
  if (asset.coordinateSystem?.upAxis !== "Y") errors.push("Model must use Y-up coordinates.");
  if (asset.coordinateSystem?.origin !== "floor-centre") errors.push("Model origin must be floor-centre.");

  for (const field of ["overallWidth", "overallDepth", "overallHeightIncludingCushions", "seatHeight"]) {
    if (!Number.isFinite(asset.measurementsMm?.[field]) || asset.measurementsMm[field] <= 0) {
      errors.push(`Measurement ${field} must be a positive number.`);
    }
  }

  for (const role of REQUIRED_MESH_ROLES) {
    if (!asset.meshRoles?.includes(role)) errors.push(`Missing mesh role: ${role}.`);
  }
  for (const role of REQUIRED_MATERIAL_ROLES) {
    if (!asset.materialRoles?.includes(role)) errors.push(`Missing material role: ${role}.`);
  }
  if (!Array.isArray(asset.variants) || asset.variants.length === 0) errors.push("At least one geometry variant is required.");
  if (asset.internalReview?.enabled && !Array.isArray(asset.internalReview.catalogueModelIds)) {
    errors.push("Internal review catalogue bindings must be an array.");
  }

  return { valid: errors.length === 0, errors };
}

export function getProductionAssetReadiness(asset) {
  const validation = validateProductionAssetManifest(asset);
  if (!validation.valid) return { status: "invalid", errors: validation.errors };
  const missingFiles = asset.variants.filter((variant) => !variant.assetUri).map((variant) => variant.id);
  if (missingFiles.length > 0) return { status: "awaiting-glb", missingFiles };
  const awaitingApproval = asset.status !== "approved" || asset.variants.some((variant) => variant.status !== "approved");
  return awaitingApproval
    ? { status: "review", missingFiles: [] }
    : { status: "ready", missingFiles: [] };
}
