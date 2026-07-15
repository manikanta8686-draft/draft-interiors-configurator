export const WHATSAPP_BUSINESS_NUMBER = "919866655409";
export const ENQUIRY_EMAIL = "manikanta8686@draftinteriors.com";

export function createWhatsAppQuoteUrl({
  customerName,
  model,
  fabric,
  colour,
  size,
  legs,
  cushions,
  estimatedTotal,
}) {
  const name = typeof customerName === "string" ? customerName.trim() : "";
  if (!name) return null;
  const message = [
    "Hello Draft Interiors,",
    `My name is ${name}.`,
    "I'd like a quote for this sofa design:",
    `Model: ${model}`,
    `Fabric: ${fabric}`,
    `Colour: ${colour}`,
    `Dimensions: ${size}`,
    `Leg finish: ${legs}`,
    `Cushions: ${cushions}`,
    `Estimated total: ${estimatedTotal}`,
  ].join("\n");
  return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(message)}`;
}
