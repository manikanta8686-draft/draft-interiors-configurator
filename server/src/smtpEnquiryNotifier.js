import nodemailer from "nodemailer";
import { getSofaModelById } from "../../client/src/configurator/configuration.js";
import { getColourById, getFabricById } from "../../client/src/data/fabrics.js";

function designLines(record) {
  if (!record.configuration || !record.pricing) return ["Configuration: Not attached"];
  const configuration = record.configuration;
  const model = getSofaModelById(configuration.modelId);
  const fabric = getFabricById(configuration.fabricId);
  const colour = getColourById(configuration.colourId);
  return [
    `Model: ${model?.name ?? configuration.modelId}`,
    `Fabric: ${fabric?.name ?? configuration.fabricId}`,
    `Colour: ${colour?.name ?? configuration.colourId}`,
    `Dimensions: ${configuration.size}`,
    `Leg finish: ${configuration.legs}`,
    `Cushions: ${configuration.cushions}`,
    `Server-calculated estimate: INR ${record.pricing.total.toLocaleString("en-IN")}`,
  ];
}

export class SmtpEnquiryNotifier {
  constructor({ host, port, secure, user, password, from, recipient }, { createTransport = nodemailer.createTransport } = {}) {
    this.recipient = recipient;
    this.from = from;
    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
    });
  }

  async send(record) {
    const lines = [
      `New ${record.source} enquiry`,
      "",
      `Reference: ${record.id}`,
      `Name: ${record.customer.name}`,
      `Email: ${record.customer.email}`,
      `Phone: ${record.customer.phone ?? "Not provided"}`,
      "",
      "Message:",
      record.message,
      "",
      ...designLines(record),
      "",
      `Received: ${record.createdAt}`,
    ];
    await this.transporter.sendMail({
      from: this.from,
      to: this.recipient,
      replyTo: record.customer.email,
      subject: `New Draft Interiors ${record.source === "configurator" ? "quote" : "contact"} enquiry — ${record.customer.name}`,
      text: lines.join("\n"),
    });
  }
}
