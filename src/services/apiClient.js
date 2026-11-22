import { fetchFailure } from "./fetchFailure.js";
const API_BASE_URL = (import.meta.env?.VITE_API_URL || "http://localhost:3001")
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");
const API_PREFIX = "/api/v1";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApiError extends Error {
  constructor({ status, code, message, fields, requestId, cause }) {
    super(message || "The request could not be completed.");
    this.name = "ApiError";
    this.status = status;
    this.code = code || "REQUEST_FAILED";
    this.fields = fields || {};
    this.requestId = requestId;
    this.cause = cause;
  }
}

let csrfToken = null;
let csrfRequest = null;
let sessionRequest = null;

function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ceda:session-expired"));
  }
}

function apiUrl(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    throw new TypeError("API paths must be same-origin paths beginning with one slash.");
  }
  return `${API_BASE_URL}${API_PREFIX}${path}`;
}

function fieldsFromDetails(details) {
  if (!Array.isArray(details)) return undefined;
  return Object.fromEntries(details.filter((item) => item?.path).map((item) => [item.path, "Check this value."]));
}

async function readError(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Some proxy and network errors do not include a JSON body.
  }
  const error = body?.error || body || {};
  const statusMessages = {
    401: "Your session has ended. Sign in again to continue.",
    403: "You do not have access to this action.",
    404: "This item could not be found.",
    409: "This record changed. Reload it and try again.",
    422: "Check the highlighted fields and try again.",
  };
  return new ApiError({
    status: response.status,
    code: error.code,
    message: error.message || statusMessages[response.status] || "The request could not be completed.",
    // The API reports field problems as details: [{ path, code }].
    fields: error.fields || fieldsFromDetails(error.details),
    requestId: error.requestId || response.headers.get("x-request-id"),
  });
}

async function obtainCsrfToken(signal) {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = fetch(apiUrl("/auth/csrf"), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          clearCsrfToken();
          notifySessionExpired();
        }
        if (!response.ok) throw await readError(response);
        const body = await response.json();
        const token = body.data?.csrfToken || body.csrfToken || body.token;
        if (typeof token !== "string" || token.length === 0) {
          throw new ApiError({ status: response.status, code: "CSRF_TOKEN_MISSING", message: "The server did not provide a CSRF token." });
        }
        csrfToken = token;
        return token;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  try {
    return await csrfRequest;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(fetchFailure(error));
  }
}

export function clearCsrfToken() {
  csrfToken = null;
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (options.body !== undefined && !(options.body instanceof FormData) && options.rawBody !== true) {
    headers.set("Content-Type", "application/json");
  }
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
  if (options.ifMatch !== undefined) headers.set("If-Match", String(options.ifMatch));
  if (MUTATING_METHODS.has(method)) {
    headers.set("X-CSRF-Token", await obtainCsrfToken(options.signal));
  }

  let response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      method,
      headers,
      credentials: "include",
      body:
        options.body === undefined || options.body instanceof FormData || options.rawBody === true
          ? options.body
          : JSON.stringify(options.body),
    });
  } catch (cause) {
    throw new ApiError(fetchFailure(cause));
  }

  if (response.status === 204) return null;
  if (response.status === 401) {
    clearCsrfToken();
    notifySessionExpired();
    throw await readError(response);
  }
  if (!response.ok) {
    if (response.status === 403) clearCsrfToken();
    throw await readError(response);
  }
  if (response.headers.get("content-length") === "0") return null;
  const contentType = response.headers.get("content-type") || "";
  if (options.responseType === "blob") return response.blob();
  return contentType.includes("application/json") ? response.json() : response.text();
}

export const authApi = {
  csrf: (options) => obtainCsrfToken(options?.signal),
  async login(options = {}) {
    const token = await obtainCsrfToken(options.signal);
    const result = await apiRequest("/auth/login", {
      ...options,
      method: "POST",
      body: {},
      headers: { ...options.headers, "X-CSRF-Token": token },
    });
    return result?.data || result;
  },
  async localLogin(email, password, options = {}) {
    const token = await obtainCsrfToken(options.signal);
    const result = await apiRequest("/auth/local-login", {
      ...options,
      method: "POST",
      body: { email, password },
      headers: { ...options.headers, "X-CSRF-Token": token },
    });
    return result?.data || result;
  },
  session(options) {
    if (!sessionRequest) {
      sessionRequest = apiRequest("/auth/session", options)
        .then((result) => result?.data || result)
        .finally(() => { sessionRequest = null; });
    }
    return sessionRequest;
  },
  logout: (options) => apiRequest("/auth/logout", { ...options, method: "POST" }),
};
