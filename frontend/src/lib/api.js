import axios from "axios";

/** Same key as Next middleware: enables protected routes after login on the app origin. */
export const AUTH_TOKEN_KEY = "token";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "https://rentify11.onrender.com";

export const APIBaseUrl = baseURL.replace(/\/$/, "");

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

export default api;
