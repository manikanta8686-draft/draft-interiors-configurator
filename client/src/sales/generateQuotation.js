function formatMoney(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function safeFilePart(value) {
  return String(value ?? "quotation").replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLowerCase();
}

export function quotationFileName(quote) {
  return `draft-interiors-${safeFilePart(quote.model)}-${safeFilePart(quote.reference)}.pdf`;
}

function renderQuotation(jsPDF, quote) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const ink = [42, 39, 34];
  const bronze = [151, 111, 63];
  const ivory = [250, 247, 241];
  const stone = [232, 226, 216];
  const muted = [104, 96, 85];
  const pageWidth = 210;

  doc.setProperties({
    title: `Draft Interiors quotation ${quote.reference}`,
    subject: `${quote.model} configured sofa quotation`,
    author: "Draft Interiors",
    creator: "Draft Interiors Configurator",
  });
  doc.setFillColor(...ivory);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor(...ink);
  doc.rect(0, 0, 210, 32, "F");
  doc.setDrawColor(...bronze);
  doc.setLineWidth(0.4);
  doc.rect(16, 8, 15, 15);
  doc.setTextColor(255, 252, 247);
  doc.setFont("times", "normal");
  doc.setFontSize(18);
  doc.text("D", 23.5, 18.8, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DRAFT INTERIORS", 37, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(211, 186, 153);
  doc.text("MADE TO ORDER", 37, 20);
  doc.setTextColor(...ink);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...bronze);
  doc.text("FORMAL QUOTATION", 16, 47);
  doc.setFont("times", "normal");
  doc.setFontSize(30);
  doc.setTextColor(...ink);
  doc.text(quote.model, 16, 61);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...muted);
  doc.text(`Configuration ${quote.reference}`, 16, 69);
  doc.text(`Prepared ${new Date(quote.createdAt).toLocaleDateString("en-IN")}`, 16, 74);

  doc.setFillColor(...stone);
  doc.roundedRect(137, 43, 57, 34, 2, 2, "F");
  doc.setTextColor(...bronze);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("ESTIMATED TOTAL", 143, 52);
  doc.setTextColor(...ink);
  doc.setFont("times", "normal");
  doc.setFontSize(20);
  doc.text(formatMoney(quote.pricing.total), 143, 64);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...muted);
  doc.text("Final price confirmed after design review.", 143, 71);

  doc.setDrawColor(205, 196, 183);
  doc.line(16, 84, 194, 84);
  doc.setTextColor(...bronze);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("SELECTED CONFIGURATION", 16, 95);

  const rows = [
    ["Dimensions", quote.configuration.dimensions, "Frame", quote.configuration.frame],
    ["Upholstery", quote.configuration.upholstery, "Colour", quote.configuration.colour],
    ["Leg finish", quote.configuration.legFinish, "Cushions", quote.configuration.cushions],
    ["Delivery", quote.configuration.delivery, "Warranty", quote.configuration.warranty],
  ];
  let y = 105;
  for (const [leftLabel, leftValue, rightLabel, rightValue] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(leftLabel.toUpperCase(), 16, y);
    doc.text(rightLabel.toUpperCase(), 108, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...ink);
    doc.text(doc.splitTextToSize(leftValue, 77), 16, y + 5);
    doc.text(doc.splitTextToSize(rightValue, 80), 108, y + 5);
    y += 19;
  }

  const pricingY = 187;
  doc.setTextColor(...bronze);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("PRICE SUMMARY", 16, pricingY);
  const lineItems = [quote.pricing.base, ...quote.pricing.adjustments];
  y = pricingY + 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const item of lineItems) {
    doc.setTextColor(...ink);
    doc.text(item.label, 16, y);
    doc.text(formatMoney(item.amount), 194, y, { align: "right" });
    doc.setDrawColor(223, 216, 205);
    doc.line(16, y + 4, 194, y + 4);
    y += 10;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Estimated total", 16, y + 3);
  doc.setFont("times", "normal");
  doc.setFontSize(17);
  doc.text(formatMoney(quote.pricing.total), 194, y + 3, { align: "right" });

  if (quote.shareUrl) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...bronze);
    doc.text("VIEW THIS CONFIGURATION", 16, 253);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(doc.splitTextToSize(quote.shareUrl, 178), 16, 259);
  }

  doc.setDrawColor(205, 196, 183);
  doc.line(16, 274, 194, 274);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text("This is an estimate for the selected configuration, not a tax invoice or order confirmation.", 16, 281);
  doc.text("manikanta8686@draftinteriors.com  |  +91 98666 55409", 16, 287);
  doc.text("01 / 01", pageWidth - 16, 287, { align: "right" });
  return doc;
}

export async function createQuotationPdfBytes(quote) {
  const { jsPDF } = await import("jspdf");
  const document = renderQuotation(jsPDF, quote);
  return new Uint8Array(document.output("arraybuffer"));
}

export async function downloadQuotation(quote) {
  const bytes = await createQuotationPdfBytes(quote);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = quotationFileName(quote);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return link.download;
}
