import assert from "node:assert/strict";
import test from "node:test";
import {
  ConfigurationApiError,
  createPersistedConfiguration,
  readPersistedConfiguration,
} from "../src/services/configurationsApi.js";

const configuration = {
  modelId: "the-mercer",
  fabricId: "italian-linen",
  colourId: "oat",
  size: "220 × 95 cm",
  legs: "Oak",
  cushions: 3,
};

test("configuration API service sends only the named API contract", async () => {
  let request;
  const record = { id: "server-id", configuration };
  const result = await createPersistedConfiguration(
    { name: "Living room", configuration },
    {
      fetchImplementation: async (url, options) => {
        request = { url, options };
        return new Response(JSON.stringify({ data: record }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      },
    },
  );
  assert.deepEqual(result, record);
  assert.equal(request.url, "/api/v1/configurations");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { name: "Living room", configuration });
});

test("configuration API service reads encoded public IDs", async () => {
  let requestedUrl;
  await readPersistedConfiguration("server/id", {
    fetchImplementation: async (url) => {
      requestedUrl = url;
      return new Response(JSON.stringify({ data: { id: "server/id", configuration } }));
    },
  });
  assert.equal(requestedUrl, "/api/v1/configurations/server%2Fid");
});

test("configuration API service converts network failures into safe errors", async () => {
  await assert.rejects(
    createPersistedConfiguration(
      { configuration },
      { fetchImplementation: async () => { throw new Error("network details"); } },
    ),
    (error) => error instanceof ConfigurationApiError
      && error.code === "API_UNAVAILABLE"
      && !error.message.includes("network details"),
  );
});
