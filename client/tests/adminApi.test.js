import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminApiError,
  addAdminEnquiryNote,
  createAdminSession,
  listAdminEnquiries,
  updateAdminEnquiryStatus,
} from "../src/services/adminApi.js";

function mockResponse({ ok = true, status = 200, data = null, error = null } = {}) {
  return { ok, status, async json() { return error ? { error } : { data }; } };
}

test("admin API uses private cookie sessions and encoded enquiry routes", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return mockResponse({ data: { ok: true } });
  };
  try {
    await createAdminSession({ email: "admin@example.com", password: "secret" });
    await listAdminEnquiries({ search: "A Customer", status: "quote_sent", page: 2 });
    await updateAdminEnquiryStatus("id/with spaces", "confirmed");
    await addAdminEnquiryNote("id/with spaces", "Private note");
    assert.equal(calls.every((call) => call.options.credentials === "include"), true);
    assert.match(calls[1].url, /search=A\+Customer/u);
    assert.match(calls[1].url, /status=quote_sent/u);
    assert.match(calls[2].url, /id%2Fwith%20spaces\/status/u);
    assert.equal(calls[2].options.headers["x-admin-request"], "DraftInteriors");
    assert.deepEqual(JSON.parse(calls[3].options.body), { body: "Private note" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin API preserves safe server errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mockResponse({ ok: false, status: 401, error: { code: "ADMIN_AUTH_REQUIRED", message: "Sign in to continue." } });
  try {
    await assert.rejects(() => listAdminEnquiries(), (error) => {
      assert.equal(error instanceof AdminApiError, true);
      assert.equal(error.status, 401);
      assert.equal(error.code, "ADMIN_AUTH_REQUIRED");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
