// src/services/vivo.js
// ============================================================
// 📡 DATOS EN VIVO — "el cartero" (UNO solo para toda la app)
//
// Ejemplo fácil: cada 20 s el cartero pregunta al servidor
// "¿cómo están los números?" (GET notificaciones/novedades/, ~300 bytes).
// Cada tema tiene un número: pagos=41, caja=90, polizas=880…
//   · Si ningún número cambió → no se baja nada más.
//   · Si "caja" pasó de 90 a 91 → avisa SOLO a las pantallas abiertas que
//     usan "caja" (ej: Balances), y esa pantalla se recarga en silencio.
//
// Reglas:
//   · Solo pregunta con la pestaña a la vista y con internet. Al volver a la
//     pestaña (o a internet) pregunta al toque.
//   · Si hay un formulario/modal abierto, el aviso ESPERA a que se cierre
//     (así no se te borra lo que estabas escribiendo).
//   · Después de guardar algo (POST/PUT/PATCH/DELETE) pregunta enseguida:
//     los contadores y las otras pantallas se ponen al día al toque.
//
// Las pantallas se anotan con el hook src/hooks/useDatosVivos.js.
// El indicador "● EN VIVO" del header lee el estado con escucharEstado().
// Del lado del servidor: notificaciones/novedades.py.
// ============================================================

const CADA_MS = 20000; // cada cuánto pregunta el cartero
const PRONTO_MS = 1200; // después de guardar algo, pregunta a los 1,2 s
const REVISAR_FORM_MS = 1500; // con un aviso en espera, mira cada 1,5 s si se cerró el formulario

function apiRoot() {
  const raw = (
    (typeof window !== "undefined" && (window.__API_URL__ || window.API_URL || window.API_BASE)) ||
    import.meta?.env?.VITE_API_BASE ||
    import.meta?.env?.VITE_API_URL ||
    ""
  )
    .toString()
    .trim();
  if (!raw) return "/api/";
  const base = raw.endsWith("/") ? raw : `${raw}/`;
  if (/\/api\/?$/i.test(base)) return base.replace(/\/api\/?$/i, "/api/");
  return `${base}api/`;
}

function token() {
  try {
    return localStorage.getItem("access_token") || localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

// ── Estado del cartero (lo muestra el indicador) ─────────────────────────
// modo: "vivo" | "actualizando" | "sin_conexion" | "no_disponible" | "sin_sesion"
//   (no_disponible = el servidor todavía no tiene el cartero, ej: se publicó
//    el front antes que el back. La app sigue andando con los refrescos de
//    siempre y el indicador no se muestra.)
//   (sin_sesion = el servidor dice 401/403: venció la sesión. El indicador no
//    se muestra y la app vuelve a sus refrescos de siempre.)
// enEspera: cuántas pantallas tienen un aviso esperando que se cierre un formulario
let estado = { modo: "vivo", ultima: null, enEspera: 0 };
const oyentes = new Set();

function setEstado(parcial) {
  estado = { ...estado, ...parcial };
  oyentes.forEach((fn) => {
    try {
      fn(estado);
    } catch {
      /* un oyente roto no frena a los demás */
    }
  });
}

export function getEstado() {
  return estado;
}

export function escucharEstado(fn) {
  oyentes.add(fn);
  try {
    fn(estado);
  } catch {
    /* nada */
  }
  return () => oyentes.delete(fn);
}

// ── ¿Hay un formulario abierto? ──────────────────────────────────────────
// Un modal de la app es un overlay "fixed inset-0" (o role=dialog). Si adentro
// tiene campos para completar, consideramos que hay un formulario abierto.
export function hayFormularioAbierto() {
  if (typeof document === "undefined") return false;
  try {
    const capas = document.querySelectorAll('[role="dialog"], [aria-modal="true"], .fixed.inset-0');
    for (const el of capas) {
      if (!el.getClientRects().length) continue; // no está a la vista
      if (el.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select')) {
        return true;
      }
    }
  } catch {
    /* ante la duda, no frenamos */
  }
  return false;
}

// ── Pantallas anotadas ───────────────────────────────────────────────────
const subs = new Map(); // id → { dominios:Set, fn, siempre }
const pendientes = new Map(); // id → Set de dominios que esperan un formulario
let seq = 0;
let esperaTimer = null;

function llamar(sub, dominios) {
  try {
    sub.fn(dominios);
  } catch (e) {
    console.warn("[vivo] error al recargar:", e);
  }
}

function actualizarEspera() {
  setEstado({ enEspera: pendientes.size });
  if (pendientes.size && !esperaTimer) {
    esperaTimer = setInterval(() => {
      if (hayFormularioAbierto()) return;
      const lista = [...pendientes.entries()];
      pendientes.clear();
      clearInterval(esperaTimer);
      esperaTimer = null;
      lista.forEach(([id, doms]) => {
        const s = subs.get(id);
        if (s) llamar(s, [...doms]);
      });
      setEstado({ enEspera: 0 });
    }, REVISAR_FORM_MS);
  }
  if (!pendientes.size && esperaTimer) {
    clearInterval(esperaTimer);
    esperaTimer = null;
  }
}

function repartir(cambiados) {
  const cambio = new Set(cambiados);
  const formulario = hayFormularioAbierto();
  let alguno = false;
  subs.forEach((s, id) => {
    const toca = [...s.dominios].filter((d) => cambio.has(d));
    if (!toca.length) return;
    if (formulario && !s.siempre) {
      const p = pendientes.get(id) || new Set();
      toca.forEach((d) => p.add(d));
      pendientes.set(id, p);
      return;
    }
    if (!s.siempre) alguno = true;
    llamar(s, toca);
  });
  actualizarEspera();
  if (alguno) {
    setEstado({ modo: "actualizando" });
    setTimeout(() => {
      if (estado.modo === "actualizando") setEstado({ modo: "vivo" });
    }, 1200);
  }
}

/**
 * Anota una pantalla. dominios: ["caja", "pagos"]; fn(cambiados) recarga.
 * opciones.siempre = true → no espera a que se cierren los formularios
 * (para contadores del menú, que no molestan a nadie).
 * Devuelve la función para desanotarse.
 */
export function suscribir(dominios, fn, opciones = {}) {
  const id = ++seq;
  subs.set(id, {
    dominios: new Set((dominios || []).filter(Boolean)),
    fn,
    siempre: !!opciones.siempre,
  });
  return () => {
    subs.delete(id);
    if (pendientes.delete(id)) actualizarEspera();
  };
}

// ── La pregunta al servidor ──────────────────────────────────────────────
let versiones = null; // última foto de los números
let comprobando = false;
let timer = null;
let pronto = null;
let activo = false;
let ultimo404 = 0; // si el servidor no tiene el cartero, reintenta recién a los 5 min

async function revisar() {
  if (!activo || comprobando) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setEstado({ modo: "sin_conexion" });
    return;
  }
  const tk = token();
  if (!tk) return;
  if (estado.modo === "no_disponible" && Date.now() - ultimo404 < 300000) return;
  comprobando = true;
  try {
    const res = await fetch(`${apiRoot()}notificaciones/novedades/`, {
      headers: { Authorization: `Bearer ${tk}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      // Sesión vencida: no molestamos, pero tampoco decimos "EN VIVO" si no anda.
      setEstado({ modo: "sin_sesion" });
      return;
    }
    if (res.status === 404) {
      ultimo404 = Date.now();
      setEstado({ modo: "no_disponible" });
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const v = (data && data.v) || {};
    const cambiados = [];
    if (versiones) {
      Object.keys(v).forEach((d) => {
        if (versiones[d] !== v[d]) cambiados.push(d);
      });
    }
    versiones = v;
    setEstado({ modo: estado.modo === "actualizando" ? "actualizando" : "vivo", ultima: new Date() });
    if (cambiados.length) repartir(cambiados);
  } catch {
    setEstado({ modo: "sin_conexion" });
  } finally {
    comprobando = false;
  }
}

/** Pregunta en un ratito (se usa después de guardar algo). */
export function revisarPronto(ms = PRONTO_MS) {
  if (!activo) return;
  clearTimeout(pronto);
  pronto = setTimeout(revisar, ms);
}

function alVolver() {
  if (document.visibilityState === "visible") revisar();
}
function alConectar() {
  revisar();
}
function alDesconectar() {
  setEstado({ modo: "sin_conexion" });
}

// Después de guardar algo en la API (POST/PUT/PATCH/DELETE que salió bien),
// el cartero pregunta enseguida. Mira fetch y XMLHttpRequest (axios), sin
// cambiar nada de lo que hacen.
function escucharGuardados() {
  if (typeof window === "undefined" || window.__vivoEscuchaGuardados) return;
  window.__vivoEscuchaGuardados = true;
  const esApi = (url) => typeof url === "string" && url.includes("/api/") && !url.includes("notificaciones/novedades");
  const esCambio = (m) => !["GET", "HEAD", "OPTIONS"].includes(String(m || "GET").toUpperCase());

  const fetchOriginal = window.fetch;
  if (typeof fetchOriginal === "function") {
    window.fetch = function (input, init) {
      const metodo = (init && init.method) || (input && typeof input === "object" && input.method) || "GET";
      const url = typeof input === "string" ? input : (input && input.url) || "";
      const p = fetchOriginal.apply(this, arguments);
      if (esCambio(metodo) && esApi(url)) {
        p.then((r) => {
          if (r && r.ok) revisarPronto();
        }).catch(() => {});
      }
      return p;
    };
  }

  const X = window.XMLHttpRequest;
  if (X && X.prototype) {
    const open = X.prototype.open;
    const send = X.prototype.send;
    X.prototype.open = function (metodo, url) {
      this.__vivo = { metodo, url: String(url || "") };
      return open.apply(this, arguments);
    };
    X.prototype.send = function () {
      const info = this.__vivo;
      if (info && esCambio(info.metodo) && esApi(info.url)) {
        this.addEventListener("loadend", () => {
          if (this.status >= 200 && this.status < 300) revisarPronto();
        });
      }
      return send.apply(this, arguments);
    };
  }
}

/** ¿El cartero está andando? (si no, la app usa sus refrescos de respaldo). */
export function disponible() {
  return activo && (estado.modo === "vivo" || estado.modo === "actualizando");
}

/** Arranca el cartero (al iniciar sesión). */
export function iniciar() {
  if (activo || typeof window === "undefined") return;
  activo = true;
  escucharGuardados();
  document.addEventListener("visibilitychange", alVolver);
  window.addEventListener("online", alConectar);
  window.addEventListener("offline", alDesconectar);
  timer = setInterval(revisar, CADA_MS);
  revisar();
}

/** Lo frena (al cerrar sesión). La próxima sesión arranca de cero. */
export function detener() {
  if (!activo) return;
  activo = false;
  clearInterval(timer);
  clearTimeout(pronto);
  timer = null;
  pronto = null;
  versiones = null;
  ultimo404 = 0;
  document.removeEventListener("visibilitychange", alVolver);
  window.removeEventListener("online", alConectar);
  window.removeEventListener("offline", alDesconectar);
  pendientes.clear();
  actualizarEspera();
  setEstado({ modo: "vivo", ultima: null, enEspera: 0 });
}

export default { iniciar, detener, suscribir, escucharEstado, getEstado, revisarPronto, hayFormularioAbierto, disponible };
