// src/services/sesion.js
// ============================================================
// 🔐 SESIÓN QUE NO SE CORTA SOLA
//
// Antes:
//   · El permiso de entrada (access token) dura 1 día. Al otro día, el primer
//     pedido daba 401 y la app te sacaba, aunque el "permiso largo" (refresh
//     token, 7 días) estaba guardado y nunca se usaba.
//   · Al sacarte hacía location.href = "/login", que con las rutas "#/" de la
//     app no andaba bien.
//
// Ahora:
//   · Si el permiso está por vencer (menos de 2 minutos), se renueva solo
//     antes de pedir. Si igual llega un 401, se renueva y se repite el pedido.
//       Ej: entraste ayer a las 9 → hoy a las 9:01 la app renueva sola y seguís.
//   · Solo te saca si el servidor dice que el permiso largo tampoco sirve.
//   · Si el servidor no responde o da error 5xx (ej: Railway reiniciando en un
//     deploy), NO te saca: el pedido falla y se reintenta después.
// ============================================================
import axios from "axios";
import { avisarSiEstabaDeBaja } from "../utils/pagos/avisoReactivacion";

const RAW = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/").toString().trim();
export const API_BASE = RAW.endsWith("/") ? RAW : `${RAW}/`;

const leer = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

// ¿El pedido va a NUESTRA API? (Cloudinary, Google, etc. no se tocan)
function esDeLaApi(config) {
  const url = String(config?.url || "");
  const completa = /^https?:\/\//i.test(url) ? url : `${config?.baseURL || ""}${url}`;
  if (/^https?:\/\//i.test(completa)) return completa.startsWith(API_BASE);
  return completa.startsWith("/api/") || completa.startsWith("api/");
}

const esLogin = (config) => /token\/(refresh\/)?$/.test(String(config?.url || "").split("?")[0]);

// Milisegundos que le quedan al token (null si no se puede leer).
function leQueda(token) {
  try {
    const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(parte));
    return exp * 1000 - Date.now();
  } catch {
    return null;
  }
}

// Encabezado de autorización (axios 1.x: AxiosHeaders, sin importar mayúsculas).
function tieneToken(config) {
  const h = config?.headers;
  if (!h) return false;
  if (typeof h.has === "function") return h.has("Authorization");
  return Boolean(h.Authorization || h.authorization);
}

function ponerToken(config, token) {
  if (!config.headers) config.headers = {};
  if (typeof config.headers.set === "function") {
    config.headers.set("Authorization", `Bearer ${token}`);
  } else {
    delete config.headers.authorization;
    config.headers.Authorization = `Bearer ${token}`;
  }
}

let renovando = null;

// Pide un permiso nuevo con el refresh token (un solo pedido aunque lo pidan 10 a la vez).
export function renovarSesion() {
  if (renovando) return renovando;
  const refresh = leer("refresh_token");
  if (!refresh) return Promise.reject(Object.assign(new Error("sin refresh"), { sinPermisoLargo: true }));
  renovando = axios
    .post(`${API_BASE}token/refresh/`, { refresh }, { _sinSesion: true })
    .then(({ data }) => {
      localStorage.setItem("access_token", data.access);
      if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
      return data.access;
    })
    .finally(() => {
      renovando = null;
    });
  return renovando;
}

// Saca de la app (solo cuando el servidor dijo que el permiso no sirve más).
export function cerrarSesion() {
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("thames.usuario");
  } catch {
    /* nada */
  }
  if (!String(window.location.hash || "").startsWith("#/login")) {
    window.location.hash = "#/login";
    window.location.reload();
  }
}

// El servidor dijo "ese permiso largo no sirve" (no es un corte de internet ni un 5xx).
export const permisoLargoRechazado = (err) => {
  const st = err?.response?.status;
  return err?.sinPermisoLargo || st === 400 || st === 401;
};

export function instalarSesion(instancia, { siempreConToken = false } = {}) {
  // Una sola vez por cliente (si se vuelve a llamar, solo se actualiza la opción).
  if (instancia.__sesion) {
    if (siempreConToken) instancia.__sesion.siempreConToken = true;
    return;
  }
  instancia.__sesion = { siempreConToken };

  instancia.interceptors.request.use(async (config) => {
    if (config._sinSesion || !esDeLaApi(config) || esLogin(config)) return config;
    let token = leer("access_token");
    if (!token) return config;
    const queda = leQueda(token);
    if (queda != null && queda < 2 * 60 * 1000 && leer("refresh_token")) {
      try {
        token = await renovarSesion();
      } catch {
        /* si no se pudo, sigue con el que había: si da 401, se resuelve abajo */
      }
    }
    // Siempre el token MÁS NUEVO (otros pedidos lo armaron con el viejo).
    if (instancia.__sesion.siempreConToken || tieneToken(config)) ponerToken(config, token);
    return config;
  });

  instancia.interceptors.response.use(
    (r) => {
      // 💳 Se cobró una póliza que estaba dada de baja → cartel "verificá en
      //    la compañía" (ver utils/pagos/avisoReactivacion.js).
      avisarSiEstabaDeBaja(r);
      return r;
    },
    async (error) => {
      const config = error?.config || {};
      const st = error?.response?.status;
      if (st !== 401 || config._sinSesion || config._reintentado || !esDeLaApi(config) || esLogin(config)) {
        return Promise.reject(error);
      }
      if (!leer("access_token")) return Promise.reject(error); // nunca entró (ej: portal del cliente)
      try {
        const nuevo = await renovarSesion();
        config._reintentado = true;
        ponerToken(config, nuevo);
        return instancia(config);
      } catch (e) {
        if (permisoLargoRechazado(e)) {
          console.warn("[sesion] La sesión venció: hay que volver a entrar.");
          cerrarSesion();
        } else {
          // No se pudo renovar por internet o porque el servidor está
          // reiniciando: NO es "sesión vencida". Se marca para que nadie saque
          // al usuario por este 401 (ver AuthContext).
          error.sesionNoRenovada = true;
        }
        return Promise.reject(error);
      }
    }
  );
}

// 🌐 Para TODA la app (se llama una vez, antes que nada, desde main.jsx):
//   · el axios "suelto" y cada axios.create() que hagan las pantallas
//     (hay 7 clientes distintos) quedan con la sesión que se renueva sola;
//   · los fetch() a la API: si dan 401, se renueva el permiso para los
//     pedidos que siguen (y si el permiso largo ya no sirve, al login).
export function instalarSesionGlobal() {
  if (typeof window === "undefined" || window.__thamesSesion) return;
  window.__thamesSesion = true;

  instalarSesion(axios);
  const crearOriginal = axios.create;
  axios.create = function (...args) {
    const inst = crearOriginal.apply(this, args);
    try {
      instalarSesion(inst);
    } catch {
      /* si algo falla, el cliente queda como antes */
    }
    return inst;
  };

  const fetchOriginal = window.fetch;
  if (typeof fetchOriginal !== "function") return;
  window.fetch = function (...args) {
    const p = fetchOriginal.apply(this, args);
    const input = args[0];
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (esDeLaApi({ url }) && !esLogin({ url })) {
      p.then((r) => {
        if (r && r.status === 401 && leer("access_token")) {
          renovarSesion().catch((e) => {
            if (permisoLargoRechazado(e)) cerrarSesion();
          });
        }
      }).catch(() => {});
    }
    return p;
  };
}
