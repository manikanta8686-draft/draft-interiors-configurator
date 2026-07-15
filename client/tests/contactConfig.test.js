import assert from "node:assert/strict";
import test from "node:test";
import {
  createWhatsAppQuoteUrl,
  ENQUIRY_EMAIL,
  WHATSAPP_BUSINESS_NUMBER,
} from "../src/config/contact.js";

test("approved Draft Interiors contact details are production-shaped", () => {
  assert.equal(WHATSAPP_BUSINESS_NUMBER, "919866655409");
  assert.equal(ENQUIRY_EMAIL, "manikanta8686@draftinteriors.com");
  assert.match(WHATSAPP_BUSINESS_NUMBER, /^\d{10,15}$/u);
  assert.match(ENQUIRY_EMAIL, /^[^\s@]+@[^\s@]+\.[^\s@]+$/u);
});

test("WhatsApp quote includes the customer and complete readable design", () => {
  const url = createWhatsAppQuoteUrl({
    customerName: "A Customer",
    model: "The Mercer",
    fabric: "Italian Linen",
    colour: "Oat",
    size: "220 × 95 cm",
    legs: "Oak",
    cushions: 3,
    estimatedTotal: "₹1,48,000",
  });
  assert.equal(new URL(url).hostname, "wa.me");
  assert.equal(new URL(url).pathname, `/${WHATSAPP_BUSINESS_NUMBER}`);
  const message = new URL(url).searchParams.get("text");
  for (const expected of [
    "My name is A Customer.",
    "Model: The Mercer",
    "Fabric: Italian Linen",
    "Colour: Oat",
    "Dimensions: 220 × 95 cm",
    "Leg finish: Oak",
    "Cushions: 3",
    "Estimated total: ₹1,48,000",
  ]) assert.match(message, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
});

test("WhatsApp quote is unavailable until a customer name is entered", () => {
  assert.equal(createWhatsAppQuoteUrl({ customerName: "  " }), null);
});
