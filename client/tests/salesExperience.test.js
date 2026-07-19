import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEnquiryMessage,
  buildSalesConfiguration,
  createConfigurationReference,
  formatConfigurationReference,
} from "../src/sales/configurationSummary.js";
import { createQuotationPdfBytes, quotationFileName } from "../src/sales/generateQuotation.js";
import {
  createDefaultConfiguration,
  getConfigurationCatalogue,
  resolveSofaModel,
} from "../src/configurator/configuration.js";
import { calculatePricing } from "../src/pricing/pricingEngine.js";

function createQuote() {
  const model = resolveSofaModel("the-mercer");
  const configuration = createDefaultConfiguration(model);
  const catalogue = getConfigurationCatalogue(configuration, model);
  return buildSalesConfiguration({
    configuration,
    model,
    ...catalogue,
    pricing: calculatePricing(configuration, model),
    reference: "DI-20260716-ABCDEF123456",
    shareUrl: "https://draft.example/configurator?configuration=example",
    now: new Date("2026-07-16T10:00:00.000Z"),
  });
}

test("sales references are customer-readable and configuration-safe", () => {
  const reference = createConfigurationReference({
    now: new Date("2026-07-16T10:00:00.000Z"),
    createId: () => "12345678-1234-4234-8234-123456789abc",
  });
  assert.equal(reference, "DI-20260716-123456781234");
  assert.equal(formatConfigurationReference("12345678-1234-4234-8234-123456789abc"), "DI-123456781234");
});

test("one complete sales summary feeds specification and enquiry content", () => {
  const quote = createQuote();
  assert.equal(quote.model, "Butterfly");
  assert.equal(quote.configuration.dimensions, "220 × 95 cm");
  assert.equal(quote.configuration.upholstery, "Performance Polyester / Microfiber");
  assert.equal(quote.configuration.legFinish, "Oak");
  assert.match(quote.configuration.warranty, /final terms confirmed/u);
  assert.match(buildEnquiryMessage(quote), /DI-20260716-ABCDEF123456/u);
  assert.equal(quote.pricing.total, 40000);
  assert.equal(quote.pricing.version, 2);
});

test("sales summaries and quotations use only the selected fabric tier adjustment", () => {
  const model = resolveSofaModel("the-mercer");
  const configuration = {
    ...createDefaultConfiguration(model),
    fabricId: "italian-linen",
    colourId: "ink",
    size: model.sizes.at(-1),
    legs: "Brass",
    cushions: 5,
  };
  const quote = buildSalesConfiguration({
    configuration,
    model,
    ...getConfigurationCatalogue(configuration, model),
    pricing: calculatePricing(configuration, model),
    reference: "DI-20260716-LUXURY000001",
  });

  assert.equal(quote.pricing.total, 46000);
  assert.deepEqual(quote.pricing.adjustments, [{
    id: "fabric-adjustment",
    label: "Linen & Jute Blend (Luxury) upholstery",
    amount: 6000,
  }]);
});

test("branded quotation generator creates a valid stable PDF document", async () => {
  const quote = createQuote();
  const bytes = await createQuotationPdfBytes(quote);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "%PDF");
  assert.ok(bytes.byteLength > 3500);
  assert.equal(quotationFileName(quote), "draft-interiors-butterfly-di-20260716-abcdef123456.pdf");
});
