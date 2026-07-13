import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { ConfigurationService } from "../src/configurationService.js";
import { runMigrations } from "../src/migrations.js";
import { SqliteConfigurationRepository } from "../src/repositories/sqliteConfigurationRepository.js";
import { createDefaultConfiguration, resolveSofaModel } from "../../client/src/configurator/configuration.js";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

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
  assert.equal(rowsBefore.count, 1);
  repository.close();
});
