import * as SecureStore from "expo-secure-store";
import { API_CONFIG } from "../../config/api.config";
import { USER_PROFILE_KEY, getAccessToken, refreshCustomerSession } from "../authSession";

export interface RequestOptions extends RequestInit {
  timeout?: number;
  userEmail?: string;
  userPhone?: string;
  customerId?: string | number;
}

export const getAuthHeaders = async (options?: {
  userEmail?: string;
  userPhone?: string;
  customerId?: string | number;
}): Promise<Record<string, string>> => {
  let email = options?.userEmail;
  let phone = options?.userPhone;
  let id = options?.customerId ? String(options.customerId) : undefined;

  if (!email || !phone || !id) {
    try {
      const stored = await SecureStore.getItemAsync(USER_PROFILE_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        if (!email && (user.email || user.userEmail)) email = user.email || user.userEmail;
        if (!phone && (user.phone || user.phoneNumber)) phone = user.phone || user.phoneNumber;
        if (!id && (user.customerId || user.id)) id = String(user.customerId || user.id);
      }
    } catch (e) {
      console.warn("[httpClient] Error reading user profile from SecureStore:", e);
    }
  }

  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  if (email) {
    headers["X-User-Email"] = email;
  }
  if (phone) {
    headers["X-Phone-Number"] = phone.replace(/\D/g, "").slice(-10);
  }
  if (id) {
    headers["X-Customer-Id"] = id;
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const base = (API_CONFIG.BASE_URL || "https://api.kfpclexports.com")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/v1\/?$/i, "")
    .replace(/\/api\/?$/i, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  const authHeaders = await getAuthHeaders({
    userEmail: options.userEmail,
    userPhone: options.userPhone,
    customerId: options.customerId,
  });

  const headers = {
    ...authHeaders,
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const timeout = options.timeout || API_CONFIG.TIMEOUT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const contentType = response.headers.get("content-type") || "";
    let data: any;

    try {
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch {
      data = null;
    }

    if (!response.ok) {
      // Auto-retry once on 401 Unauthorized using refreshCustomerSession or Firebase token
      const isRetry = (options.headers as any)?.["X-Is-Retry"] === "true";
      const isAuthEndpoint = path.includes("/api/auth/refresh") || path.includes("/api/auth/logout");

      if (response.status === 401 && !isRetry && !isAuthEndpoint) {
        // 1. Try refreshing session via backend refresh token
        try {
          const newToken = await refreshCustomerSession();
          if (newToken) {
            const retryHeaders = {
              ...headers,
              "Authorization": `Bearer ${newToken}`,
              "X-Is-Retry": "true",
            };
            return await apiFetch<T>(endpoint, {
              ...options,
              headers: retryHeaders,
            });
          }
        } catch (refreshErr) {
          console.warn("[httpClient] refreshCustomerSession retry notice:", refreshErr);
        }

        // 2. Try refreshing Firebase ID token if available
        try {
          const { auth } = require("../../screens/config/firebase");
          const authInstance = typeof auth === "function" ? auth() : auth;
          if (authInstance && authInstance.currentUser) {
            const freshFbToken = await authInstance.currentUser.getIdToken(true);
            if (freshFbToken) {
              const retryHeaders = {
                ...headers,
                "Authorization": `Bearer ${freshFbToken}`,
                "X-Is-Retry": "true",
              };
              return await apiFetch<T>(endpoint, {
                ...options,
                headers: retryHeaders,
              });
            }
          }
        } catch (fbErr) {
          console.warn("[httpClient] Firebase token refresh retry notice:", fbErr);
        }
      }

      const errorMsg = typeof data === "object" ? data?.message || data?.error || JSON.stringify(data) : data;
      console.warn(`[apiFetch] HTTP ${response.status} on ${options.method || "GET"} ${path}:`, errorMsg);
      const err: any = new Error(errorMsg || `Request failed with status ${response.status}`);
      err.status = response.status;
      err.data = data;
      err.response = { status: response.status, data };
      throw err;
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms: ${path}`);
    }
    throw err;
  }
};

export const http = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),

  postForm: <T = any>(endpoint: string, formData: FormData, options?: RequestOptions): Promise<T> => {
    return new Promise(async (resolve, reject) => {
      try {
        const base = (API_CONFIG.BASE_URL || "https://api.kfpclexports.com")
          .trim()
          .replace(/\/+$/, "")
          .replace(/\/api\/v1\/?$/i, "")
          .replace(/\/api\/?$/i, "");
        const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        const url = `${base}${path}`;

        const authHeaders = await getAuthHeaders({
          userEmail: options?.userEmail,
          userPhone: options?.userPhone,
          customerId: options?.customerId,
        });

        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.timeout = options?.timeout || API_CONFIG.TIMEOUT;

        const mergedHeaders = {
          ...authHeaders,
          ...((options?.headers as Record<string, string>) || {}),
        };

        Object.entries(mergedHeaders).forEach(([k, v]) => {
          if (k.toLowerCase() !== "content-type" && v) {
            xhr.setRequestHeader(k, String(v));
          }
        });

        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed as T);
            } else {
              const err: any = new Error(parsed?.message || `HTTP ${xhr.status}: ${xhr.statusText}`);
              err.status = xhr.status;
              err.data = parsed;
              err.response = { status: xhr.status, data: parsed };
              reject(err);
            }
          } catch {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText as any);
            } else {
              const err: any = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
              err.status = xhr.status;
              reject(err);
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network request failed"));
        xhr.ontimeout = () => reject(new Error("Request timed out"));
        xhr.send(formData);
      } catch (err) {
        reject(err);
      }
    });
  },

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
};

export default http;

