import test from "node:test";
import assert from "node:assert/strict";
import { parseSavedConfiguration, resolveSofaModel } from "../src/configurator/configuration.js";
import {
  createSharePath,
  createShareUrl,
  createPersistedSharePath,
  createPersistedShareUrl,
  decodeShareConfiguration,
  encodeShareConfiguration,
  SHARE_CONFIGURATION_PARAM,
} from "../src/configurator/share.js";

const configuration = {
  modelId: "the-mercer",
  fabricId: "textured-boucle",
  colourId: "moss",
  size: "260 × 95 cm",
  legs: "Brass",
  cushions: 5,
};

test("share payload round-trips stable configuration IDs and Unicode dimensions", () => {
  const encoded = encodeShareConfiguration({ ...configuration, price: 1, customerName: "private" });
  assert.deepEqual(decodeShareConfiguration(encoded), configuration);
  assert.ok(encoded.length < 300);
});

test("share paths preserve model selection and survive URL parsing", () => {
  const path = createSharePath(configuration);
  const url = new URL(path, "https://draft.example");
  assert.equal(url.pathname, "/configurator");
  assert.equal(url.searchParams.get("model"), configuration.modelId);
  assert.deepEqual(decodeShareConfiguration(url.searchParams.get(SHARE_CONFIGURATION_PARAM)), configuration);
  assert.equal(createShareUrl(configuration, { origin: "https://draft.example" }), `https://draft.example${path}`);
});

test("invalid, oversized, and unsupported share payloads fail safely", () => {
  assert.equal(decodeShareConfiguration("not-valid-base64"), null);
  assert.equal(decodeShareConfiguration("a".repeat(2049)), null);
  const unsupported = btoa(JSON.stringify({ v: 99, m: "the-mercer", f: "x", c: "x", s: "x", l: "x", n: 3 }));
  assert.equal(decodeShareConfiguration(unsupported), null);
});

test("decoded outdated options are normalized through the existing state boundary", () => {
  const model = resolveSofaModel("the-mercer");
  const outdated = decodeShareConfiguration(encodeShareConfiguration({
    ...configuration,
    fabricId: "retired-fabric",
    colourId: "retired-colour",
    size: "retired-size",
    cushions: 99,
  }));
  assert.deepEqual(parseSavedConfiguration(outdated, model), {
    modelId: model.id,
    fabricId: "italian-linen",
    colourId: "oat",
    size: model.sizes[0],
    legs: "Brass",
    cushions: 5,
  });
});

test("server-backed share paths use a separate parameter and preserve model selection", () => {
  const serverId = "11111111-1111-4111-8111-111111111111";
  const path = createPersistedSharePath(serverId, configuration.modelId);
  const url = new URL(path, "https://draft.example");
  assert.equal(url.searchParams.get("configuration"), serverId);
  assert.equal(url.searchParams.get("model"), configuration.modelId);
  assert.equal(url.searchParams.has(SHARE_CONFIGURATION_PARAM), false);
  assert.equal(
    createPersistedShareUrl(serverId, configuration.modelId, { origin: "https://draft.example" }),
    `https://draft.example${path}`,
  );
});
