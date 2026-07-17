import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { ConfigurationService } from "../src/configurationService.js";
import { EnquiryService } from "../src/enquiryService.js";
import { runMigrations } from "../src/migrations.js";
import { SqliteConfigurationRepository } from "../src/repositories/sqliteConfigurationRepository.js";
import { SmtpEnquiryNotifier } from "../src/smtpEnquiryNotifier.js";
import { createDefaultConfiguration, resolveSofaModel } from "../../client/src/configurator/configuration.js";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const submissionId = "33333333-3333-4333-8333-333333333333";

async function withServer(app, run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function createTestApi(repository = new SqliteConfigurationRepository(":memory:")) {
  const ids = [firstId, secondId];
  const service = new ConfigurationService(repository, {
    createId: () => ids.shift() ?? crypto.randomUUID(),
    now: () => new Date("2026-07-13T10:00:00.000Z"),
  });
  return { app: createApp({ configurationService: service, logger: { error() {} } }), repository };
}

test("creates and reads an immutable persisted configuration", async () => {
  const { app, repository } = createTestApi();
  const model = resolveSofaModel("the-mercer");
  const configuration = createDefaultConfiguration(model);

  await withServer(app, async (baseUrl) => {
    const createdResponse = await fetch(`${baseUrl}/api/v1/configurations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: " Living room ", configuration }),
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).data;
    assert.equal(created.id, firstId);
    assert.equal(created.name, "Living room");
    assert.deepEqual(created.configuration, configuration);

    const readResponse = await fetch(`${baseUrl}/api/v1/configurations/${created.id}`);
    assert.equal(readResponse.status, 200);
    assert.deepEqual((await readResponse.json()).data, created);

    const unsupportedMutation = await fetch(`${baseUrl}/api/v1/configurations/${created.id}`, { method: "DELETE" });
    assert.equal(unsupportedMutation.status, 404);
  });
  repository.close();
});

test("normalizes option values and ignores browser-submitted prices", async () => {
  const { app, repository } = createTestApi();
  const model = resolveSofaModel("the-mercer");

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/configurations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        price: 1,
        pricing: { total: 1 },
        customerEmail: "must-not-be-stored@example.com",
        configuration: {
          modelId: model.id,
          fabricId: "retired-fabric",
          colourId: "retired-colour",
          size: "retired-size",
          legs: "Steel",
          cushions: 99,
          price: 1,
        },
      }),
    });
    assert.equal(response.status, 201);
    const record = (await response.json()).data;
    assert.deepEqual(record.configuration, {
      ...createDefaultConfiguration(model),
      cushions: 5,
    });
    assert.equal(record.pricing.total, 153600);
    assert.equal(Object.hasOwn(record, "customerEmail"), false);
    assert.equal(Object.hasOwn(record, "price"), false);
  });
  repository.close();
});

test("rejects invalid models and malformed request bodies safely", async () => {
  const { app, repository } = createTestApi();

  await withServer(app, async (baseUrl) => {
    const invalidModel = await fetch(`${baseUrl}/api/v1/configurations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ configuration: { modelId: "not-a-model" } }),
    });
    assert.equal(invalidModel.status, 400);
    assert.deepEqual(await invalidModel.json(), {
      error: { code: "INVALID_CONFIGURATION", message: "Unknown model ID." },
    });

    const malformed = await fetch(`${baseUrl}/api/v1/configurations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{broken",
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error.code, "INVALID_JSON");
  });
  repository.close();
});

test("returns safe not-found responses for unknown and malformed public IDs", async () => {
  const { app, repository } = createTestApi();

  await withServer(app, async (baseUrl) => {
    for (const id of ["invalid", secondId]) {
      const response = await fetch(`${baseUrl}/api/v1/configurations/${id}`);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), {
        error: { code: "CONFIGURATION_NOT_FOUND", message: "Configuration not found." },
      });
    }
  });
  repository.close();
});

test("repository failures return a generic error without internal details", async () => {
  const repository = {
    create() { throw new Error("database password and internal stack"); },
    findById() { throw new Error("database password and internal stack"); },
  };
  const { app } = createTestApi(repository);
  const model = resolveSofaModel("the-mercer");

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/configurations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ configuration: createDefaultConfiguration(model) }),
    });
    assert.equal(response.status, 500);
    const body = await response.text();
    assert.match(body, /INTERNAL_ERROR/u);
    assert.doesNotMatch(body, /password|stack/ui);
  });
});

test("SQLite migrations are repeatable", () => {
  const repository = new SqliteConfigurationRepository(":memory:");
  runMigrations(repository.database);
  const rowsBefore = repository.database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get();
  assert.equal(rowsBefore.count, 5);
  repository.close();
});

test("stores a validated contact enquiry without exposing customer data in the receipt", async () => {
  const repository = new SqliteConfigurationRepository(":memory:");
  const enquiryService = new EnquiryService(repository, {
    createId: () => firstId,
    now: () => new Date("2026-07-15T10:00:00.000Z"),
  });
  const app = createApp({ enquiryService, logger: { error() {} } });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "contact",
        submissionId,
        customer: { name: " Manikanta ", email: "CUSTOMER@example.com", phone: "+91 90000 00000" },
        message: "I would like help choosing a sofa for my living room.",
        consent: true,
        website: "",
      }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual((await response.json()).data, {
      id: firstId,
      status: "received",
      createdAt: "2026-07-15T10:00:00.000Z",
    });
    const stored = repository.database.prepare("SELECT * FROM enquiries WHERE id = ?").get(firstId);
    assert.equal(stored.customer_name, "Manikanta");
    assert.equal(stored.customer_email, "customer@example.com");
    assert.equal(stored.notification_status, "not_configured");
    assert.equal(stored.status, "new");
    assert.equal(stored.configuration_json, null);
  });
  repository.close();
});

test("recalculates configurator enquiry pricing and records notification failure safely", async () => {
  const repository = new SqliteConfigurationRepository(":memory:");
  const model = resolveSofaModel("the-mercer");
  const configuration = createDefaultConfiguration(model);
  const enquiryService = new EnquiryService(repository, {
    createId: () => firstId,
    notifier: { async send() { throw new Error("SMTP password leaked internally"); } },
  });
  const app = createApp({ enquiryService, logger: { error() {} } });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "configurator",
        submissionId,
        customer: { name: "A Customer", email: "customer@example.com" },
        message: "Please send me a formal quote for this exact design.",
        configuration,
        pricing: { total: 1 },
        consent: true,
      }),
    });
    assert.equal(response.status, 201);
    assert.doesNotMatch(await response.clone().text(), /password|failed/ui);
    const stored = repository.database.prepare("SELECT * FROM enquiries WHERE id = ?").get(firstId);
    assert.equal(stored.notification_status, "failed");
    assert.equal(JSON.parse(stored.pricing_json).total, 148000);
  });
  repository.close();
});

test("rejects invalid enquiry details and silently discards honeypot submissions", async () => {
  const repository = new SqliteConfigurationRepository(":memory:");
  const enquiryService = new EnquiryService(repository, { createId: () => firstId });
  const app = createApp({ enquiryService, logger: { error() {} } });

  await withServer(app, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "contact",
        submissionId,
        customer: { name: "A Customer", email: "invalid" },
        message: "This message is long enough.",
        consent: false,
      }),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, "INVALID_ENQUIRY");

    const invalidPhone = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "contact",
        submissionId,
        customer: { name: "A Customer", email: "customer@example.com", phone: "call-me-now" },
        message: "This message is long enough.",
        consent: true,
      }),
    });
    assert.equal(invalidPhone.status, 400);
    assert.match((await invalidPhone.json()).error.message, /valid phone number/u);

    const honeypot = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ website: "spam.example" }),
    });
    assert.equal(honeypot.status, 201);
    assert.equal(repository.database.prepare("SELECT COUNT(*) AS count FROM enquiries").get().count, 0);
  });
  repository.close();
});

test("formats complete customer-friendly quote notification emails", async () => {
  let mail;
  const notifier = new SmtpEnquiryNotifier({
    host: "smtp.example.com",
    port: 465,
    secure: true,
    user: "sender@example.com",
    password: "secret",
    from: "Draft Interiors <sender@example.com>",
    recipient: "studio@example.com",
  }, {
    createTransport: () => ({ async sendMail(options) { mail = options; } }),
  });
  const model = resolveSofaModel("the-mercer");
  const configuration = createDefaultConfiguration(model);
  await notifier.send({
    id: firstId,
    source: "configurator",
    customer: { name: "A Customer", email: "customer@example.com", phone: "+91 90000 00000" },
    message: "Please send a formal quote for this design.",
    configuration,
    pricing: { total: 148000 },
    createdAt: "2026-07-15T10:00:00.000Z",
  });

  assert.equal(mail.to, "studio@example.com");
  assert.equal(mail.replyTo, "customer@example.com");
  assert.equal(mail.subject, "New Draft Interiors quote enquiry — A Customer");
  for (const expected of [
    "Model: The Mercer",
    "Fabric: Italian Linen",
    "Colour: Oat",
    `Dimensions: ${configuration.size}`,
    "Leg finish: Oak",
    "Cushions: 3",
    "Server-calculated estimate: INR 1,48,000",
  ]) assert.match(mail.text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
});

test("rate limits repeated enquiry submissions independently of other API routes", async () => {
  const repository = new SqliteConfigurationRepository(":memory:");
  let sequence = 0;
  const enquiryService = new EnquiryService(repository, {
    createId: () => `11111111-1111-4111-8111-${String(sequence += 1).padStart(12, "0")}`,
  });
  const app = createApp({ enquiryService, enquiryRateLimit: { max: 1, windowMs: 60_000 }, logger: { error() {} } });
  const payload = {
    source: "contact",
    submissionId,
    customer: { name: "A Customer", email: "customer@example.com" },
    message: "This is a legitimate customer enquiry.",
    consent: true,
  };

  await withServer(app, async (baseUrl) => {
    const first = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const second = await fetch(`${baseUrl}/api/v1/enquiries`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    assert.equal(first.status, 201);
    assert.equal(second.status, 429);
    assert.equal((await second.json()).error.code, "TOO_MANY_ENQUIRIES");
  });
  repository.close();
});

test("repeated submission IDs return one receipt and create one enquiry", async () => {
  const repository = new SqliteConfigurationRepository(":memory:");
  let sequence = 0;
  const enquiryService = new EnquiryService(repository, {
    createId: () => sequence++ === 0 ? firstId : secondId,
  });
  const app = createApp({ enquiryService, logger: { error() {} } });
  const payload = {
    source: "contact",
    submissionId,
    customer: { name: "A Customer", email: "customer@example.com" },
    message: "This is a legitimate customer enquiry.",
    consent: true,
  };

  await withServer(app, async (baseUrl) => {
    const responses = [];
    for (let index = 0; index < 2; index += 1) {
      const response = await fetch(`${baseUrl}/api/v1/enquiries`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      responses.push((await response.json()).data);
    }
    assert.equal(responses[0].id, firstId);
    assert.deepEqual(responses[1], responses[0]);
    assert.equal(repository.database.prepare("SELECT COUNT(*) AS count FROM enquiries").get().count, 1);
  });
  repository.close();
});
