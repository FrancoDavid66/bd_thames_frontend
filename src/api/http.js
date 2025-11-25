import axios from "axios";

const envBase =
  import.meta?.env?.VITE_API_BASE ||
  import.meta?.env?.VITE_API_URL ||
  process.env.REACT_APP_API_BASE ||
  "";

// Si no hay env, cae a window.origin + "/api"
const baseURL = (envBase || (window.location.origin + "/api")).replace(/\/+$/, "");

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
