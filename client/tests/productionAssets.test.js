import assert from "node:assert/strict";
import test from "node:test";
import {
  butterflyProductionAsset,
  getProductionAsset,
  getProductionAssetReadiness,
  PRODUCTION_ASSET_SCHEMA_VERSION,
  validateProductionAssetManifest,
} from "../src/assets/productionAssets.js";
import { createDefaultConfiguration, getViewerConfiguration } from "../src/configurator/configuration.js";
import { sofaModels } from "../src/data/sofas.js";

test("Butterfly is a valid inactive production asset contract", () => {
  const validation = validateProductionAssetManifest(butterflyProductionAsset);
  assert.deepEqual(validation, { valid: true, errors: [] });
  assert.equal(butterflyProductionAsset.catalogueModelId, null);
  assert.equal(getProductionAsset("butterfly"), butterflyProductionAsset);
  assert.equal(getProductionAsset("unknown"), null);
});

test("Butterfly remains unavailable until a real GLB is supplied", () => {
  assert.deepEqual(getProductionAssetReadiness(butterflyProductionAsset), {
    status: "awaiting-glb",
    missingFiles: ["butterfly-1880"],
  });
});

test("invalid production manifests fail closed", () => {
  const invalid = {
    ...butterflyProductionAsset,
    schemaVersion: PRODUCTION_ASSET_SCHEMA_VERSION + 1,
    coordinateSystem: { units: "millimetres", upAxis: "Z", origin: "object-centre" },
    measurementsMm: { ...butterflyProductionAsset.measurementsMm, overallWidth: 0 },
    meshRoles: [],
  };
  const validation = validateProductionAssetManifest(invalid);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.length > 4);
  assert.equal(getProductionAssetReadiness(invalid).status, "invalid");
});

test("the viewer boundary carries exact catalogue identity without changing persistence", () => {
  const model = sofaModels[0];
  const configuration = createDefaultConfiguration(model);
  const viewer = getViewerConfiguration(configuration, model);
  assert.equal(viewer.modelId, model.id);
  assert.equal(viewer.exactSize, configuration.size);
});
