const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/u, "") ?? "";
const DEFAULT_TIMEOUT_MS = 6000;

export class EnquiryApiError extends Error {
  constructor(message, { code = "ENQUIRY_UNAVAILABLE", status = 0 } = {}) {
    super(message);
    this.name = "EnquiryApiError";
    this.code = code;
    this.status = status;
  }
}

export function createEnquirySubmissionId() {
  return globalThis.crypto.randomUUID();
}

export async function createEnquiry(payload, requestOptions = {}) {
  const fetchImplementation = requestOptions.fetchImplementation ?? globalThis.fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImplementation(`${API_BASE_URL}/api/v1/enquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new EnquiryApiError(
        body?.error?.message ?? "Your enquiry could not be sent.",
        { code: body?.error?.code, status: response.status },
      );
    }
    if (body?.data?.status !== "received" || typeof body.data.id !== "string") {
      throw new EnquiryApiError("The enquiry service returned an invalid response.");
    }
    return body.data;
  } catch (error) {
    if (error instanceof EnquiryApiError) throw error;
    throw new EnquiryApiError("Your enquiry could not be sent. Please try WhatsApp or email instead.");
  } finally {
    clearTimeout(timeout);
  }
}
