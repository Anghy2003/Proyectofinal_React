// src/services/apiClient.ts
import { API_BASE_URL } from "../config/api.ts";

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function parseBody(resp: Response) {
  // ✅ Para 204/205 o respuestas vacías
  if (resp.status === 204 || resp.status === 205) return null;

  const ct = resp.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    const text = await resp.text();
    return text ? JSON.parse(text) : null;
  }

  const t = await resp.text();
  return t || null;
}


function buildUrl(path: string, query?: Record<string, any>) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${cleanPath}`);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }

  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  opts?: { query?: Record<string, any>; body?: any; token?: string }
): Promise<T> {
  const url = buildUrl(path, opts?.query);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (opts?.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts?.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const resp = await fetch(url, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = await parseBody(resp);

  if (!resp.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `HTTP ${resp.status} ${method} ${path}`;
    throw new ApiError(resp.status, msg, data);
  }

  return data as T;
}

export const apiClient = {
  // básicos
  get: <T>(path: string, query?: Record<string, any>, token?: string) =>
    request<T>("GET", path, { query, token }),

  post: <T>(path: string, body?: any, token?: string) =>
    request<T>("POST", path, { body, token }),

  put: <T>(path: string, body?: any, token?: string) =>
    request<T>("PUT", path, { body, token }),

  del: <T>(path: string, token?: string) => request<T>("DELETE", path, { token }),

  // ✅ con query (para tus endpoints tipo: PUT /.../estado?estado=...&moderadorId=...)
  putQ: <T>(path: string, query?: Record<string, any>, token?: string) =>
    request<T>("PUT", path, { query, token }),

  postQ: <T>(path: string, query?: Record<string, any>, body?: any, token?: string) =>
    request<T>("POST", path, { query, body, token }),
};
