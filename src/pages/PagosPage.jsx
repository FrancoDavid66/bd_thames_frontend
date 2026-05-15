/* src/pages/PagosPage.jsx — Panel Pagos + Recordatorios (integrado con slice pagos) */
import { useState, useEffect, useMemo, useCallback, useDeferredValue, useTransition } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  HiBadgeCheck,
  HiClock,
  HiSearch,
  HiX,
  HiSparkles,
  HiCog,
  HiSpeakerphone,
  HiEyeOff,
  HiReceiptTax,
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiDownload,
  HiCalendar,
  HiUserGroup,
  HiIdentification,
  HiChevronRight as HiChevronRightMini,
  HiChartBar, // 🚀 NUEVO ICONO PARA MÉTRICAS
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../context/AuthContext";

import PagosSearch from "../components/pagos/PagosSearch";
import PagosList from "../components/pagos/PagosList";
import CuotasAlertas from "../components/pagos/CuotasAlertas";
import CuentasCobroModal from "../components/pagos/CuentasCobroModal";
import RecordatoriosCuotasModal from "../components/pagos/RecordatoriosCuotasModal";
import HistorialRecordatorios from "../components/pagos/HistorialRecordatorios";
import ReporteEfectividadModal from "../components/pagos/ReporteEfectividadModal"; // 🚀 NUEVO COMPONENTE

import {
  fetchMediosCobro,
  enviarRecordatoriosCuotas,
  enviarTodasOficinas,
  fetchHistorialRecordatorios,
  fetchHistorialPagos,
  downloadHistorialPagosCSV,
  downloadHistorialPagosPDF,
} from "../store/slices/pagosSlice";

dayjs.locale("es");

/* ---------- helpers UI ---------- */
const monthKey = (d) => dayjs(d).format("YYYY-MM");
const monthLabel = (ym) => {
  const [y, m] = String(ym || "").split("-");
  if (!y || !m) return String(ym || "");
  const d = dayjs(`${y}-${m}-01`);
  return d.isValid() ? d.format("MMMM YYYY") : String(ym || "");
};

const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
};

const safe = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

const ymd = (d) => dayjs(d).format("YYYY-MM-DD");

/* ---------- helpers historial pagos: timestamp real ---------- */
function pickRegistroTs(it) {
  const v = it?.pago_registrado_en ?? it?.registrado_en ?? it?.pago_ts ?? null;
  if (v) return v;

  const f = it?.fecha_guardado_pago || "";
  const h = it?.hora_guardado_pago || it?.pago_hora || "";
  if (f && h) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(f).trim());
    if (m) return `${m[3]}-${m[2]}-${m[1]}T${String(h).trim()}:00`;
  }
  return null;
}

function fmtRegistro(it) {
  const ts = pickRegistroTs(it);
  if (!ts) {
    const f = String(it?.fecha_guardado_pago || "").trim();
    const h = String(it?.pago_hora || it?.hora_guardado_pago || "").trim();
    if (f && h) return `${f} ${h}`;
    if (f) return f;
    if (h) return h;
    return "—";
  }

  const d = dayjs(ts);
  if (d.isValid()) return d.format("DD/MM/YYYY HH:mm");

  try {
    const s = String(ts);
    if (s.includes("T")) {
      const [datePart, timePart] = s.split("T");
      const dd = dayjs(datePart).isValid()
        ? dayjs(datePart).format("DD/MM/YYYY")
        : datePart;
      const hhmm = (timePart || "").slice(0, 5);
      return `${dd} ${hhmm}`.trim();
    }
    return s;
  } catch {
    return "—";
  }
}

function normalizeCuotaFlat(item) {
  const it = item && typeof item === "object" ? item : {};
  const cliIn = it.cliente && typeof it.cliente === "object" ? it.cliente : {};
  const polIn = it.poliza && typeof it.poliza === "object" ? it.poliza : {};

  const cliente = {
    id: cliIn?.cliente_id ?? null,
    apellido: String(cliIn?.apellido ?? "").trim(),
    nombre: String(cliIn?.nombre ?? "").trim(),
    dni_cuit_cuil: String(cliIn?.dni_cuit_cuil ?? "").trim(),
    telefono: String(cliIn?.telefono ?? "").trim(),
  };

  const poliza = {
    id: polIn?.poliza_id ?? null,
    numero_poliza: String(polIn?.numero_poliza ?? "").trim(),
    patente: String(polIn?.patente ?? "").trim(),
    marca: String(polIn?.marca ?? "").trim(),
    modelo: String(polIn?.modelo ?? "").trim(),
    cobertura: String(polIn?.cobertura ?? "").trim(),
    compania_nombre: String(polIn?.compania_nombre ?? "").trim(),
    oficina: String(polIn?.oficina ?? "").trim(),
    cliente,
    cliente_id: cliente.id ?? null,
    cliente_nombre: cliente.nombre,
    cliente_apellido: cliente.apellido,
    cliente_nombre_apellido: `${cliente.apellido} ${cliente.nombre}`.trim(),
  };

  const pago_registrado_en = it?.pago_registrado_en ?? null;
  const pago_hm = String(it?.pago_hm ?? "").trim();
  const pago_hm_full = String(it?.pago_hm_full ?? "").trim();

  return {
    id: it?.id ?? null,
    cuota_nro: it?.cuota_nro ?? null,
    monto: it?.monto ?? null,
    pagado: Boolean(it?.pagado),
    fecha_vencimiento: it?.fecha_vencimiento ?? null,
    fecha_pago: it?.fecha_pago ?? null,
    forma_pago: String(it?.forma_pago ?? "").trim(),
    pago_registrado_en,
    pago_hm,
    pago_hm_full,
    observaciones: String(it?.observaciones ?? "").trim(),
    observaciones_pago: String(it?.observaciones ?? "").trim(),
    ultima_observacion_pago: String(it?.ultima_observacion_pago ?? "").trim(),
    total_cuotas: it?.total_cuotas ?? null,
    cuota_label: String(it?.cuota_label ?? "").trim(),
    cantidad_cuotas: it?.total_cuotas ?? null,
    poliza,
    cliente,
  };
}

function clienteKeyFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  const id = cli?.id ?? null;
  if (id !== null && id !== undefined && String(id).trim() !== "") return `id:${id}`;
  const dni = String(cli?.dni_cuit_cuil ?? "").trim();
  if (dni) return `dni:${dni}`;
  const nom = `${String(cli?.apellido ?? "").trim()} ${String(cli?.nombre ?? "").trim()}`.trim().toLowerCase();
  return nom ? `nom:${nom}` : "unknown";
}

function clienteLabelFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  const ap = String(cli?.apellido ?? "").trim();
  const nom = String(cli?.nombre ?? "").trim();
  return [ap, nom].filter(Boolean).join(" ").trim() || "Cliente";
}

function dniFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  return String(cli?.dni_cuit_cuil ?? "").trim();
}

function uniquePolizaLabel(pol) {
  const p = pol && typeof pol === "object" ? pol : {};
  const nro = String(p.numero_poliza || "").trim();
  const pat = String(p.patente || "").trim().toUpperCase();
  if (nro && pat) return `${nro} • ${pat}`;
  if (nro) return nro;
  if (pat) return pat;
  return "Póliza";
}

function extractRawOficina(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  return String(
    pol?.oficina_nombre ?? pol?.oficinaName ?? pol?.oficina_id ?? pol?.oficinaId ?? pol?.oficina ??
    it?.oficina_nombre ?? it?.oficina_id ?? it?.oficinaId ?? it?.oficina ?? ""
  ).trim();
}

function getOficinaName(raw) {
  const s = String(raw).toUpperCase();
  if (!s) return "";
  if (s === "1" || s.includes("ESQUINA")) return "5 Esquinas";
  if (s === "2" || s.includes("AXION")) return "Axion";
  if (s === "3" || s.includes("39")) return "Km 39";
  return String(raw);
}

function computeClienteGroups(cuotasList) {
  const list = Array.isArray(cuotasList) ? cuotasList : [];
  const hoy = dayjs().startOf("day");
  const map = new Map();

  for (const c of list) {
    const key = clienteKeyFromCuota(c);
    const label = clienteLabelFromCuota(c);
    const dni = dniFromCuota(c);
    const pol = c?.poliza || {};
    const polId = pol?.id ?? null;
    const polLabel = uniquePolizaLabel(pol);

    const hit =
      map.get(key) ||
      {
        key, label, dni, cuotas: [], polizasSet: new Set(), polizasLabels: new Map(),
        oficinasSet: new Set(), 
        total: 0, pagadas: 0, pendientes: 0, vencidas: 0, venceHoy: 0, porVencer: 0,
        totalMontoPendiente: 0, proximoVto: null,
      };

    hit.cuotas.push(c);
    hit.total += 1;

    const rawOfi = extractRawOficina(c);
    if (rawOfi) hit.oficinasSet.add(getOficinaName(rawOfi));

    if (polId !== null && polId !== undefined) {
      const pid = String(polId);
      hit.polizasSet.add(pid);
      if (!hit.polizasLabels.has(pid)) hit.polizasLabels.set(pid, polLabel);
    } else {
      const pseudo = `x:${polLabel}`;
      hit.polizasSet.add(pseudo);
      if (!hit.polizasLabels.has(pseudo)) hit.polizasLabels.set(pseudo, polLabel);
    }

    if (c?.pagado) {
      hit.pagadas += 1;
    } else {
      hit.pendientes += 1;
      const m = Number(c?.monto ?? 0);
      if (Number.isFinite(m)) hit.totalMontoPendiente += m;

      const fv = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento).startOf("day") : null;
      if (fv && fv.isValid()) {
        if (fv.isBefore(hoy)) hit.vencidas += 1;
        else if (fv.isSame(hoy)) hit.venceHoy += 1;
        else hit.porVencer += 1;

        if (!hit.proximoVto || fv.isBefore(hit.proximoVto)) hit.proximoVto = fv;
      } else {
        hit.porVencer += 1;
      }
    }
    map.set(key, hit);
  }

  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    const ap = a.pendientes > 0 ? 1 : 0;
    const bp = b.pendientes > 0 ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (a.vencidas !== b.vencidas) return b.vencidas - a.vencidas;
    const av = a.proximoVto ? a.proximoVto.valueOf() : Number.POSITIVE_INFINITY;
    const bv = b.proximoVto ? b.proximoVto.valueOf() : Number.POSITIVE_INFINITY;
    if (av !== bv) return av - bv;
    return String(a.label).localeCompare(String(b.label));
  });

  return arr.map((g) => ({
    ...g,
    polizasCount: g.polizasSet.size,
    polizas: Array.from(g.polizasLabels.values()).slice(0, 6),
    oficinasLabel: Array.from(g.oficinasSet).join(" y "),
    proximoVtoStr: g.proximoVto ? g.proximoVto.format("DD/MM/YYYY") : "—",
  }));
}

const OFICINAS_OPTS = [
  { value: "ALL", label: "Todas" },
  { value: "1", label: "5 esquinas (1)" },
  { value: "2", label: "Axion (2)" },
  { value: "3", label: "39 (3)" },
];

function extractHpMonto(it) {
  const monto = it?.monto_pagado ?? it?.monto ?? it?.importe ?? it?.precio_cuota ?? null;
  const n = Number(monto);
  return Number.isFinite(n) ? n : null;
}

function extractHpCliente(it) {
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  const cli = pol?.cliente && typeof pol.cliente === "object" ? pol.cliente : null;
  const apellido = String(cli?.apellido ?? pol?.cliente_apellido ?? it?.cliente_apellido ?? "").trim();
  const nombre = String(cli?.nombre ?? pol?.cliente_nombre ?? it?.cliente_nombre ?? "").trim();
  const asegurado = String(
      pol?.cliente_nombre_apellido ?? pol?.cliente_nombre_completo ??
      it?.cliente_nombre_apellido ?? it?.cliente_nombre_completo ??
      pol?.asegurado_nombre ?? pol?.asegurado ?? it?.asegurado ?? ""
    ).trim();
  const full = `${apellido} ${nombre}`.trim();
  const label = full || asegurado || "Cliente";
  const dni = String(cli?.dni_cuit_cuil ?? pol?.cliente_dni ?? it?.cliente_dni ?? it?.dni ?? it?.dni_cuit_cuil ?? "").trim();
  const tel = String(cli?.telefono ?? pol?.cliente_telefono ?? it?.cliente_telefono ?? it?.telefono ?? "").trim();
  return { label, dni, tel };
}

function extractHpPoliza(it) {
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  const polizaId = pol?.id ?? it?.poliza_id ?? null;
  const patente = String(pol?.patente ?? it?.patente ?? "").trim().toUpperCase();
  const numero = String(pol?.numero_poliza ?? it?.numero_poliza ?? "").trim();
  const compania = String(pol?.compania_nombre ?? it?.compania_nombre ?? it?.compania ?? "").trim();
  const oficina = String(pol?.oficina ?? it?.oficina ?? "").trim();
  const marca = String(pol?.marca ?? it?.marca ?? "").trim();
  const modelo = String(pol?.modelo ?? it?.modelo ?? "").trim();
  const titulo = [patente || null, numero ? `N° ${numero}` : null, compania || null].filter(Boolean).join(" • ");
  const subtitulo = [marca || null, modelo || null].filter(Boolean).join(" ");
  return { polizaId, patente, numero, compania, oficina, titulo: titulo || "Póliza", subtitulo };
}

function extractHpCuota(it) {
  const cuotaNro = it?.cuota_nro ?? it?.nro ?? it?.numero ?? null;
  const cuotaLabel = String(it?.cuota_label ?? it?.label ?? "").trim();
  const vto = it?.fecha_vencimiento ?? it?.vencimiento ?? null;
  const fpago = it?.fecha_pago ?? it?.pago_fecha ?? null;
  const forma = String(it?.forma_pago ?? it?.metodo ?? it?.medio ?? it?.medio_pago ?? "").trim();
  return { cuotaNro, cuotaLabel, vto, fpago, forma };
}

/* ================== PAGE ================== */
const PagosPage = () => {
  const dispatch = useDispatch();
  
  // 🚀 Obtenemos los datos del usuario para el Escudo de Sucursal
  const { user } = useAuth();

  // Forzamos la lógica para que sea estricta: solo si dice 'ADMIN'
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.id || user?.perfil?.oficina || "";

  const [tab, setTab] = useState("pagos");
  const [showCuentasModal, setShowCuentasModal] = useState(false);
  const [showRecordatoriosModal, setShowRecordatoriosModal] = useState(false);
  const [showReporteModal, setShowReporteModal] = useState(false); // 🚀 NUEVO ESTADO

  const [cuotas, setCuotas] = useState([]);
  const [ocultarPagadas, setOcultarPagadas] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [lastBuscarQuery, setLastBuscarQuery] = useState("");
  const [lastBuscarMeta, setLastBuscarMeta] = useState({ count: 0, next: null, previous: null });

  const [alertasOficina, setAlertasOficina] = useState(() => {
    if (!isWebAdmin && userOficina) return String(userOficina);
    return "ALL";
  });
  
  const [sendingRecordatorios, setSendingRecordatorios] = useState(false);

  const [hpModo, setHpModo] = useState("MES");
  const [hpMes, setHpMes] = useState(monthKey(new Date()));
  const [hpDia, setHpDia] = useState(ymd(new Date()));
  const [hpDesde, setHpDesde] = useState(ymd(dayjs().startOf("month")));
  const [hpHasta, setHpHasta] = useState(ymd(new Date()));
  
  const [hpOficina, setHpOficina] = useState(() => {
    if (!isWebAdmin && userOficina) return String(userOficina);
    return "ALL";
  });
  
  const [hpQInput, setHpQInput] = useState("");
  const [hpQApplied, setHpQApplied] = useState("");
  const [hpPage, setHpPage] = useState(1);
  const hpPageSize = 25;
  const [hpOrdering, setHpOrdering] = useState("-fecha_pago");
  const deferredHpQInput = useDeferredValue(hpQInput);
  const [isPending, startTransition] = useTransition();

  const {
    mediosCobro = [],
    mpCuentas = [],
    billeteras = [],
    historialRecordatorios = [],
    historialRecordatoriosStatus = "idle",
    historialPagosItems = [],
    historialPagosMeta = { count: 0, next: null, previous: null },
    historialPagosStatus = "idle",
    historialPagosError = null,
    historialPagosDownloadStatus = "idle",
    historialPagosDownloadError = null,
    historialPagosDownloadPdfStatus = "idle",
    historialPagosDownloadPdfError = null,
  } = useSelector((state) => state.pagos || {});

  const loadingHistorialRecordatorios = historialRecordatoriosStatus === "loading";
  const loadingHistorialPagos = historialPagosStatus === "loading";
  const downloadingCSV = historialPagosDownloadStatus === "loading";
  const downloadingPDF = historialPagosDownloadPdfStatus === "loading";

  useEffect(() => {
    dispatch(fetchMediosCobro({ activo: true }));
  }, [dispatch]);

  const mesesOptions = useMemo(() => {
    const out = [];
    const base = dayjs().startOf("month");
    for (let i = 0; i < 18; i++) out.push(base.subtract(i, "month").format("YYYY-MM"));
    return out;
  }, []);

  useEffect(() => {
    if (tab !== "historial_pagos") return;
    const t = setTimeout(() => {
      const next = String(deferredHpQInput || "").trim();
      startTransition(() => {
        setHpQApplied(next);
        setHpPage(1);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [deferredHpQInput, tab, startTransition]);

  const handleChangeTab = useCallback(
    (nuevoTab) => {
      if (nuevoTab === tab) return;
      setTab(nuevoTab);
      if (nuevoTab === "historial_recordatorios") {
        dispatch(fetchHistorialRecordatorios());
        return;
      }
      if (nuevoTab === "historial_pagos") setHpPage(1);
    },
    [dispatch, tab]
  );

  const buildHistorialParams = useCallback(
    (extra = null) => {
      const base = {
        oficina: hpOficina === "ALL" ? undefined : hpOficina,
        q: hpQApplied || undefined,
        page: hpPage,
        page_size: hpPageSize,
        ordering: hpOrdering || "-fecha_pago",
      };
      let out;
      if (hpModo === "DIA") {
        out = { ...base, dia: hpDia, mes: undefined, desde: undefined, hasta: undefined };
      } else if (hpModo === "RANGO") {
        out = { ...base, desde: hpDesde || undefined, hasta: hpHasta || undefined, mes: undefined, dia: undefined };
      } else {
        out = { ...base, mes: hpMes, dia: undefined, desde: undefined, hasta: undefined };
      }
      if (extra && typeof extra === "object") out = { ...out, ...extra };
      return out;
    },
    [hpModo, hpOficina, hpQApplied, hpPage, hpPageSize, hpMes, hpDia, hpDesde, hpHasta, hpOrdering]
  );

  useEffect(() => {
    if (tab !== "historial_pagos") return;
    dispatch(fetchHistorialPagos(buildHistorialParams()));
  }, [dispatch, tab, buildHistorialParams]);

  const handleBuscarPolizas = useCallback((cuotasFlat, meta, q) => {
    const lista = Array.isArray(cuotasFlat) ? cuotasFlat : [];
    const normalized = lista.map(normalizeCuotaFlat);

    setCuotas(normalized);
    setClienteSeleccionado(null);

    if (meta && typeof meta === "object") {
      setLastBuscarMeta({
        count: Number(meta?.count || 0) || 0,
        next: meta?.next ?? null,
        previous: meta?.previous ?? null,
      });
    } else {
      setLastBuscarMeta({ count: normalized.length, next: null, previous: null });
    }
    setLastBuscarQuery(String(q || "").trim());
  }, []);

  const handleActualizarCuotas = useCallback((actualizadas = []) => {
    if (!Array.isArray(actualizadas) || actualizadas.length === 0) return;
    setCuotas((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const map = new Map();
      actualizadas.forEach((item) => {
        const obj =
          item?.cuotaActualizada && typeof item.cuotaActualizada === "object"
            ? item.cuotaActualizada
            : item;
        if (obj?.id) map.set(obj.id, obj);
      });
      if (map.size === 0) return prevList;
      return prevList.map((c) => {
        const upd = map.get(c.id);
        return upd ? { ...c, ...upd } : c;
      });
    });
  }, []);

  const handleRefreshHistorialRecordatorios = useCallback(() => {
    dispatch(fetchHistorialRecordatorios());
  }, [dispatch]);

  const handleRefreshHistorialPagos = useCallback(() => {
    dispatch(fetchHistorialPagos(buildHistorialParams({ force: true })));
  }, [dispatch, buildHistorialParams]);

  const buildExportParams = useCallback(() => {
    const base = {
      oficina: hpOficina === "ALL" ? undefined : hpOficina,
      q: hpQApplied || undefined,
      ordering: hpOrdering || "-fecha_pago",
    };
    if (hpModo === "DIA") return { ...base, dia: hpDia };
    if (hpModo === "RANGO") return { ...base, desde: hpDesde || undefined, hasta: hpHasta || undefined };
    return { ...base, mes: hpMes };
  }, [hpModo, hpOficina, hpQApplied, hpMes, hpDia, hpDesde, hpHasta, hpOrdering]);

  const handleDownloadCSV = useCallback(async () => {
    try {
      await dispatch(downloadHistorialPagosCSV(buildExportParams())).unwrap();
    } catch (e) {
      console.error("[PagosPage] Error descargando CSV:", e);
    }
  }, [dispatch, buildExportParams]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      await dispatch(downloadHistorialPagosPDF(buildExportParams())).unwrap();
    } catch (e) {
      console.error("[PagosPage] Error descargando PDF:", e);
    }
  }, [dispatch, buildExportParams]);

  const handleEnviarRecordatorios = useCallback(
    async (medioCobroId, oficina) => {
      setSendingRecordatorios(true);
      try {
        const medio = mediosCobro.find((m) => m.id === medioCobroId) || null;
        const alias = medio ? medio.etiqueta || medio.valor : undefined;
        const result = await dispatch(
          enviarRecordatoriosCuotas({
            medio_cobro_id: medioCobroId || undefined,
            alias,
            oficina,
            async: true,
          })
        ).unwrap();
        dispatch(fetchHistorialRecordatorios());
        return result;
      } catch (err) {
        console.error("[PagosPage] Error enviando recordatorios:", err);
        const data = err?.data || err?.response?.data || err?.payload || null;
        const msg =
          (typeof data === "string" && data) ||
          data?.detail ||
          data?.error ||
          err?.message ||
          "No se pudieron enviar los recordatorios.";
        const errores = Array.isArray(data?.errores) ? data.errores : Array.isArray(data) ? data : [];
        return { ok: false, error: msg, errores, raw: data || err };
      } finally {
        setSendingRecordatorios(false);
      }
    },
    [dispatch, mediosCobro]
  );

  // 🚀 Dispara envío a TODAS las oficinas activas en paralelo (backend usa threads).
  // Devuelve inmediato; el progreso se ve en el panel que hace polling al historial.
  const handleEnviarTodasOficinas = useCallback(
    async (medioCobroId) => {
      setSendingRecordatorios(true);
      try {
        const medio = mediosCobro.find((m) => m.id === medioCobroId) || null;
        const alias = medio ? medio.etiqueta || medio.valor : undefined;
        const result = await dispatch(
          enviarTodasOficinas({
            medio_cobro_id: medioCobroId || undefined,
            alias,
          })
        ).unwrap();
        // refrescar historial para que el panel arranque mostrando algo
        dispatch(fetchHistorialRecordatorios());
        return result;
      } catch (err) {
        console.error("[PagosPage] Error enviando a todas las oficinas:", err);
        const data = err?.data || err?.response?.data || err?.payload || null;
        const msg =
          (typeof data === "string" && data) ||
          data?.detail ||
          data?.error ||
          err?.message ||
          "No se pudo iniciar el envío a todas las oficinas.";
        return { ok: false, error: msg, raw: data || err };
      } finally {
        setSendingRecordatorios(false);
      }
    },
    [dispatch, mediosCobro]
  );

  const { totalCuotas, alDia, porVencer, venceHoy, vencidas } = useMemo(() => {
    const hoy = dayjs().startOf("day");
    const stats = { totalCuotas: 0, alDia: 0, porVencer: 0, venceHoy: 0, vencidas: 0 };
    (cuotas || []).forEach((c) => {
      stats.totalCuotas += 1;
      if (c.pagado) {
        stats.alDia += 1;
        return;
      }
      if (!c.fecha_vencimiento) {
        stats.porVencer += 1;
        return;
      }
      const fv = dayjs(c.fecha_vencimiento).startOf("day");
      if (!fv.isValid()) return;
      if (fv.isBefore(hoy)) stats.vencidas += 1;
      else if (fv.isSame(hoy)) stats.venceHoy += 1;
      else stats.porVencer += 1;
    });
    return stats;
  }, [cuotas]);

  const kpis = useMemo(
    () => [
      { label: "Cuotas", value: totalCuotas, icon: HiBadgeCheck, hint: "Total cuotas" },
      { label: "Al día", value: alDia, icon: HiSparkles, hint: "Pagadas" },
      { label: "Por vencer", value: porVencer, icon: HiClock, hint: "Próximas" },
      { label: "Vence hoy", value: venceHoy, icon: HiSearch, hint: "Hoy" },
      { label: "Vencidas", value: vencidas, icon: HiX, hint: "Atrasadas" },
    ],
    [totalCuotas, alDia, porVencer, venceHoy, vencidas]
  );

  const hpKpis = useMemo(() => {
    const items = Array.isArray(historialPagosItems) ? historialPagosItems : [];
    let total = 0;
    let count = 0;
    items.forEach((it) => {
      count += 1;
      const n = extractHpMonto(it);
      if (Number.isFinite(n)) total += n;
    });
    return { count, total };
  }, [historialPagosItems]);

  const totalPagesHistorial = useMemo(() => {
    const count = Number(historialPagosMeta?.count || 0) || 0;
    const ps = Number(hpPageSize || 25) || 25;
    return Math.max(1, Math.ceil(count / ps));
  }, [historialPagosMeta, hpPageSize]);

  useEffect(() => {
    if (tab !== "historial_pagos") return;
    setHpPage((p) => {
      const n = Number(p || 1) || 1;
      const max = Number(totalPagesHistorial || 1) || 1;
      if (n < 1) return 1;
      if (n > max) return max;
      return n;
    });
  }, [tab, totalPagesHistorial]);

  const clienteGroups = useMemo(() => computeClienteGroups(cuotas), [cuotas]);
  const visibleCuotasEnModal = useMemo(() => {
    if (!clienteSeleccionado) return [];
    const key = clienteSeleccionado?.key;
    return (Array.isArray(cuotas) ? cuotas : []).filter((c) => clienteKeyFromCuota(c) === key);
  }, [cuotas, clienteSeleccionado]);

  const abrirCliente = useCallback((g) => setClienteSeleccionado(g), []);
  const cerrarClienteModal = useCallback(() => setClienteSeleccionado(null), []);

  const setModo = useCallback((m) => {
    setHpModo(m);
    setHpPage(1);
  }, []);

  const onChangeOficina = useCallback((e) => {
    setHpOficina(String(e.target.value || "ALL"));
    setHpPage(1);
  }, []);

  const onChangeOrdering = useCallback((e) => {
    setHpOrdering(String(e.target.value || "-fecha_pago"));
    setHpPage(1);
  }, []);

  const onPrevPage = useCallback(() => {
    setHpPage((p) => Math.max(1, (Number(p) || 1) - 1));
  }, []);
  const onNextPage = useCallback(() => {
    setHpPage((p) => Math.min(totalPagesHistorial, (Number(p) || 1) + 1));
  }, [totalPagesHistorial]);

  const historialItems = Array.isArray(historialPagosItems) ? historialPagosItems : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-10 2xl:px-12 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <span>Pagos y recordatorios</span>
              <span className="inline-flex items-center rounded-full bg-primary-500/10 text-primary-300 text-xs px-2 py-0.5 border border-primary-500/30">
                <HiSparkles className="mr-1" />
                <span>Panel operativo</span>
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-1">
              Administrá cuotas, medios de cobro y envíos de recordatorios desde un solo lugar.
              {!isWebAdmin && <span className="text-emerald-400 ml-2 font-bold tracking-widest text-xs uppercase">({user?.perfil?.oficina_nombre || "Tu Sucursal"})</span>}
            </p>
          </div>
          
          {/* 🚀 ESCUDO ADMIN: Solo vos ves estos botones */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {isWebAdmin && (
              <>
                <motion.button
                  type="button"
                  onClick={() => setShowCuentasModal(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex flex-1 justify-center sm:flex-none items-center gap-2 rounded-2xl bg-slate-800/70 border border-slate-700 px-3 py-2 h-10 sm:h-11 text-xs sm:text-sm text-slate-200 shadow-sm hover:bg-slate-700/80 cursor-pointer"
                >
                  <HiCog className="text-base sm:text-lg" />
                  <span>Medios de cobro</span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => setShowRecordatoriosModal(true)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex flex-1 justify-center sm:flex-none items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 h-10 sm:h-11 text-xs sm:text-sm font-semibold text-slate-900 shadow-[0_0_32px_rgba(37,211,102,0.9)] cursor-pointer border border-emerald-200/80"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <HiSpeakerphone className="text-base sm:text-lg" />
                  <span>{sendingRecordatorios ? "Enviando..." : "Recordatorios"}</span>
                </motion.button>

                {/* 🚀 BOTÓN NUEVO DE MÉTRICAS */}
                <motion.button
                  type="button"
                  onClick={() => setShowReporteModal(true)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex flex-1 justify-center sm:flex-none items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 h-10 sm:h-11 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] cursor-pointer border border-sky-500/50 bg-sky-600 hover:bg-sky-500 transition-colors"
                >
                  <HiChartBar className="text-base sm:text-lg" />
                  <span className="hidden sm:inline">Efectividad</span>
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* 🚀 TABS MOBILE-FRIENDLY */}
        <div className="mb-3 sm:mb-4 overflow-hidden">
          <div className="flex flex-wrap sm:inline-flex p-1 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-[0_0_18px_rgba(15,23,42,0.85)] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleChangeTab("pagos")}
              className={`flex-1 justify-center sm:flex-none relative inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "pagos" ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiBadgeCheck className="text-sm sm:text-base" />
              <span className="truncate">Pagos</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeTab("historial_pagos")}
              className={`flex-1 justify-center sm:flex-none relative inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "historial_pagos"
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiReceiptTax className="text-sm sm:text-base" />
              <span className="truncate">Historial</span>
            </button>
            
            {/* Solo mostramos la pestaña de alertas (historial de recordatorios) si es admin */}
            {isWebAdmin && (
              <button
                type="button"
                onClick={() => handleChangeTab("historial_recordatorios")}
                className={`flex-1 justify-center sm:flex-none relative inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                  tab === "historial_recordatorios"
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                <HiClock className="text-sm sm:text-base" />
                <span className="truncate">Alertas</span>
              </button>
            )}
          </div>
        </div>

        {tab === "pagos" && isWebAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-4">
            {kpis.map(({ label, value, icon: Icon, hint }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-between shadow-[0_0_18px_rgba(15,23,42,0.75)]"
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-[0.65rem] sm:text-xs uppercase tracking-wide text-slate-400">
                    {label}
                  </span>
                  <Icon className="text-slate-400 text-sm sm:text-base" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg sm:text-2xl font-semibold tabular-nums">{value}</span>
                  <span className="text-[0.6rem] sm:text-[0.7rem] text-slate-500">{hint}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "pagos" ? (
          <motion.div
            key="tab-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 sm:space-y-4"
          >
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 sm:p-6 space-y-3">
              <PagosSearch onBuscar={handleBuscarPolizas} />
              <button
                type="button"
                onClick={() => setOcultarPagadas((v) => !v)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    ocultarPagadas ? "bg-slate-200 border-slate-100" : "border-slate-500"
                  }`}
                >
                  {ocultarPagadas && <span className="w-2 h-2 rounded bg-slate-900" />}
                </span>
                <HiEyeOff className="w-4 h-4 opacity-70" />
                <span>Ocultar cuotas pagadas</span>
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400">
                    <HiUserGroup className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Resultados por cliente</div>
                    <div className="text-xs text-slate-400">Elegí un cliente para ver todas sus cuotas.</div>
                  </div>
                </div>
                {clienteSeleccionado && (
                  <button
                    type="button"
                    onClick={() => setClienteSeleccionado(null)}
                    className="h-9 px-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-200 hover:bg-slate-900/60 cursor-pointer text-xs"
                  >
                    Volver
                  </button>
                )}
              </div>

              {clienteGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">
                  Buscá por cliente, patente o póliza para ver resultados.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                  {clienteGroups.map((g) => {
                    const hasPend = g.pendientes > 0;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => abrirCliente(g)}
                        className={`text-left rounded-2xl border px-3 py-3 sm:px-4 sm:py-4 transition cursor-pointer ${
                          hasPend
                            ? "bg-slate-950/40 border-slate-700 hover:bg-slate-950/60"
                            : "bg-slate-950/25 border-slate-800 hover:bg-slate-950/45"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200">
                                <HiIdentification className="w-5 h-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm sm:text-base font-semibold text-slate-100 truncate flex items-center gap-2 flex-wrap">
                                  {g.label}
                                  {isWebAdmin && g.oficinasLabel && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                      {g.oficinasLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                  DNI: <span className="text-slate-200">{safe(g.dni, "—")}</span> • Cuotas:{" "}
                                  <span className="text-slate-200">{g.total}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${
                                  g.vencidas > 0
                                    ? "bg-rose-500/15 border-rose-400/30 text-rose-200"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                                }`}
                              >
                                Vencidas: <span className="ml-1">{g.vencidas}</span>
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${
                                  g.pendientes > 0
                                    ? "bg-indigo-500/15 border-indigo-400/30 text-indigo-200"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                                }`}
                              >
                                Pendientes: <span className="ml-1">{g.pendientes}</span>
                              </span>
                              <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border bg-emerald-500/10 border-emerald-400/25 text-emerald-200">
                                Cobrar: <span className="ml-1">{fmtMoney(g.totalMontoPendiente)}</span>
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300">
                            <HiChevronRightMini className="w-5 h-5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <CuotasAlertas 
              oficina={alertasOficina} 
              onOficinaChange={setAlertasOficina} 
              isWebAdmin={isWebAdmin} 
            />

            <AnimatePresence>
              {!!clienteSeleccionado && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={cerrarClienteModal} />

                  <motion.div
                    initial={{ y: 22, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 22, opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="relative z-[81] w-full h-[95dvh] sm:h-auto sm:w-[min(980px,92vw)] sm:max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-semibold text-slate-50 truncate flex items-center gap-2 flex-wrap">
                            {clienteSeleccionado?.label || "Cliente"}
                            {isWebAdmin && clienteSeleccionado?.oficinasLabel && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                🏢 {clienteSeleccionado.oficinasLabel}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs sm:text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                            <span>DNI: <span className="text-slate-200 font-semibold">{safe(clienteSeleccionado?.dni, "—")}</span></span>
                            <span>• Cuotas: <span className="text-slate-200 font-semibold">{clienteSeleccionado?.total ?? 0}</span></span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={cerrarClienteModal}
                          className="h-10 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 inline-flex items-center gap-2 cursor-pointer"
                        >
                          <HiX className="w-5 h-5" />
                          <span className="hidden sm:inline">Cerrar</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                      <PagosList
                        cuotas={visibleCuotasEnModal}
                        actualizarCuotas={handleActualizarCuotas}
                        ocultarPagadas={ocultarPagadas}
                        cuentasMercadoPago={mpCuentas}
                        billeterasVirtuales={billeteras}
                        mediosCobro={mediosCobro}
                        preferFast={true}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : tab === "historial_pagos" ? (
          <motion.div
            key="tab-historial-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 sm:space-y-4"
          >
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex flex-wrap sm:flex-nowrap p-1 rounded-2xl bg-slate-950/60 border border-slate-800 w-full sm:w-auto">
                    <button onClick={() => setModo("MES")} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm cursor-pointer ${hpModo === "MES" ? "bg-slate-800 text-slate-50" : "text-slate-400"}`}>Mes</button>
                    <button onClick={() => setModo("DIA")} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm cursor-pointer ${hpModo === "DIA" ? "bg-slate-800 text-slate-50" : "text-slate-400"}`}>Día</button>
                    <button onClick={() => setModo("RANGO")} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm cursor-pointer ${hpModo === "RANGO" ? "bg-slate-800 text-slate-50" : "text-slate-400"}`}>Rango</button>
                  </div>
                  <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                    <button onClick={handleRefreshHistorialPagos} className="flex-1 sm:flex-none justify-center h-10 px-3 rounded-2xl border text-xs sm:text-sm inline-flex items-center gap-2 bg-slate-950/60 border-slate-800 text-slate-200">
                      <HiRefresh className="w-4 h-4" /> <span className="sm:inline">Actualizar</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                  <div className="lg:col-span-4">
                    {hpModo === "MES" ? (
                      <select value={hpMes} onChange={(e) => { setHpMes(e.target.value); setHpPage(1); }} className="w-full h-10 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm">
                        {mesesOptions.map((ym) => <option key={ym} value={ym}>{monthLabel(ym)}</option>)}
                      </select>
                    ) : hpModo === "DIA" ? (
                      <input type="date" value={hpDia} onChange={(e) => { setHpDia(e.target.value); setHpPage(1); }} className="w-full h-10 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={hpDesde} onChange={(e) => { setHpDesde(e.target.value); setHpPage(1); }} className="w-full h-10 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm" />
                        <input type="date" value={hpHasta} onChange={(e) => { setHpHasta(e.target.value); setHpPage(1); }} className="w-full h-10 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm" />
                      </div>
                    )}
                  </div>
                  {isWebAdmin ? (
                    <div className="lg:col-span-2">
                      <select value={hpOficina} onChange={onChangeOficina} className="w-full h-10 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm">
                        {OFICINAS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  ) : <div className="hidden lg:block lg:col-span-2"></div>}
                  <div className="lg:col-span-6">
                    <div className="relative">
                      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input value={hpQInput} onChange={(e) => setHpQInput(e.target.value)} placeholder="Buscar (DNI, patente...)" className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-slate-100">Pagos</div>
                <div className="text-xs text-slate-400">Mostrando {historialItems.length} de {historialPagosMeta?.count || 0}</div>
              </div>
              {historialItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">
                  No hay pagos para esos filtros.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {historialItems.map((it, idx) => {
                    const c = extractHpCliente(it);
                    const monto = extractHpMonto(it);
                    return (
                      <div key={`hp-${idx}`} className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-100 truncate">{c.label}</div>
                            <div className="text-xs text-slate-400">DNI: {safe(c.dni)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-emerald-200 tabular-nums">${monto}</div>
                            <div className="text-[10px] text-slate-500">{fmtRegistro(it)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex justify-between gap-2">
                <button onClick={onPrevPage} disabled={hpPage <= 1} className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-sm">Anterior</button>
                <button onClick={onNextPage} disabled={hpPage >= totalPagesHistorial} className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-sm">Siguiente</button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="tab-alertas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4">
            <HistorialRecordatorios items={historialRecordatorios} loading={loadingHistorialRecordatorios} onRefresh={handleRefreshHistorialRecordatorios} />
          </motion.div>
        )}
      </div>

      <CuentasCobroModal open={showCuentasModal} onClose={() => setShowCuentasModal(false)} mpCuentas={mpCuentas} billeteras={billeteras} mediosCobro={mediosCobro} />
      <RecordatoriosCuotasModal isOpen={showRecordatoriosModal} onClose={() => setShowRecordatoriosModal(false)} mediosCobro={mediosCobro} sending={sendingRecordatorios} onEnviar={handleEnviarRecordatorios} onEnviarTodas={handleEnviarTodasOficinas} isWebAdmin={isWebAdmin} userOficina={userOficina} />
      
      {/* 🚀 MODAL NUEVO */}
      <ReporteEfectividadModal isOpen={showReporteModal} onClose={() => setShowReporteModal(false)} />
    </div>
  );
};

export default PagosPage;