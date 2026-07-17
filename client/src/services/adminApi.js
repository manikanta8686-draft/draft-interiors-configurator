const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/u, "") ?? "";

export class AdminApiError extends Error {
  constructor(message, { code = "ADMIN_UNAVAILABLE", status = 0 } = {}) {
    super(message);
    this.name = "AdminApiError";
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "content-type": "application/json", "x-admin-request": "DraftInteriors" } : {}),
        ...options.headers,
      },
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new AdminApiError(body?.error?.message ?? "The admin service is unavailable.", {
        code: body?.error?.code,
        status: response.status,
      });
    }
    return body?.data;
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    throw new AdminApiError("The admin service is unavailable. Check that the server is running.");
  }
}

export const getAdminSession = () => request("/api/v1/admin/session");
export const createAdminSession = (credentials) => request("/api/v1/admin/session", { method: "POST", body: JSON.stringify(credentials) });
export const deleteAdminSession = () => request("/api/v1/admin/session", { method: "DELETE", headers: { "x-admin-request": "DraftInteriors" } });

export function listAdminEnquiries(filters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined));
  return request(`/api/v1/admin/enquiries?${query}`);
}

export const getAdminEnquiry = (id) => request(`/api/v1/admin/enquiries/${encodeURIComponent(id)}`);
export const updateAdminEnquiryStatus = (id, status) => request(`/api/v1/admin/enquiries/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
export const addAdminEnquiryNote = (id, body) => request(`/api/v1/admin/enquiries/${encodeURIComponent(id)}/notes`, { method: "POST", body: JSON.stringify({ body }) });
