const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/u, "") ?? "";
const DEFAULT_TIMEOUT_MS = 4000;

export class ConfigurationApiError extends Error {
  constructor(message, { code = "API_UNAVAILABLE", status = 0 } = {}) {
    super(message);
    this.name = "ConfigurationApiError";
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}, requestOptions = {}) {
  const fetchImplementation = requestOptions.fetchImplementation ?? globalThis.fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImplementation(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { "content-type": "application/json", ...options.headers },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ConfigurationApiError(
        body?.error?.message ?? "The configuration service is unavailable.",
        { code: body?.error?.code, status: response.status },
      );
    }
    if (!body?.data || typeof body.data !== "object") {
      throw new ConfigurationApiError("The configuration service returned an invalid response.");
    }
    return body.data;
  } catch (error) {
    if (error instanceof ConfigurationApiError) throw error;
    throw new ConfigurationApiError("The configuration service is unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

export function createPersistedConfiguration({ name = null, configuration }, requestOptions) {
  return request("/api/v1/configurations", {
    method: "POST",
    body: JSON.stringify({ name, configuration }),
  }, requestOptions);
}

export function readPersistedConfiguration(id, requestOptions) {
  return request(`/api/v1/configurations/${encodeURIComponent(id)}`, {}, requestOptions);
}
