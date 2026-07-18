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
  const fabric = getCompatibleFabrics(model ?? {})
    .find((option) => option.id === configuration?.fabricId);
  const fabricAdjustment = Object.hasOwn(PRICING_RULES.fabricTierAdjustments, fabric?.pricingTier)
    ? PRICING_RULES.fabricTierAdjustments[fabric.pricingTier]
    : 0;

  const adjustments = [
    {
      id: "fabric-adjustment",
      label: fabric
        ? `${fabric.name} (${fabric.pricingTier}) upholstery`
        : "Fabric tier adjustment",
      amount: fabricAdjustment,
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
