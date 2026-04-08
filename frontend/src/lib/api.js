import axios from "axios";

/** Same key as Next middleware: enables protected routes after login on the app origin. */
export const AUTH_TOKEN_KEY = "token";

const DEFAULT_API_ORIGIN = "https://rentify11.onrender.com";

/** Avoids https://host/api + /api/... → /api/api/... when env is set to .../api */
function normalizeApiOrigin(url) {
  if (!url || typeof url !== "string") return DEFAULT_API_ORIGIN;
  let u = url.trim().replace(/\/+$/, "");
  if (u.endsWith("/api")) u = u.slice(0, -4);
  return u;
}

export function getApiBaseUrl() {
  return normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_ORIGIN);
}

const baseURL = getApiBaseUrl();

export const APIBaseUrl = baseURL;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export function setAuthSession(token) {
  if (typeof window === "undefined" || !token) return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  document.cookie = "token=; path=/; max-age=0";
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem(AUTH_TOKEN_KEY);
    if (t) {
      config.headers.Authorization = `Bearer ${t}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined" && err.response?.status === 401) {
      const path = err.config?.url || "";
      if (path.includes("/api/auth/me")) {
        clearAuthSession();
      }
    }
    return Promise.reject(err);
  }
);

export default api;
