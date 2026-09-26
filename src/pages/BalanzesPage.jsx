// src/pages/BalancesPage.jsx  (responsive)
//
// 🆕 Meses anteriores: con el atajo "Mes" aparecen las flechas ‹ Agosto 2026 ›.
//    Los totales, la comparación y el gráfico los SUMA EL SERVIDOR (siempre
//    completos). Antes se sumaban en el navegador los primeros 500 ingresos y
//    500 egresos → un mes con más movimientos daba mal.
//
//    Ej: agosto con 1.842 ingresos → antes el Resumen sumaba solo 500;
//        ahora muestra los 1.842 y cuánto subió o bajó contra julio.
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { FaPlus } from "react-icons/fa";
import { HiOfficeBuilding } from "react-icons/hi";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";
import { toast } from "react-hot-toast";
dayjs.locale("es");

// 🚀 CONTEXTO PARA SEGURIDAD (escudo de sucursal)
import { useAuth } from "../context/AuthContext";

// 📡 Datos en vivo: si otra oficina carga un ingreso/egreso, aparece solo.
import useDatosVivos, { useResaltarNuevos } from "../hooks/useDatosVivos";
// 📈 Serie del gráfico (sumada en el servidor)
import useSerieBalance from "../hooks/useSerieBalance";
import { pedirResumenDia, pedirResumenRango, descargarReporteMes } from "../services/balances";

// 🚀 UN solo modal combinado para cargar ingreso O egreso.
import MovimientoCreateModal from "../components/balanzes/MovimientoCreateModal";

// 🚀 Toolbar ÚNICO de filtros (compartido por Resumen y Movimientos).
import BalancesFilters from "../components/balanzes/BalancesFilters";

// 🚀 Tabla de movimientos (SOLO tabla; los datos y filtros los pasa esta página).
import MovimientosPanel from "../components/balanzes/MovimientosPanel";

// 🚀 Gráfico Ingresos vs Egresos (se adapta a claro/oscuro).
import BalanceChart from "../components/balanzes/BalanceChart";

// 📊 Pestaña Resumen (totales, comparación, sucursales, categorías).
import ResumenBalance from "../components/balanzes/ResumenBalance";

// ── Base de API (igual que el resto de la app) ──
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;
const _authHeaders = () => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  return token && token !== "undefined" && token !== "null"
    ? { Authorization: `Bearer ${token.trim()}` }
    : {};
};
const PAGE_SIZE = 50;

/* -------------------- Helpers -------------------- */
const mayuscula = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const mesActual = () => dayjs().format("YYYY-MM");
const nombreMes = (yyyyMM) => mayuscula(dayjs(`${yyyyMM}-01`).format("MMMM YYYY")); // "Agosto 2026"

/* 🚀 Atajos de tiempo. Cada uno devuelve { desde, hasta, modo }. */
const rangoDeAtajo = (key, fechaDia, mesSel) => {
  const hoy = dayjs();
  switch (key) {
    case "hoy":
      return { desde: hoy.format("YYYY-MM-DD"), hasta: hoy.format("YYYY-MM-DD"), modo: "dia" };
    case "ayer": {
      const a = hoy.subtract(1, "day");
      return { desde: a.format("YYYY-MM-DD"), hasta: a.format("YYYY-MM-DD"), modo: "dia" };
    }
    case "semana": {
      // 🐛 Antes: martes a lunes (sumaba 1 día a una semana que ya empezaba el
      //    lunes). Ahora: de LUNES a DOMINGO. Ej: sábado 26/09 → 21/09 al 27/09.
      const lunes = hoy.subtract((hoy.day() + 6) % 7, "day");
      return {
        desde: lunes.format("YYYY-MM-DD"),
        hasta: lunes.add(6, "day").format("YYYY-MM-DD"),
        modo: "rango",
      };
    }
    case "mes": {
      // 🗓️ El mes elegido con ‹ ›, entero (del 1 al último día). Si es el mes en
      //    curso también va entero: un pago cargado con fecha 30/09 tiene que
      //    aparecer en septiembre (igual que en el Inicio y en el reporte Excel).
      const m = dayjs(`${mesSel}-01`);
      return {
        desde: m.startOf("month").format("YYYY-MM-DD"),
        hasta: m.endOf("month").format("YYYY-MM-DD"),
        modo: "rango",
      };
    }
    default:
      return { desde: fechaDia, hasta: fechaDia, modo: "dia" };
  }
};

/* 🆚 ¿Con qué se compara? Solo con el atajo "Mes":
   - mes cerrado (ej: agosto)            → contra julio entero;
   - mes en curso (ej: septiembre al 26) → contra el 1 al 26 de agosto (mismos días),
     así no parece que se vendió menos solo porque el mes no terminó. */
const comparacionDeMes = (mesSel) => {
  const hoy = dayjs();
  const m = dayjs(`${mesSel}-01`);
  const ant = m.subtract(1, "month");
  const nombreAnt = ant.format("MMMM"); // "agosto"
  if (m.isSame(hoy, "month")) {
    const finAnt = Math.min(hoy.date(), ant.daysInMonth()); // ej: 30 de marzo → hasta el 28 de febrero
    const mesCorto = ant.format("MMM").replace(".", "");
    return {
      desde: ant.startOf("month").format("YYYY-MM-DD"),
      hasta: ant.date(finAnt).format("YYYY-MM-DD"),
      etiqueta: finAnt === 1 ? `1 ${mesCorto}` : `1–${finAnt} ${mesCorto}`, // "1–26 ago"
      texto:
        finAnt === 1
          ? `Mes en curso: se compara con el 1 de ${nombreAnt} (el mismo día)`
          : `Mes en curso: se compara con el 1 al ${finAnt} de ${nombreAnt} (los mismos días)`,
    };
  }
  return {
    desde: ant.startOf("month").format("YYYY-MM-DD"),
    hasta: ant.endOf("month").format("YYYY-MM-DD"),
    etiqueta: nombreAnt, // "julio"
    texto: `Comparado con ${nombreAnt} ${ant.format("YYYY")} (mes completo)`,
  };
};

const BalancesPage = () => {
  // 🚀 ESCUDO DE SUCURSAL
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.codigo || user?.perfil?.oficina?.id || user?.perfil?.oficina || "";

  const [oficinaSeleccionada, setOficinaSeleccionada] = useState("ALL");

  // 🚀 Lista de oficinas (solo admin) para el filtro
  const [oficinasAdmin, setOficinasAdmin] = useState([]);
  useEffect(() => {
    if (!isWebAdmin) return;
    const token = localStorage.getItem("access_token");
    axios.get(`${API_BASE}usuarios/oficinas/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setOficinasAdmin(data);
      })
      .catch(err => console.error("Error al cargar lista de sucursales:", err));
  }, [isWebAdmin]);

  // ═══════════════ TOOLBAR: atajo + rango ═══════════════
  const [atajo, setAtajo] = useState("hoy"); // "hoy" por default
  const [mesSel, setMesSel] = useState(mesActual); // 🗓️ mes elegido con ‹ › ("YYYY-MM")
  const [customDesde, setCustomDesde] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [customHasta, setCustomHasta] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [customDia, setCustomDia] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [advOpen, setAdvOpen] = useState(false);

  // Tocar "Mes" (o "Este mes") arranca siempre en el mes actual; después ‹ › para moverse.
  const elegirAtajo = useCallback((key) => {
    if (key === "mes") setMesSel(mesActual());
    setAtajo(key);
  }, []);

  const puedeMesSiguiente = mesSel < mesActual(); // no hay meses futuros
  const onMesAnterior = () => setMesSel((m) => dayjs(`${m}-01`).subtract(1, "month").format("YYYY-MM"));
  const onMesSiguiente = () =>
    setMesSel((m) => {
      const sig = dayjs(`${m}-01`).add(1, "month").format("YYYY-MM");
      return sig > mesActual() ? m : sig;
    });

  // 🚀 Rango efectivo (desde/hasta/modo) según el atajo.
  const { desde, hasta, modo } = useMemo(() => {
    if (atajo === "custom") {
      // Si quedaron al revés (desde después de hasta) se dan vuelta; si falta
      // una, se usa la otra. Ej: 20/08 → 05/08 = del 05/08 al 20/08.
      const hoyTxt = dayjs().format("YYYY-MM-DD");
      let d1 = customDesde || customHasta || hoyTxt;
      let d2 = customHasta || customDesde || hoyTxt;
      if (d1 > d2) [d1, d2] = [d2, d1];
      return { desde: d1, hasta: d2, modo: d1 === d2 ? "dia" : "rango" };
    }
    return rangoDeAtajo(atajo, dayjs().format("YYYY-MM-DD"), mesSel);
  }, [atajo, customDesde, customHasta, mesSel]);

  // 🆚 Comparación contra el mes anterior (solo con "Mes")
  const comparacion = useMemo(() => (atajo === "mes" ? comparacionDeMes(mesSel) : null), [atajo, mesSel]);

  // Filtros de la TABLA (viven en la página ahora)
  const [tipo, setTipo] = useState("ambos");         // ambos | ingresos | egresos
  const [formaPago, setFormaPago] = useState("TODAS");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exporting, setExporting] = useState(false);

  // Estado de la carga de movimientos (para la tabla)
  const [movItems, setMovItems] = useState([]);
  const [movCount, setMovCount] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movLoading, setMovLoading] = useState(false);
  const [movError, setMovError] = useState(null);
  const movTotalPages = Math.max(1, Math.ceil(movCount / PAGE_SIZE));

  // Modales / vista
  const [modalTipo, setModalTipo] = useState(null);
  const [vista, setVista] = useState("movimientos");

  const ofiParam = isWebAdmin ? oficinaSeleccionada : userOficina;

  // ═══════════════ RESUMEN (totales del servidor) ═══════════════
  //   1 día  → balance-diario   ·   rango / mes → balance-mensual
  //   Con "Mes" se pide también el período anterior para comparar.
  //   Solo se pide con la pestaña Resumen abierta.
  const [resumen, setResumen] = useState({ actual: null, anterior: null, clave: null });
  const [resumenCargando, setResumenCargando] = useState(false);
  const [resumenError, setResumenError] = useState(null);
  const resumenPedidoRef = useRef(0);
  const resumenNormalesRef = useRef(0); // cargas "normales" (cambio de filtro) en vuelo
  const claveResumen = `${modo}|${desde}|${hasta}|${ofiParam}|${comparacion?.desde || ""}|${comparacion?.hasta || ""}`;

  // silencioso = recarga EN VIVO: sin "Cargando…" ni carteles de error.
  // Si llega tarde la respuesta de un pedido viejo (ej: tocaste ‹ ‹ ‹ rápido), se ignora.
  const cargarResumen = useCallback(async ({ silencioso = false } = {}) => {
    // En vivo: si justo se está cargando por un cambio de filtro, esa carga ya
    // trae lo último → no la pisamos.
    if (silencioso && resumenNormalesRef.current > 0) return false;
    const mio = ++resumenPedidoRef.current;
    if (!silencioso) {
      resumenNormalesRef.current += 1;
      setResumenCargando(true);
      setResumenError(null);
    }
    try {
      const [actual, anterior] = await Promise.all([
        modo === "dia" ? pedirResumenDia(desde, ofiParam) : pedirResumenRango(desde, hasta, ofiParam),
        comparacion ? pedirResumenRango(comparacion.desde, comparacion.hasta, ofiParam) : Promise.resolve(null),
      ]);
      if (mio !== resumenPedidoRef.current) return false;
      setResumen({ actual, anterior, clave: claveResumen });
      setResumenError(null);
      return true;
    } catch (err) {
      if (mio !== resumenPedidoRef.current) return false;
      console.error("[Balances] Error al cargar el resumen:", err);
      if (!silencioso) {
        // No dejamos a la vista los números del período anterior con el título del nuevo.
        setResumen({ actual: null, anterior: null, clave: null });
        setResumenError("No se pudo cargar el resumen.");
      }
      return false;
    } finally {
      if (!silencioso) resumenNormalesRef.current -= 1;
      if (mio === resumenPedidoRef.current) setResumenCargando(false);
    }
  }, [modo, desde, hasta, ofiParam, comparacion, claveResumen]);

  useEffect(() => {
    if (vista !== "resumen") {
      resumenPedidoRef.current += 1; // lo que esté en vuelo ya no cuenta
      setResumenCargando(false);
      return;
    }
    cargarResumen();
  }, [vista, cargarResumen]);

  // ═══════════════ GRÁFICO (serie del servidor) ═══════════════
  const [vistaGrafico, setVistaGrafico] = useState("meses"); // "dias" | "meses"
  const grafico = useMemo(() => {
    const hoy = dayjs();
    const fmt = (d) => d.format("YYYY-MM-DD");
    if (vistaGrafico === "meses") {
      // 12 meses. Si el mes elegido está entre los últimos 12, la ventana queda
      // fija hasta el mes actual (así al tocar barras el gráfico no "salta").
      const hoyMes = hoy.startOf("month");
      const sel = atajo === "mes" ? dayjs(`${mesSel}-01`) : dayjs(hasta).startOf("month");
      const fin = hoyMes.diff(sel, "month") <= 11 ? hoyMes : sel;
      return {
        agrupar: "mes",
        desde: fmt(fin.subtract(11, "month").startOf("month")),
        hasta: fmt(fin.endOf("month")),
        destacado: atajo === "mes" ? mesSel : null,
        subtitulo: fin.isSame(hoyMes, "month")
          ? "Últimos 12 meses · tocá un mes para verlo"
          : `12 meses hasta ${fin.format("MMMM YYYY")} · tocá un mes para verlo`,
      };
    }
    if (atajo === "mes") {
      const m = dayjs(`${mesSel}-01`);
      const enCurso = m.isSame(hoy, "month");
      return {
        agrupar: "dia",
        desde: fmt(m.startOf("month")),
        hasta: fmt(m.endOf("month")),
        destacado: enCurso ? fmt(hoy) : null,
        subtitulo: `${nombreMes(mesSel)}, día por día`,
      };
    }
    if (modo === "dia") {
      const d = dayjs(desde);
      return {
        agrupar: "dia",
        desde: fmt(d.subtract(29, "day")),
        hasta: fmt(d),
        destacado: desde,
        subtitulo: `Últimos 30 días hasta el ${d.format("DD/MM/YYYY")}`,
      };
    }
    // Semana o rango elegido: sus días (como mucho los últimos 62).
    const fin = dayjs(hasta);
    let ini = dayjs(desde);
    if (fin.diff(ini, "day") > 61) ini = fin.subtract(61, "day");
    return {
      agrupar: "dia",
      desde: fmt(ini),
      hasta: fmt(fin),
      destacado: null,
      subtitulo: `Día por día, del ${ini.format("DD/MM")} al ${fin.format("DD/MM/YYYY")}`,
    };
  }, [vistaGrafico, atajo, mesSel, modo, desde, hasta]);

  const serie = useSerieBalance({
    agrupar: grafico.agrupar,
    desde: grafico.desde,
    hasta: grafico.hasta,
    oficina: ofiParam,
    activo: vista === "resumen",
  });

  // Tocar una barra del gráfico de 12 meses → ir a ese mes.
  const irAlMes = useCallback((periodo) => {
    if (!/^\d{4}-\d{2}$/.test(String(periodo || ""))) return;
    if (periodo > mesActual()) return;
    setMesSel(periodo);
    setAtajo("mes");
  }, []);

  // 📡 Filas NUEVAS (en vivo): se marcan unos segundos. Ver más abajo.
  const { nuevos: movNuevos, marcar: marcarMovNuevos, olvidar: olvidarMovNuevos } = useResaltarNuevos(
    movItems,
    (it) => `${it?._tipo}-${it?.id}`
  );

  // ── Cargar la TABLA de movimientos (endpoint unificado) ──
  // silencioso = recarga EN VIVO: sin "Cargando…" ni carteles de error.
  // movPedidoRef: si llega tarde la respuesta de un pedido viejo (ej: cambiaste
  // de filtro mientras se recargaba en vivo), se ignora: vale el último.
  // Devuelve true si cargó bien (lo usa el marcado de NUEVO).
  const movPedidoRef = useRef(0);
  const movNormalesRef = useRef(0); // cargas "normales" (filtro/página) en vuelo
  const cargarMovimientos = useCallback(async (p = 1, { silencioso = false } = {}) => {
    const mio = ++movPedidoRef.current;
    if (!silencioso) {
      movNormalesRef.current += 1;
      olvidarMovNuevos(); // carga "normal" (filtro/página): nada se marca NUEVO
      setMovLoading(true);
      setMovError(null);
    }
    try {
      const params = { tipo, page: p, page_size: PAGE_SIZE };
      if (ofiParam && ofiParam !== "ALL") params.oficina = ofiParam;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (formaPago && formaPago !== "TODAS") params.forma_pago = formaPago;
      if (q) params.search = q;

      const res = await axios.get(`${API_BASE}ingresos/movimientos/`, { params, headers: _authHeaders() });
      if (mio !== movPedidoRef.current) return false;
      const data = res?.data;
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setMovItems(results);
      setMovCount(Number(data?.count ?? results.length));
      return true;
    } catch (err) {
      console.error("[Balances] Error al cargar movimientos:", err);
      if (silencioso || mio !== movPedidoRef.current) return false; // en vivo: si falla, dejamos lo que se ve
      toast.error("No se pudieron cargar los movimientos.");
      setMovError("No se pudieron cargar los movimientos.");
      setMovItems([]);
      setMovCount(0);
      return false;
    } finally {
      if (!silencioso) movNormalesRef.current -= 1;
      if (mio === movPedidoRef.current) setMovLoading(false);
    }
  }, [tipo, ofiParam, desde, hasta, formaPago, q, olvidarMovNuevos]);

  // Recargar la tabla cuando cambian los filtros (solo si estamos en Movimientos)
  useEffect(() => {
    if (vista !== "movimientos") return;
    setMovPage(1);
    cargarMovimientos(1);
  }, [vista, tipo, ofiParam, desde, hasta, formaPago, q, cargarMovimientos]);

  const onBuscar = (e) => { e?.preventDefault?.(); setQ(qInput.trim()); };
  const onLimpiarBusqueda = () => { setQInput(""); setQ(""); };
  const onPage = (p) => { setMovPage(p); cargarMovimientos(p); };

  // 📡 EN VIVO: cambió la caja (un cobro, un ingreso o egreso cargado en
  //    cualquier oficina) → se recarga lo que se está viendo, en silencio.
  //    Las filas nuevas quedan marcadas "NUEVO" unos segundos (solo en la
  //    página 1: en las otras, una fila "nueva" es solo una que se corrió).
  const recargandoVivo = useDatosVivos(["caja"], () => {
    const tareas = [];
    if (vista === "resumen") {
      tareas.push(cargarResumen({ silencioso: true }));
      tareas.push(serie.recargar({ silencioso: true }));
    }
    // Si justo se está cargando por un cambio de filtro/página, esa carga ya
    // trae lo último: no la pisamos con una recarga en vivo.
    if (vista === "movimientos" && movNormalesRef.current === 0) {
      const foto = movPage === 1 ? marcarMovNuevos() : null;
      tareas.push(
        cargarMovimientos(movPage, { silencioso: true }).then((ok) => {
          if (!ok && foto) olvidarMovNuevos(foto);
        })
      );
    }
    return Promise.allSettled(tareas);
  });

  // ── Descargar (Excel / PDF) ──
  const onExport = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading(exportFormat === "pdf" ? "Generando PDF…" : "Generando Excel…");
    try {
      const params = { tipo, export: exportFormat };
      if (ofiParam && ofiParam !== "ALL") params.oficina = ofiParam;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (formaPago && formaPago !== "TODAS") params.forma_pago = formaPago;
      if (q) params.search = q;

      const res = await axios.get(`${API_BASE}ingresos/movimientos/`, {
        params, headers: _authHeaders(), responseType: "blob", timeout: 60_000,
      });

      const ct = String(res.headers?.["content-type"] || "").toLowerCase();
      const esArchivo = ct.includes("spreadsheet") || ct.includes("xlsx") || ct.includes("pdf") || ct.includes("octet");
      if (!esArchivo) {
        const txt = await res.data.text();
        let detail = txt;
        try { const j = JSON.parse(txt); detail = j.detail || j.error || txt; } catch { /* noop */ }
        throw new Error(detail || "El servidor no devolvió un archivo.");
      }

      const ext = exportFormat === "pdf" ? "pdf" : "xlsx";
      const etiqueta = tipo === "ingresos" ? "Ingresos" : tipo === "egresos" ? "Egresos" : "Movimientos";
      // El nombre dice qué período trae (antes decía siempre la fecha de hoy).
      const periodoArchivo = modo === "dia" ? desde : `${desde}_a_${hasta}`;
      const filename = `${etiqueta}_${periodoArchivo}.${ext}`;

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);

      toast.dismiss(toastId);
      toast.success(`${exportFormat === "pdf" ? "PDF" : "Excel"} generado`, { duration: 3500 });
    } catch (err) {
      console.error("[Balances] Error al exportar:", err);
      toast.dismiss(toastId);
      const st = err?.response?.status;
      if (st === 401 || st === 403) toast.error("Tu sesión expiró. Volvé a iniciar sesión.");
      else if (st === 404) toast.error("Endpoint no encontrado. Avisale al admin.");
      else toast.error(err?.message || "Error al generar el archivo.");
    } finally {
      setExporting(false);
    }
  };

  // ── Reporte del mes (Excel con tablas y gráficos, lo arma el servidor) ──
  const [descargandoReporte, setDescargandoReporte] = useState(false);
  const onReporteMes = async () => {
    if (descargandoReporte) return;
    setDescargandoReporte(true);
    const toastId = toast.loading(`Generando el reporte de ${dayjs(`${mesSel}-01`).format("MMMM")}…`);
    try {
      await descargarReporteMes(mesSel, ofiParam);
      toast.success("Reporte generado", { id: toastId, duration: 3500 });
    } catch (err) {
      console.error("[Balances] Error al generar el reporte del mes:", err);
      const st = err?.response?.status;
      toast.error(
        st === 401 || st === 403 ? "Tu sesión expiró. Volvé a iniciar sesión." : "No se pudo generar el reporte del mes.",
        { id: toastId }
      );
    } finally {
      setDescargandoReporte(false);
    }
  };

  const cargando =
    !recargandoVivo &&
    (vista === "movimientos" ? movLoading : resumenCargando || serie.cargando);

  const etiquetaAtajo = {
    hoy: "Hoy", ayer: "Ayer", semana: "Esta semana", mes: "Mes", custom: "Rango elegido",
  }[atajo] || "Hoy";

  const periodoTexto = useMemo(() => {
    if (modo === "dia") return dayjs(desde).format("DD/MM/YYYY");
    return `${dayjs(desde).format("DD/MM/YYYY")} → ${dayjs(hasta).format("DD/MM/YYYY")}`;
  }, [modo, desde, hasta]);

  // Título y bajada del Resumen según el período.
  const { tituloResumen, subtituloResumen } = useMemo(() => {
    const largo = (f) => mayuscula(dayjs(f).format("dddd D [de] MMMM [de] YYYY"));
    const corto = (f) => dayjs(f).format("DD/MM/YYYY");
    if (atajo === "mes") return { tituloResumen: nombreMes(mesSel), subtituloResumen: comparacion?.texto || "" };
    if (atajo === "hoy") return { tituloResumen: "Hoy", subtituloResumen: largo(desde) };
    if (atajo === "ayer") return { tituloResumen: "Ayer", subtituloResumen: largo(desde) };
    if (atajo === "semana") {
      return { tituloResumen: "Esta semana", subtituloResumen: `Del ${dayjs(desde).format("DD/MM")} al ${corto(hasta)}` };
    }
    if (modo === "dia") return { tituloResumen: corto(desde), subtituloResumen: largo(desde) };
    return { tituloResumen: "Rango elegido", subtituloResumen: `Del ${corto(desde)} al ${corto(hasta)}` };
  }, [atajo, mesSel, comparacion, modo, desde, hasta]);

  const aplicarCustomDia = () => { setCustomDesde(customDia); setCustomHasta(customDia); setAtajo("custom"); };
  const aplicarCustomRango = () => setAtajo("custom");

  const nombreOficinaSel = oficinaSeleccionada === "ALL"
    ? "Todas"
    : (oficinasAdmin.find((o) => String(o.id) === String(oficinaSeleccionada))?.nombre || oficinaSeleccionada);

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-10 text-titulo dark:text-titulo-dark max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-suave dark:text-suave-dark mb-1 flex items-center gap-2 truncate">
            Balance
            {!isWebAdmin && (
              <span className="inline-flex items-center gap-1 bg-duo-verde/10 text-duo-verde-sombra dark:text-duo-verde border border-duo-verde/25 px-2 py-0.5 rounded-full text-[11px] font-medium truncate">
                <HiOfficeBuilding className="shrink-0" /> <span className="truncate">{user?.perfil?.oficina_nombre || `Sucursal ${userOficina}`}</span>
              </span>
            )}
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold truncate text-titulo dark:text-titulo-dark">
            Balances
          </h1>
          <p className="text-[13px] text-suave dark:text-suave-dark mt-1 truncate">
            Ingresos y egresos de la caja
          </p>
        </div>

        {/* Botones de carga rápida — planos. 📱 Full-width apilados en mobile. */}
        <div className="flex flex-col sm:flex-row gap-2 md:shrink-0">
          <button
            type="button"
            onClick={() => setModalTipo("INGRESO")}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg text-[13px] font-medium text-white bg-duo-verde hover:brightness-110 transition-colors"
          >
            <FaPlus /> Nuevo ingreso
          </button>
          <button
            type="button"
            onClick={() => setModalTipo("EGRESO")}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg text-[13px] font-medium text-white bg-duo-rojo hover:brightness-110 transition-colors"
          >
            <FaPlus /> Nuevo egreso
          </button>
        </div>
      </div>

      {/* ===================== TOOLBAR ÚNICO (compartido) ===================== */}
      <BalancesFilters
        isWebAdmin={isWebAdmin}
        oficinasAdmin={oficinasAdmin}
        atajo={atajo} setAtajo={elegirAtajo}
        etiquetaMes={nombreMes(mesSel)}
        onMesAnterior={onMesAnterior}
        onMesSiguiente={onMesSiguiente}
        puedeMesSiguiente={puedeMesSiguiente}
        advOpen={advOpen} setAdvOpen={setAdvOpen}
        customDia={customDia} setCustomDia={setCustomDia}
        customDesde={customDesde} setCustomDesde={setCustomDesde}
        customHasta={customHasta} setCustomHasta={setCustomHasta}
        onAplicarDia={aplicarCustomDia}
        onAplicarRango={aplicarCustomRango}
        oficinaSeleccionada={oficinaSeleccionada} setOficinaSeleccionada={setOficinaSeleccionada}
        tipo={tipo} setTipo={setTipo}
        formaPago={formaPago} setFormaPago={setFormaPago}
        qInput={qInput} setQInput={setQInput}
        onBuscar={onBuscar}
        onLimpiarBusqueda={onLimpiarBusqueda}
        exportFormat={exportFormat} setExportFormat={setExportFormat}
        onExport={onExport}
        exporting={exporting}
        etiquetaAtajo={etiquetaAtajo}
        periodoTexto={periodoTexto}
        nombreOficinaSel={nombreOficinaSel}
        cargando={cargando}
        // En Resumen ocultamos tipo/forma/buscar/descargar (no aplican al gráfico/KPIs).
        mostrarFiltrosTabla={vista === "movimientos"}
      />

      {/* ===================== SELECTOR DE VISTA ===================== */}
      {/* 📱 En el celu los 2 tabs ocupan el ancho (mitad y mitad). */}
      <div className="mb-5 border-b border-linea dark:border-linea-dark flex gap-2 pb-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: "movimientos", label: "Movimientos" },
          { id: "resumen", label: "Resumen" },
        ].map((tab) => {
          const active = vista === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setVista(tab.id)}
              aria-current={active ? "page" : undefined}
              className={`flex-1 sm:flex-none whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-t-lg text-[13px] font-medium transition-colors border border-b-0 ${active ? "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark" : "bg-transparent border-transparent text-suave dark:text-suave-dark hover:bg-card dark:hover:bg-card-dark hover:text-titulo dark:hover:text-titulo-dark"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===================== RESUMEN ===================== */}
      {vista === "resumen" && (
      <section className="space-y-5">
        <ResumenBalance
          actual={resumen.actual}
          anterior={resumen.anterior}
          comparacion={comparacion}
          titulo={tituloResumen}
          subtitulo={subtituloResumen}
          mostrarSucursales={isWebAdmin && oficinaSeleccionada === "ALL"}
          cargando={resumenCargando}
          desactualizado={resumen.clave !== claveResumen}
          error={resumenError}
          onReintentar={() => cargarResumen()}
          mostrarReporte={atajo === "mes"}
          onReporte={onReporteMes}
          descargandoReporte={descargandoReporte}
        />

        {/* 🚀 Gráfico Ingresos vs Egresos (serie del servidor) */}
        <BalanceChart
          puntos={serie.puntos}
          agrupar={serie.agruparDatos || grafico.agrupar}
          opciones={[
            { id: "dias", label: "Día por día" },
            { id: "meses", label: "12 meses" },
          ]}
          valor={vistaGrafico}
          onCambiar={setVistaGrafico}
          destacado={grafico.destacado}
          onElegir={(serie.agruparDatos || grafico.agrupar) === "mes" ? irAlMes : null}
          subtitulo={grafico.subtitulo}
          cargando={serie.cargando}
          desactualizado={serie.desactualizado}
          error={serie.error}
          onReintentar={() => serie.recargar()}
        />
      </section>
      )}

      {/* ===================== MOVIMIENTOS (solo tabla) ===================== */}
      {vista === "movimientos" && (
      <section className="mt-2">
        <MovimientosPanel
          items={movItems}
          count={movCount}
          loading={movLoading}
          error={movError}
          page={movPage}
          totalPages={movTotalPages}
          onPage={onPage}
          onReintentar={() => cargarMovimientos(movPage)}
          nuevos={movNuevos}
        />
      </section>
      )}

      {/* Modales */}
      <MovimientoCreateModal
        isOpen={modalTipo !== null}
        tipoInicial={modalTipo || "INGRESO"}
        onClose={() => setModalTipo(null)}
      />
    </div>
  );
};

export default BalancesPage;
