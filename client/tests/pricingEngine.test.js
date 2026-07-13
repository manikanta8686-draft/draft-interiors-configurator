import test from "node:test";
import assert from "node:assert/strict";
import { fabrics } from "../src/data/fabrics.js";
import { sofaModels } from "../src/data/sofas.js";
import {
  configurationReducer,
  createDefaultConfiguration,
  parseSavedConfiguration,
} from "../src/configurator/configuration.js";
import { calculatePricing, formatINR } from "../src/pricing/pricingEngine.js";

function adjustment(result, id) {
  return result.adjustments.find((item) => item.id === id);
}

test("every sofa model uses its current base price", () => {
  for (const model of sofaModels) {
    const result = calculatePricing(createDefaultConfiguration(model), model);
    assert.equal(result.base.amount, model.price);
    assert.equal(result.subtotal, model.price);
    assert.equal(result.total, model.price);
    assert.equal(result.currency, "INR");
  }
});

test("fabric adjustments come from the fabric catalogue", () => {
  const model = sofaModels[0];
  const defaults = createDefaultConfiguration(model);

  for (const fabric of fabrics) {
    const result = calculatePricing({ ...defaults, fabricId: fabric.id }, model);
    assert.equal(adjustment(result, "fabric-adjustment").amount, fabric.priceAdjustment ?? 0);
    assert.equal(result.total, model.price + (fabric.priceAdjustment ?? 0));
  }
});

test("existing size, leg, and cushion rules remain unchanged", () => {
  const model = sofaModels[0];
  const defaults = createDefaultConfiguration(model);

  const sizeResult = calculatePricing({ ...defaults, size: model.sizes[1] }, model);
  assert.equal(adjustment(sizeResult, "size-adjustment").amount, 14000);

  const brassResult = calculatePricing({ ...defaults, legs: "Brass" }, model);
  assert.equal(adjustment(brassResult, "leg-finish-adjustment").amount, 8000);

  const walnutResult = calculatePricing({ ...defaults, legs: "Walnut" }, model);
  assert.equal(adjustment(walnutResult, "leg-finish-adjustment").amount, 0);

  const twoCushions = calculatePricing({ ...defaults, cushions: 2 }, model);
  assert.equal(adjustment(twoCushions, "cushion-adjustment").amount, -2800);

  const fiveCushions = calculatePricing({ ...defaults, cushions: 5 }, model);
  assert.equal(adjustment(fiveCushions, "cushion-adjustment").amount, 5600);
});

test("combined pricing returns serializable line items and a deterministic total", () => {
  const model = sofaModels[0];
  const configuration = {
    ...createDefaultConfiguration(model),
    fabricId: "textured-boucle",
    size: model.sizes[1],
    legs: "Brass",
    cushions: 5,
  };
  const first = calculatePricing(configuration, model);
  const second = calculatePricing(configuration, model);

  assert.deepEqual(first, second);
  assert.equal(first.total, 196600);
  assert.equal(first.adjustments.length, 4);
  assert.doesNotThrow(() => JSON.stringify(first));
});

test("reset restores the expected base price", () => {
  const model = sofaModels[0];
  const changed = { ...createDefaultConfiguration(model), fabricId: "brushed-velvet", legs: "Brass" };
  const reset = configurationReducer(changed, { type: "reset", model });

  assert.equal(calculatePricing(reset, model).total, model.price);
});

test("invalid and legacy configuration data fail safely", () => {
  const model = sofaModels[0];
  const invalid = calculatePricing({ fabricId: "retired", size: "unknown", legs: "Steel", cushions: "many" }, model);
  assert.equal(invalid.total, model.price);
  assert.equal(calculatePricing(null, null).total, 0);

  const legacy = parseSavedConfiguration({
    model: model.name,
    fabric: "Brushed Velvet",
    colour: { name: "Moss", value: "#53604c" },
    size: model.sizes[1],
    legs: "Brass",
    cushions: 5,
    price: 1,
  }, model);
  assert.equal(calculatePricing(legacy, model).total, 188100);
});

test("INR formatter keeps numbers out of the pricing result", () => {
  assert.equal(formatINR(148000), "₹1,48,000");
  assert.equal(formatINR(12500, { showSign: true }), "+₹12,500");
  assert.equal(formatINR(-2800, { showSign: true }), "-₹2,800");
});
