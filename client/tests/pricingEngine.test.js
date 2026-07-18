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

test("upholstery catalogue reflects the Indian-market fabric families", () => {
  assert.deepEqual(fabrics.map((fabric) => fabric.name), [
    "Performance Polyester / Microfiber",
    "Linen & Jute Blend",
    "Polyester Velvet",
    "Suede",
    "Cotton Chenille",
    "Leatherette / PU",
  ]);
  assert.ok(fabrics.every((fabric) => fabric.description && fabric.climateGuidance && fabric.careInformation));
});

test("fabric adjustments come from the fabric catalogue", () => {
  const model = sofaModels[0];
  const defaults = createDefaultConfiguration(model);
  const tierAdjustments = { Standard: 0, Premium: 3000, Luxury: 6000, Imported: 10000 };

  for (const fabric of fabrics) {
    const result = calculatePricing({ ...defaults, fabricId: fabric.id }, model);
    assert.equal(adjustment(result, "fabric-adjustment").amount, tierAdjustments[fabric.pricingTier]);
    assert.equal(result.total, model.price + tierAdjustments[fabric.pricingTier]);
  }
});

test("cosmetic size, leg, colour, and cushion choices do not change price", () => {
  const model = sofaModels[0];
  const defaults = createDefaultConfiguration(model);
  const cosmeticVariants = [
    { ...defaults, size: model.sizes[1] },
    { ...defaults, legs: "Brass" },
    { ...defaults, colourId: "ink" },
    { ...defaults, cushions: 2 },
    { ...defaults, cushions: 5 },
  ];

  for (const configuration of cosmeticVariants) {
    const result = calculatePricing(configuration, model);
    assert.equal(result.total, model.price);
    assert.equal(result.adjustments.length, 1);
  }
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
  assert.equal(first.total, 43000);
  assert.equal(first.adjustments.length, 1);
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
  assert.equal(calculatePricing(legacy, model).total, 46000);
});

test("INR formatter keeps numbers out of the pricing result", () => {
  assert.equal(formatINR(40000), "₹40,000");
  assert.equal(formatINR(3000, { showSign: true }), "+₹3,000");
});
