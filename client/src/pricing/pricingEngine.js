import { getCompatibleFabrics } from "../data/fabrics.js";
import { PRICING_RULES } from "./pricingRules.js";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: PRICING_RULES.currency,
  maximumFractionDigits: 0,
});

function finiteAmount(value) {
  return Number.isFinite(value) ? value : 0;
}

export function formatINR(value, { showSign = false } = {}) {
  const amount = finiteAmount(value);
  const formatted = inrFormatter.format(amount);
  return showSign && amount > 0 ? `+${formatted}` : formatted;
}

export function calculatePricing(configuration, model) {
  const basePrice = Math.max(0, finiteAmount(model?.price));
  const modelSizes = Array.isArray(model?.sizes) ? model.sizes : [];
  const fabric = getCompatibleFabrics(model ?? {})
    .find((option) => option.id === configuration?.fabricId);
  const fabricAdjustment = finiteAmount(fabric?.priceAdjustment);
  const legAdjustment = Object.hasOwn(PRICING_RULES.legAdjustments, configuration?.legs)
    ? PRICING_RULES.legAdjustments[configuration.legs]
    : 0;
  const sizeIsValid = modelSizes.includes(configuration?.size);
  const sizeAdjustment = sizeIsValid && configuration.size !== modelSizes[0]
    ? PRICING_RULES.nonDefaultSizeAdjustment
    : 0;
  const requestedCushions = Number.isInteger(configuration?.cushions)
    ? configuration.cushions
    : PRICING_RULES.defaultCushionCount;
  const cushions = Math.min(5, Math.max(2, requestedCushions));
  const cushionAdjustment = (cushions - PRICING_RULES.defaultCushionCount)
    * PRICING_RULES.cushionUnitAdjustment;

  const adjustments = [
    {
      id: "fabric-adjustment",
      label: fabric ? `${fabric.name} upholstery` : "Fabric adjustment",
      amount: fabricAdjustment,
    },
    {
      id: "leg-finish-adjustment",
      label: Object.hasOwn(PRICING_RULES.legAdjustments, configuration?.legs)
        ? `${configuration.legs} leg finish`
        : "Leg finish adjustment",
      amount: legAdjustment,
    },
    {
      id: "size-adjustment",
      label: sizeIsValid ? `${configuration.size} size` : "Size adjustment",
      amount: sizeAdjustment,
    },
    {
      id: "cushion-adjustment",
      label: "Cushion adjustment",
      amount: cushionAdjustment,
    },
  ];
  const subtotal = basePrice + adjustments.reduce((sum, item) => sum + item.amount, 0);

  return {
    version: PRICING_RULES.version,
    currency: PRICING_RULES.currency,
    base: {
      id: "base-sofa",
      label: model?.name ? `${model.name} base price` : "Base sofa",
      amount: basePrice,
    },
    adjustments,
    subtotal,
    total: subtotal,
  };
}
