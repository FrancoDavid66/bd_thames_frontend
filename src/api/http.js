// src/api/http.js
import axios from "axios";

// Tomamos primero VITE_API_BASE, si no, VITE_API_URL, si no, REACT_APP_API_BASE
const rawEnvBase =
  (typeof import.meta !== "undefined" &&
    import.meta?.env?.VITE_API_BASE &&
    String(import.meta.env.VITE_API_BASE).trim()) ||
  (typeof import.meta !== "undefined" &&
    import.meta?.env?.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  (typeof process !== "undefined" &&
    process.env.REACT_APP_API_BASE &&
    String(process.env.REACT_APP_API_BASE).trim()) ||
  "";

// Normalizamos: sacamos /api al final y barras sobrantes
let base = rawEnvBase || (typeof window !== "undefined"
  ? window.location.origin + "/api"
  : "http://localhost:8000/api");

base = String(base).trim();
base = base.replace(/\s+$/g, "");
base = base.replace(/\/+$/g, "");
base = base.replace(/\/api$/i, "");

// Siempre terminamos en .../api
const baseURL = `${base}/api`.replace(/\/+$/, "");

const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response) {
      console.error("API error:", err.response.status, err.response.data);
    } else {
      console.error("API error:", err.message);
    }
    return Promise.reject(err);
  }
);

export default http;
