const WARRANTY_NOTICE = "Draft Interiors standard workmanship warranty - final terms confirmed with order.";
const FRAME_DESCRIPTION = "Reinforced MS frame, fully upholstered";

function compactId(value) {
  return String(value ?? "").replace(/[^a-z0-9]/giu, "").slice(0, 12).toUpperCase();
}

export function createConfigurationReference({ now = new Date(), createId = () => globalThis.crypto.randomUUID() } = {}) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `DI-${date}-${compactId(createId())}`;
}

export function formatConfigurationReference(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  if (/^DI-[A-Z0-9-]+$/u.test(value)) return value;
  return `DI-${compactId(value)}`;
}

export function buildSalesConfiguration({
  configuration,
  model,
  selectedFabric,
  selectedColour,
  pricing,
  reference,
  shareUrl = "",
  now = new Date(),
}) {
  const adjustments = pricing.adjustments.filter((item) => item.amount !== 0);
  return {
    reference,
    createdAt: now.toISOString(),
    shareUrl,
    model: model.name,
    category: model.category,
    configuration: {
      dimensions: configuration.size,
      frame: FRAME_DESCRIPTION,
      upholstery: selectedFabric.name,
      colour: selectedColour.name,
      legFinish: configuration.legs,
      cushions: `${configuration.cushions} feather-filled cushions`,
      warranty: WARRANTY_NOTICE,
      delivery: "Estimated 6-8 weeks",
    },
    pricing: {
      currency: pricing.currency,
      base: pricing.base,
      adjustments,
      total: pricing.total,
      version: pricing.version,
    },
  };
}

export function buildEnquiryMessage(quote) {
  const specification = quote.configuration;
  return [
    `Please prepare a formal quote for configuration ${quote.reference}.`,
    `${quote.model}; ${specification.upholstery} in ${specification.colour}; ${specification.dimensions}; ${specification.legFinish} legs; ${specification.cushions}.`,
  ].join(" ");
}

export { FRAME_DESCRIPTION, WARRANTY_NOTICE };
