import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultConfiguration,
  DESIGN_STORAGE_KEY,
  resolveSofaModel,
} from "../src/configurator/configuration.js";
import {
  addSavedConfiguration,
  attachServerId,
  createSavedConfigurationRecord,
  deleteSavedConfiguration,
  initializeSavedConfigurations,
  parseSavedConfigurations,
  readSavedConfigurations,
  syncSavedConfiguration,
  writeSavedConfigurations,
} from "../src/configurator/persistence.js";
import { calculatePricing } from "../src/pricing/pricingEngine.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test("multiple named configurations persist with versioned serializable records", () => {
  const model = resolveSofaModel("the-mercer");
  const defaults = createDefaultConfiguration(model);
  const first = createSavedConfigurationRecord({
    id: "first",
    name: " Living room ",
    configuration: defaults,
    now: new Date("2026-07-13T10:00:00.000Z"),
  });
  const second = createSavedConfigurationRecord({
    id: "second",
    name: "Study",
    configuration: { ...defaults, fabricId: "brushed-velvet", colourId: "ink" },
    now: new Date("2026-07-13T11:00:00.000Z"),
  });
  const items = addSavedConfiguration(addSavedConfiguration([], first), second);
  const storage = new MemoryStorage();

  assert.equal(writeSavedConfigurations(storage, items), true);
  assert.deepEqual(readSavedConfigurations(storage), [second, first]);
  assert.equal(first.name, "Living room");
  assert.equal(Object.hasOwn(first, "price"), false);
  assert.doesNotThrow(() => JSON.stringify(items));
});

test("saved records validate names, normalize retired options, and delete by ID", () => {
  const model = resolveSofaModel("the-mercer");
  assert.equal(createSavedConfigurationRecord({ name: " ", configuration: createDefaultConfiguration(model) }), null);

  const parsed = parseSavedConfigurations({
    version: 1,
    items: [{
      id: "old",
      name: "Old design",
      version: 1,
      modelId: model.id,
      fabricId: "retired",
      colourId: "retired",
      size: "retired",
      legs: "Steel",
      cushions: 100,
      createdAt: "invalid",
      updatedAt: "invalid",
    }],
  });
  assert.equal(parsed[0].fabricId, "performance-fabric");
  assert.equal(parsed[0].colourId, "oat");
  assert.equal(parsed[0].size, model.sizes[0]);
  assert.equal(parsed[0].legs, "Oak");
  assert.equal(parsed[0].cushions, 5);
  assert.deepEqual(deleteSavedConfiguration(parsed, "old"), []);
});

test("the legacy single save migrates once and its stored price is not trusted", () => {
  const storage = new MemoryStorage();
  storage.setItem(DESIGN_STORAGE_KEY, JSON.stringify({
    model: "The Mercer",
    fabric: "Brushed Velvet",
    colour: { name: "Moss", value: "#53604c" },
    size: "260 × 95 cm",
    legs: "Brass",
    cushions: 5,
    price: 1,
    savedAt: "2026-07-13T12:00:00.000Z",
  }));

  const items = initializeSavedConfigurations(storage, new Date("2026-07-13T13:00:00.000Z"));
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "legacy-design");
  assert.equal(items[0].fabricId, "brushed-velvet");
  assert.equal(Object.hasOwn(items[0], "price"), false);
  assert.equal(calculatePricing(items[0], resolveSofaModel(items[0].modelId)).total, 46000);

  writeSavedConfigurations(storage, []);
  assert.deepEqual(initializeSavedConfigurations(storage), []);
});

test("malformed or unavailable storage fails safely", () => {
  assert.deepEqual(parseSavedConfigurations("{bad json"), []);
  const brokenStorage = {
    getItem() { throw new Error("unavailable"); },
    setItem() { throw new Error("unavailable"); },
  };
  assert.deepEqual(readSavedConfigurations(brokenStorage), []);
  assert.equal(writeSavedConfigurations(brokenStorage, []), false);
});

test("server IDs are attached alongside local IDs without rewriting local records", async () => {
  const model = resolveSofaModel("the-mercer");
  const record = createSavedConfigurationRecord({
    id: "local-browser-id",
    name: "Local design",
    configuration: createDefaultConfiguration(model),
  });
  const storage = new MemoryStorage();
  const items = [record];
  writeSavedConfigurations(storage, items);

  const synced = await syncSavedConfiguration({
    items,
    localId: record.id,
    storage,
    persist: async () => ({ id: "server-generated-id" }),
  });
  assert.equal(synced.status, "synced");
  assert.equal(synced.items[0].id, "local-browser-id");
  assert.equal(synced.items[0].serverId, "server-generated-id");
  assert.equal(readSavedConfigurations(storage)[0].serverId, "server-generated-id");
  assert.equal(record.serverId, undefined);
});

test("backend synchronization failures preserve the local-storage record", async () => {
  const model = resolveSofaModel("the-mercer");
  const record = createSavedConfigurationRecord({
    id: "offline-local-id",
    name: "Offline design",
    configuration: createDefaultConfiguration(model),
  });
  const storage = new MemoryStorage();
  const items = attachServerId([record], record.id, "");
  writeSavedConfigurations(storage, items);

  const result = await syncSavedConfiguration({
    items,
    localId: record.id,
    storage,
    persist: async () => { throw new Error("offline"); },
  });
  assert.equal(result.status, "offline");
  assert.deepEqual(result.items, items);
  assert.deepEqual(readSavedConfigurations(storage), items);
});
