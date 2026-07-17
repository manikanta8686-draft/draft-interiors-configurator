import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { AdminAuthService, createAdminPasswordHash } from "../src/adminAuthService.js";
import { AdminService } from "../src/adminService.js";
import { EnquiryService } from "../src/enquiryService.js";
import { SqliteConfigurationRepository } from "../src/repositories/sqliteConfigurationRepository.js";
import { createDefaultConfiguration, resolveSofaModel } from "../../client/src/configurator/configuration.js";

const enquiryId = "11111111-1111-4111-8111-111111111111";
const submissionId = "33333333-3333-4333-8333-333333333333";
const noteId = "44444444-4444-4444-8444-444444444444";

async function withServer(app, run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function createFixture() {
  const repository = new SqliteConfigurationRepository(":memory:");
  const model = resolveSofaModel("the-mercer");
  const enquiryService = new EnquiryService(repository, {
    createId: () => enquiryId,
    now: () => new Date("2026-07-17T10:00:00.000Z"),
  });
  await enquiryService.create({
    source: "configurator",
    submissionId,
    customer: { name: "A Customer", email: "customer@example.com", phone: "+91 90000 00000" },
    message: "Please send a formal quotation for this configured sofa.",
    configuration: createDefaultConfiguration(model),
    consent: true,
  });
  const adminAuthService = new AdminAuthService({
    email: "admin@draftinteriors.com",
    passwordHash: createAdminPasswordHash("correct horse battery staple", Buffer.alloc(16, 7)),
    sessionSecret: "test-session-secret-that-is-longer-than-32-characters",
    now: () => new Date("2026-07-17T11:00:00.000Z"),
  });
  const adminService = new AdminService(repository, {
    createId: () => noteId,
    now: () => new Date("2026-07-17T11:15:00.000Z"),
  });
  return { repository, app: createApp({ adminAuthService, adminService, logger: { error() {} } }) };
}

test("protects all enquiry data behind an HTTP-only admin session", async () => {
  const { repository, app } = await createFixture();
  await withServer(app, async (baseUrl) => {
    const unauthenticated = await fetch(`${baseUrl}/api/v1/admin/enquiries`);
    assert.equal(unauthenticated.status, 401);

    const badLogin = await fetch(`${baseUrl}/api/v1/admin/session`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@draftinteriors.com", password: "wrong" }),
    });
    assert.equal(badLogin.status, 401);

    const login = await fetch(`${baseUrl}/api/v1/admin/session`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ADMIN@draftinteriors.com", password: "correct horse battery staple" }),
    });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/u);
    assert.match(setCookie, /SameSite=Strict/u);
    const cookie = setCookie.split(";", 1)[0];

    const list = await fetch(`${baseUrl}/api/v1/admin/enquiries?status=new&search=Customer`, { headers: { cookie } });
    assert.equal(list.status, 200);
    const body = (await list.json()).data;
    assert.equal(body.total, 1);
    assert.equal(body.items[0].customer.email, "customer@example.com");
    assert.equal(body.items[0].specification.model, "The Mercer");
    assert.equal(body.stats.total, 1);
  });
  repository.close();
});

test("updates the sales workflow and stores private notes with request verification", async () => {
  const { repository, app } = await createFixture();
  await withServer(app, async (baseUrl) => {
    const login = await fetch(`${baseUrl}/api/v1/admin/session`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@draftinteriors.com", password: "correct horse battery staple" }),
    });
    const cookie = login.headers.get("set-cookie").split(";", 1)[0];
    const rejected = await fetch(`${baseUrl}/api/v1/admin/enquiries/${enquiryId}/status`, {
      method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ status: "confirmed" }),
    });
    assert.equal(rejected.status, 403);

    const headers = { cookie, "content-type": "application/json", "x-admin-request": "DraftInteriors" };
    const updated = await fetch(`${baseUrl}/api/v1/admin/enquiries/${enquiryId}/status`, {
      method: "PATCH", headers, body: JSON.stringify({ status: "quote_sent" }),
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).data.status, "quote_sent");

    const note = await fetch(`${baseUrl}/api/v1/admin/enquiries/${enquiryId}/notes`, {
      method: "POST", headers, body: JSON.stringify({ body: "Customer prefers delivery in August." }),
    });
    assert.equal(note.status, 201);
    const detail = await fetch(`${baseUrl}/api/v1/admin/enquiries/${enquiryId}`, { headers: { cookie } });
    const record = (await detail.json()).data;
    assert.equal(record.notes[0].body, "Customer prefers delivery in August.");
    assert.equal(record.notes[0].author, "admin@draftinteriors.com");
  });
  repository.close();
});
