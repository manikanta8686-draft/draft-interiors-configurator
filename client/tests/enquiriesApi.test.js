import assert from "node:assert/strict";
import test from "node:test";
import {
  createEnquiry,
  createEnquirySubmissionId,
  EnquiryApiError,
} from "../src/services/enquiriesApi.js";

const payload = {
  source: "contact",
  submissionId: "33333333-3333-4333-8333-333333333333",
  customer: { name: "A Customer", email: "customer@example.com", phone: "" },
  message: "Please help me choose a sofa.",
  consent: true,
  website: "",
  configuration: null,
};

test("enquiry submission IDs use browser-generated UUIDs", () => {
  assert.match(createEnquirySubmissionId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
});

test("enquiry API sends only the explicit submission contract", async () => {
  let request;
  const receipt = { id: "enquiry-id", status: "received", createdAt: "2026-07-15T10:00:00.000Z" };
  const result = await createEnquiry(payload, {
    fetchImplementation: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ data: receipt }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.deepEqual(result, receipt);
  assert.equal(request.url, "/api/v1/enquiries");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), payload);
});

test("enquiry API preserves safe validation messages", async () => {
  await assert.rejects(
    createEnquiry(payload, {
      fetchImplementation: async () => new Response(JSON.stringify({
        error: { code: "INVALID_ENQUIRY", message: "Consent is required before submitting an enquiry." },
      }), { status: 400, headers: { "content-type": "application/json" } }),
    }),
    (error) => error instanceof EnquiryApiError
      && error.code === "INVALID_ENQUIRY"
      && error.status === 400,
  );
});

test("enquiry API hides network details behind a useful fallback", async () => {
  await assert.rejects(
    createEnquiry(payload, {
      fetchImplementation: async () => { throw new Error("internal host and credentials"); },
    }),
    (error) => error instanceof EnquiryApiError
      && error.code === "ENQUIRY_UNAVAILABLE"
      && !error.message.includes("credentials"),
  );
});

test("enquiry API converts server failures into a friendly message", async () => {
  await assert.rejects(
    createEnquiry(payload, {
      fetchImplementation: async () => new Response(JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "The request could not be completed." },
      }), { status: 500, headers: { "content-type": "application/json" } }),
    }),
    (error) => error instanceof EnquiryApiError
      && error.code === "INTERNAL_ERROR"
      && error.status === 500
      && error.message === "The request could not be completed.",
  );
});
