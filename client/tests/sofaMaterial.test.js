import test from "node:test";
import assert from "node:assert/strict";
import { colours, fabrics } from "../src/data/fabrics.js";
import {
  configurationReducer,
  createDefaultConfiguration,
  getViewerConfiguration,
  parseSavedConfiguration,
  resolveSofaModel,
} from "../src/configurator/configuration.js";
import {
  resolveSofaMaterial,
  resolveTextureReference,
  resolveTextureRepeat,
} from "../src/materials/materialResolver.js";
import {
  getCachedTextureState,
  loadCachedTexture,
} from "../src/materials/textureCache.js";

test("every catalogue fabric and colour resolves to a visible material", () => {
  const roughnessValues = new Set();

  for (const fabric of fabrics) {
    for (const colour of colours) {
      const resolved = resolveSofaMaterial({
        color: colour.hex,
        material: fabric.material,
        texture: fabric.texture,
      });
      assert.equal(resolved.color, colour.hex);
      assert.ok(resolved.roughness >= 0.2 && resolved.roughness <= 1);
      assert.ok(resolved.metalness >= 0 && resolved.metalness <= 0.15);
      assert.deepEqual(resolved.maps, { baseColor: null, normal: null, roughness: null });
      roughnessValues.add(resolved.roughness);
    }
  }

  assert.ok(roughnessValues.size > 1);
});

test("valid texture metadata resolves with safe repeat values", () => {
  const resolved = resolveSofaMaterial({
    color: "#123456",
    material: { roughness: 0.6, metalness: 0.04 },
    texture: {
      baseColor: "/textures/fabric-color.webp",
      normal: "https://example.com/fabric-normal.webp",
      roughness: "../textures/fabric-roughness.webp",
      repeat: [3, 2],
    },
  });

  assert.deepEqual(resolved.maps, {
    baseColor: "/textures/fabric-color.webp",
    normal: "https://example.com/fabric-normal.webp",
    roughness: "../textures/fabric-roughness.webp",
  });
  assert.deepEqual(resolved.repeat, [3, 2]);
});

test("invalid material and texture metadata falls back safely", () => {
  assert.equal(resolveTextureReference("javascript:alert(1)"), null);
  assert.equal(resolveTextureReference("fabric.webp"), null);
  assert.deepEqual(resolveTextureRepeat([0, -1]), [1, 1]);
  assert.deepEqual(resolveSofaMaterial({
    color: "invalid",
    material: { roughness: 20, metalness: -3 },
    texture: { baseColor: "missing.webp", repeat: "large" },
  }), {
    color: "#777777",
    roughness: 1,
    metalness: 0,
    maps: { baseColor: null, normal: null, roughness: null },
    repeat: [1, 1],
  });
});

test("failed optional texture loads resolve to a cached error without throwing", async () => {
  const reference = "/textures/missing-test-texture.webp";
  const repeat = [1, 1];
  assert.equal(await loadCachedTexture(reference, "baseColor", repeat), null);
  assert.equal(getCachedTextureState(reference, "baseColor", repeat).status, "error");
  assert.equal(await loadCachedTexture(reference, "baseColor", repeat), null);
});

test("reset and saved configurations resolve the expected live material", () => {
  const model = resolveSofaModel("the-mercer");
  const defaults = createDefaultConfiguration(model);
  const changed = configurationReducer(defaults, {
    type: "set-option",
    option: "fabricId",
    value: "brushed-velvet",
    model,
  });
  const reset = configurationReducer(changed, { type: "reset", model });
  assert.equal(getViewerConfiguration(reset, model).fabricId, "italian-linen");
  assert.equal(getViewerConfiguration(reset, model).colourId, "oat");

  const saved = parseSavedConfiguration({
    version: 2,
    modelId: model.id,
    fabricId: "textured-boucle",
    colourId: "moss",
    size: model.sizes[0],
    legs: "Oak",
    cushions: 3,
  }, model);
  const viewer = getViewerConfiguration(saved, model);
  assert.equal(viewer.fabricId, "textured-boucle");
  assert.equal(viewer.colourId, "moss");
  assert.equal(viewer.color, "#53604c");
  assert.equal(resolveSofaMaterial(viewer).roughness, 0.95);
});
