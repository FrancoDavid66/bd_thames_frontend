/* src/pages/PagosPage.jsx — Panel Pagos + Recordatorios (integrado con slice pagos)
   ✅ Flujo: Buscar → Lista de clientes → Modal con cuotas del cliente → Pagar
   ✅ OPT: usa solo campos necesarios (asume payload /pagos/buscar/ con CuotaFlatSerializer)
   ✅ FIX: conservar pago_registrado_en + pago_hm + pago_hm_full para reimprimir post-refresh
   ✅ NUEVO: Historial de pagos completo (filtros + lista + paginación + export CSV/PDF)
*/

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
} from "react-icons/hi";

import PagosSearch from "../components/pagos/PagosSearch";
import PagosList from "../components/pagos/PagosList";
import CuotasAlertas from "../components/pagos/CuotasAlertas";
import CuentasCobroModal from "../components/pagos/CuentasCobroModal";
import RecordatoriosCuotasModal from "../components/pagos/RecordatoriosCuotasModal";
import HistorialRecordatorios from "../components/pagos/HistorialRecordatorios";

import {
  fetchMediosCobro,
  enviarRecordatoriosCuotas,
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

/* ===================== FIX: mantener timestamps para reimpresión ===================== */
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

  // ✅ NUEVO: estos 3 son los que necesitás para que post-refresh siga figurando hora/minuto
  const pago_registrado_en = it?.pago_registrado_en ?? null;
  const pago_hm = String(it?.pago_hm ?? "").trim(); // HH:MM (si backend lo manda)
  const pago_hm_full = String(it?.pago_hm_full ?? "").trim(); // DD/MM/YYYY HH:MM (si backend lo manda)

  return {
    id: it?.id ?? null,
    cuota_nro: it?.cuota_nro ?? null,
    monto: it?.monto ?? null,
    pagado: Boolean(it?.pagado),
    fecha_vencimiento: it?.fecha_vencimiento ?? null,
    fecha_pago: it?.fecha_pago ?? null,
    forma_pago: String(it?.forma_pago ?? "").trim(),

    // ✅ FIX: timestamp real del pago (persiste para PDF)
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

  const nom = `${String(cli?.apellido ?? "").trim()} ${String(cli?.nombre ?? "").trim()}`
    .trim()
    .toLowerCase();
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
        key,
        label,
        dni,
        cuotas: [],
        polizasSet: new Set(),
        polizasLabels: new Map(),
        total: 0,
        pagadas: 0,
        pendientes: 0,
        vencidas: 0,
        venceHoy: 0,
        porVencer: 0,
        totalMontoPendiente: 0,
        proximoVto: null,
      };

    hit.cuotas.push(c);
    hit.total += 1;

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
    proximoVtoStr: g.proximoVto ? g.proximoVto.format("DD/MM/YYYY") : "—",
  }));
}

/* ===================== helpers historial pagos (UI) ===================== */
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

  const apellido =
    String(cli?.apellido ?? pol?.cliente_apellido ?? it?.cliente_apellido ?? "").trim();
  const nombre =
    String(cli?.nombre ?? pol?.cliente_nombre ?? it?.cliente_nombre ?? "").trim();

  const asegurado =
    String(
      pol?.cliente_nombre_apellido ??
        pol?.cliente_nombre_completo ??
        it?.cliente_nombre_apellido ??
        it?.cliente_nombre_completo ??
        pol?.asegurado_nombre ??
        pol?.asegurado ??
        it?.asegurado ??
        ""
    ).trim();

  const full = `${apellido} ${nombre}`.trim();
  const label = full || asegurado || "Cliente";

  const dni =
    String(
      cli?.dni_cuit_cuil ??
        pol?.cliente_dni ??
        it?.cliente_dni ??
        it?.dni ??
        it?.dni_cuit_cuil ??
        ""
    ).trim();

  const tel =
    String(cli?.telefono ?? pol?.cliente_telefono ?? it?.cliente_telefono ?? it?.telefono ?? "").trim();

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

  const titulo = [
    patente || null,
    numero ? `N° ${numero}` : null,
    compania || null,
  ]
    .filter(Boolean)
    .join(" • ");

  const subtitulo = [marca || null, modelo || null].filter(Boolean).join(" ");

  return { polizaId, patente, numero, compania, oficina, titulo: titulo || "Póliza", subtitulo };
}

function extractHpCuota(it) {
  const cuotaNro = it?.cuota_nro ?? it?.nro ?? it?.numero ?? null;
  const cuotaLabel = String(it?.cuota_label ?? it?.label ?? "").trim();
  const vto = it?.fecha_vencimiento ?? it?.vencimiento ?? null;
  const fpago = it?.fecha_pago ?? it?.pago_fecha ?? null;
  const forma = String(it?.forma_pago ?? it?.metodo ?? it?.medio ?? it?.medio_pago ?? "").trim();

  return {
    cuotaNro,
    cuotaLabel,
    vto,
    fpago,
    forma,
  };
}

/* ================== PAGE ================== */
const PagosPage = () => {
  const dispatch = useDispatch();

  const [tab, setTab] = useState("pagos");

  const [showCuentasModal, setShowCuentasModal] = useState(false);
  const [showRecordatoriosModal, setShowRecordatoriosModal] = useState(false);

  const [cuotas, setCuotas] = useState([]);
  const [ocultarPagadas, setOcultarPagadas] = useState(false);

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [lastBuscarQuery, setLastBuscarQuery] = useState("");
  const [lastBuscarMeta, setLastBuscarMeta] = useState({ count: 0, next: null, previous: null });

  const [alertasOficina, setAlertasOficina] = useState("ALL");
  const [sendingRecordatorios, setSendingRecordatorios] = useState(false);

  const [hpModo, setHpModo] = useState("MES");
  const [hpMes, setHpMes] = useState(monthKey(new Date()));
  const [hpDia, setHpDia] = useState(ymd(new Date()));
  const [hpDesde, setHpDesde] = useState(ymd(dayjs().startOf("month")));
  const [hpHasta, setHpHasta] = useState(ymd(new Date()));
  const [hpOficina, setHpOficina] = useState("ALL");
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

  // clamp página cuando cambia count/filtros
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

  // handlers filtros historial
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
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => setShowCuentasModal(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-200 shadow-sm hover:bg-slate-700/80 cursor-pointer"
            >
              <HiCog className="text-base sm:text-lg" />
              <span>Medios de cobro</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setShowRecordatoriosModal(true)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-[0_0_32px_rgba(37,211,102,0.9)] cursor-pointer border border-emerald-200/80"
              style={{ backgroundColor: "#25D366" }}
            >
              <HiSpeakerphone className="text-base sm:text-lg" />
              <span>{sendingRecordatorios ? "Enviando..." : "Enviar recordatorios"}</span>
            </motion.button>
          </div>
        </div>

        {tab === "pagos" && (
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

        <div className="mb-3 sm:mb-4">
          <div className="inline-flex p-1 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-[0_0_18px_rgba(15,23,42,0.85)]">
            <button
              type="button"
              onClick={() => handleChangeTab("pagos")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "pagos" ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiBadgeCheck className="text-sm sm:text-base" />
              <span>Pagos y cuotas</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeTab("historial_pagos")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "historial_pagos"
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiReceiptTax className="text-sm sm:text-base" />
              <span>Historial de pagos</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeTab("historial_recordatorios")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "historial_recordatorios"
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiClock className="text-sm sm:text-base" />
              <span>Historial recordatorios</span>
            </button>
          </div>
        </div>

        {tab === "pagos" ? (
          <motion.div
            key="tab-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 sm:space-y-4"
          >
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4 space-y-3">
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
              {!!lastBuscarQuery && (
                <div className="text-xs text-slate-500">
                  Última búsqueda:{" "}
                  <span className="text-slate-300 font-semibold">{lastBuscarQuery}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-200">
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
                                <div className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                                  {g.label}
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

            <CuotasAlertas oficina={alertasOficina} onOficinaChange={setAlertasOficina} />

            {/* ✅ MODAL CLIENTE CORREGIDO (max-h, flex-col, overflow-auto adentro) */}
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
                    className="relative z-[81] w-full sm:w-[min(980px,92vw)] max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                  >
                    {/* Header estático, no se achica (shrink-0) */}
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-semibold text-slate-50 truncate">
                            {clienteSeleccionado?.label || "Cliente"}
                          </div>
                          <div className="mt-1 text-xs sm:text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                            <span>
                              DNI:{" "}
                              <span className="text-slate-200 font-semibold">
                                {safe(clienteSeleccionado?.dni, "—")}
                              </span>
                            </span>
                            <span>
                              • Cuotas:{" "}
                              <span className="text-slate-200 font-semibold">
                                {clienteSeleccionado?.total ?? 0}
                              </span>
                            </span>
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

                    {/* ✅ Área del scroll que vive SOLAMENTE adentro del modal */}
                    <div className="p-0 flex-1 overflow-y-auto">
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
            {/* ✅ KPIs Historial */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-3 sm:px-4 shadow-[0_0_18px_rgba(15,23,42,0.75)]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] sm:text-xs uppercase tracking-wide text-slate-400">Registros</span>
                  <HiReceiptTax className="text-slate-400 text-sm sm:text-base" />
                </div>
                <div className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums">{hpKpis.count}</div>
                <div className="text-[0.7rem] text-slate-500">Página actual</div>
              </div>
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-3 sm:px-4 shadow-[0_0_18px_rgba(15,23,42,0.75)]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] sm:text-xs uppercase tracking-wide text-slate-400">Total</span>
                  <HiSparkles className="text-slate-400 text-sm sm:text-base" />
                </div>
                <div className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums">{fmtMoney(hpKpis.total)}</div>
                <div className="text-[0.7rem] text-slate-500">Suma página</div>
              </div>
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-3 sm:px-4 shadow-[0_0_18px_rgba(15,23,42,0.75)]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] sm:text-xs uppercase tracking-wide text-slate-400">Total backend</span>
                  <HiUserGroup className="text-slate-400 text-sm sm:text-base" />
                </div>
                <div className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums">
                  {Number(historialPagosMeta?.count || 0) || 0}
                </div>
                <div className="text-[0.7rem] text-slate-500">Count</div>
              </div>
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-3 sm:px-4 shadow-[0_0_18px_rgba(15,23,42,0.75)]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] sm:text-xs uppercase tracking-wide text-slate-400">Página</span>
                  <HiChevronRight className="text-slate-400 text-sm sm:text-base" />
                </div>
                <div className="mt-1 text-lg sm:text-2xl font-semibold tabular-nums">
                  {hpPage} / {totalPagesHistorial}
                </div>
                <div className="text-[0.7rem] text-slate-500">Navegación</div>
              </div>
            </div>

            {/* ✅ Filtros Historial */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex flex-col gap-3">
                {/* modo */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex p-1 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setModo("MES")}
                      className={`px-3 py-1.5 rounded-2xl text-xs sm:text-sm cursor-pointer ${
                        hpModo === "MES" ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:text-slate-100"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <HiCalendar className="w-4 h-4" /> Mes
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModo("DIA")}
                      className={`px-3 py-1.5 rounded-2xl text-xs sm:text-sm cursor-pointer ${
                        hpModo === "DIA" ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:text-slate-100"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <HiClock className="w-4 h-4" /> Día
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModo("RANGO")}
                      className={`px-3 py-1.5 rounded-2xl text-xs sm:text-sm cursor-pointer ${
                        hpModo === "RANGO"
                          ? "bg-slate-800 text-slate-50"
                          : "text-slate-400 hover:text-slate-100"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <HiSearch className="w-4 h-4" /> Rango
                      </span>
                    </button>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRefreshHistorialPagos}
                      disabled={loadingHistorialPagos}
                      className={`h-10 px-3 rounded-2xl border text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer ${
                        loadingHistorialPagos
                          ? "bg-slate-950/30 border-slate-800 text-slate-500 cursor-not-allowed"
                          : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/60"
                      }`}
                      title="Actualizar"
                    >
                      <HiRefresh className="w-4 h-4" />
                      <span className="hidden sm:inline">{loadingHistorialPagos ? "Cargando..." : "Actualizar"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadCSV}
                      disabled={downloadingCSV}
                      className={`h-10 px-3 rounded-2xl border text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer ${
                        downloadingCSV
                          ? "bg-slate-950/30 border-slate-800 text-slate-500 cursor-not-allowed"
                          : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/60"
                      }`}
                      title="Descargar CSV"
                    >
                      <HiDownload className="w-4 h-4" />
                      <span className="hidden sm:inline">{downloadingCSV ? "CSV..." : "CSV"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      disabled={downloadingPDF}
                      className={`h-10 px-3 rounded-2xl border text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer ${
                        downloadingPDF
                          ? "bg-slate-950/30 border-slate-800 text-slate-500 cursor-not-allowed"
                          : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/60"
                      }`}
                      title="Descargar PDF"
                    >
                      <HiDownload className="w-4 h-4" />
                      <span className="hidden sm:inline">{downloadingPDF ? "PDF..." : "PDF"}</span>
                    </button>
                  </div>
                </div>

                {/* selector fecha (según modo) + oficina + ordering + search */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                  {/* fecha */}
                  <div className="lg:col-span-4">
                    {hpModo === "MES" ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={hpMes}
                          onChange={(e) => {
                            setHpMes(String(e.target.value || monthKey(new Date())));
                            setHpPage(1);
                          }}
                          className="w-full h-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm outline-none"
                        >
                          {mesesOptions.map((ym) => (
                            <option key={ym} value={ym}>
                              {monthLabel(ym)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : hpModo === "DIA" ? (
                      <input
                        type="date"
                        value={hpDia}
                        onChange={(e) => {
                          setHpDia(String(e.target.value || ymd(new Date())));
                          setHpPage(1);
                        }}
                        className="w-full h-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm outline-none"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={hpDesde}
                          onChange={(e) => {
                            setHpDesde(String(e.target.value || ""));
                            setHpPage(1);
                          }}
                          className="w-full h-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm outline-none"
                        />
                        <input
                          type="date"
                          value={hpHasta}
                          onChange={(e) => {
                            setHpHasta(String(e.target.value || ""));
                            setHpPage(1);
                          }}
                          className="w-full h-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* oficina */}
                  <div className="lg:col-span-2">
                    <select
                      value={hpOficina}
                      onChange={onChangeOficina}
                      className="w-full h-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm outline-none"
                    >
                      {OFICINAS_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ordering */}
                  <div className="lg:col-span-3">
                    <select
                      value={hpOrdering}
                      onChange={onChangeOrdering}
                      className="w-full h-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm outline-none"
                    >
                      <option value="-fecha_pago">Más nuevos</option>
                      <option value="fecha_pago">Más viejos</option>
                      <option value="-monto">Mayor monto</option>
                      <option value="monto">Menor monto</option>
                    </select>
                  </div>

                  {/* search */}
                  <div className="lg:col-span-3">
                    <div className="relative">
                      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        value={hpQInput}
                        onChange={(e) => setHpQInput(e.target.value)}
                        placeholder="Buscar (DNI, nombre, patente, póliza...)"
                        className="w-full h-10 pl-10 pr-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm outline-none"
                      />
                      {!!hpQInput && (
                        <button
                          type="button"
                          onClick={() => setHpQInput("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-900/60 text-slate-200 inline-flex items-center justify-center cursor-pointer"
                          title="Limpiar"
                        >
                          <HiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* hint */}
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                  <span>
                    Filtro activo:{" "}
                    <span className="text-slate-200 font-semibold">
                      {hpModo === "MES"
                        ? `Mes ${hpMes}`
                        : hpModo === "DIA"
                        ? `Día ${hpDia}`
                        : `Rango ${hpDesde || "—"} → ${hpHasta || "—"}`}
                    </span>
                  </span>
                  <span>•</span>
                  <span>
                    Oficina:{" "}
                    <span className="text-slate-200 font-semibold">
                      {(OFICINAS_OPTS.find((x) => x.value === hpOficina) || OFICINAS_OPTS[0]).label}
                    </span>
                  </span>
                  {!!hpQApplied && (
                    <>
                      <span>•</span>
                      <span>
                        Búsqueda: <span className="text-slate-200 font-semibold">{hpQApplied}</span>
                      </span>
                    </>
                  )}
                  {isPending && <span className="text-slate-400">• Aplicando búsqueda…</span>}
                </div>

                {/* errores descarga */}
                {(historialPagosDownloadError || historialPagosDownloadPdfError) && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {String(historialPagosDownloadError || historialPagosDownloadPdfError)}
                  </div>
                )}
              </div>
            </div>

            {/* ✅ Lista Historial */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-slate-100">Pagos</div>
                <div className="text-xs text-slate-400">
                  Mostrando <span className="text-slate-200 font-semibold">{historialItems.length}</span> de{" "}
                  <span className="text-slate-200 font-semibold">{Number(historialPagosMeta?.count || 0) || 0}</span>
                </div>
              </div>

              {loadingHistorialPagos && historialItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">
                  Cargando historial…
                </div>
              ) : historialPagosError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {typeof historialPagosError === "string"
                    ? historialPagosError
                    : historialPagosError?.detail || "Error cargando historial."}
                </div>
              ) : historialItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">
                  No hay pagos para esos filtros.
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="grid grid-cols-1 gap-2 sm:hidden">
                    {historialItems.map((it, idx) => {
                      const c = extractHpCliente(it);
                      const p = extractHpPoliza(it);
                      const q = extractHpCuota(it);
                      const monto = extractHpMonto(it);
                      const fecha = fmtRegistro(it);
                      const oficina = p.oficina || it?.oficina || "—";

                      return (
                        <div
                          key={it?.id ?? `hp-${idx}`}
                          className="rounded-2xl bg-slate-950/40 border border-slate-800 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-100 truncate">{c.label}</div>
                              <div className="text-xs text-slate-400 truncate">
                                DNI: <span className="text-slate-200">{safe(c.dni)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-emerald-200 tabular-nums">
                                {monto === null ? "—" : fmtMoney(monto)}
                              </div>
                              <div className="text-[0.7rem] text-slate-500">{fecha}</div>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-slate-300">
                            <div className="truncate">
                              <span className="text-slate-500">Póliza:</span>{" "}
                              <span className="text-slate-100 font-semibold">{p.titulo}</span>
                            </div>
                            {!!p.subtitulo && <div className="truncate text-slate-400">{p.subtitulo}</div>}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full px-3 h-7 text-[0.7rem] font-semibold border bg-slate-900 border-slate-800 text-slate-200">
                              Oficina: <span className="ml-1">{safe(oficina)}</span>
                            </span>
                            <span className="inline-flex items-center rounded-full px-3 h-7 text-[0.7rem] font-semibold border bg-indigo-500/15 border-indigo-400/25 text-indigo-200">
                              {q.cuotaLabel || (q.cuotaNro ? `Cuota ${q.cuotaNro}` : "Cuota")}
                            </span>
                            {!!q.forma && (
                              <span className="inline-flex items-center rounded-full px-3 h-7 text-[0.7rem] font-semibold border bg-slate-900 border-slate-800 text-slate-200">
                                {q.forma}
                              </span>
                            )}
                          </div>

                          {!!it?.observaciones && (
                            <div className="mt-2 text-xs text-slate-400 line-clamp-2">
                              <span className="text-slate-500">Obs:</span> {String(it.observaciones)}
                            </div>
                          )}

                          {!!p.polizaId && (
                            <div className="mt-3">
                              <a
                                href={`/polizas/${p.polizaId}`}
                                className="inline-flex items-center gap-2 text-xs text-slate-200 hover:text-slate-50"
                              >
                                Ver póliza <HiChevronRightMini className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400">
                          <th className="py-2 pr-3">Fecha</th>
                          <th className="py-2 pr-3">Cliente</th>
                          <th className="py-2 pr-3">DNI</th>
                          <th className="py-2 pr-3">Póliza</th>
                          <th className="py-2 pr-3">Oficina</th>
                          <th className="py-2 pr-3">Cuota</th>
                          <th className="py-2 pr-3">Medio</th>
                          <th className="py-2 pr-0 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialItems.map((it, idx) => {
                          const c = extractHpCliente(it);
                          const p = extractHpPoliza(it);
                          const q = extractHpCuota(it);
                          const monto = extractHpMonto(it);
                          const fecha = fmtRegistro(it);
                          const oficina = p.oficina || it?.oficina || "—";

                          return (
                            <tr key={it?.id ?? `hp-row-${idx}`} className="border-t border-slate-800/70">
                              <td className="py-2 pr-3 text-slate-200 whitespace-nowrap">{fecha}</td>
                              <td className="py-2 pr-3 text-slate-100">
                                <div className="max-w-[260px] truncate font-semibold">{c.label}</div>
                              </td>
                              <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{safe(c.dni)}</td>
                              <td className="py-2 pr-3 text-slate-200">
                                {p.polizaId ? (
                                  <a
                                    href={`/polizas/${p.polizaId}`}
                                    className="hover:text-slate-50 underline underline-offset-4 decoration-slate-700"
                                    title="Ver póliza"
                                  >
                                    {p.titulo}
                                  </a>
                                ) : (
                                  <span>{p.titulo}</span>
                                )}
                              </td>
                              <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{safe(oficina)}</td>
                              <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">
                                {q.cuotaLabel || (q.cuotaNro ? `Cuota ${q.cuotaNro}` : "—")}
                              </td>
                              <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{safe(q.forma)}</td>
                              <td className="py-2 pr-0 text-right text-emerald-200 font-semibold tabular-nums whitespace-nowrap">
                                {monto === null ? "—" : fmtMoney(monto)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-xs text-slate-500">
                      Página <span className="text-slate-200 font-semibold">{hpPage}</span> de{" "}
                      <span className="text-slate-200 font-semibold">{totalPagesHistorial}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onPrevPage}
                        disabled={hpPage <= 1}
                        className={`h-10 px-3 rounded-2xl border text-xs sm:text-sm inline-flex items-center gap-2 ${
                          hpPage <= 1
                            ? "bg-slate-950/30 border-slate-800 text-slate-600 cursor-not-allowed"
                            : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/60 cursor-pointer"
                        }`}
                      >
                        <HiChevronLeft className="w-4 h-4" />
                        Anterior
                      </button>

                      <button
                        type="button"
                        onClick={onNextPage}
                        disabled={hpPage >= totalPagesHistorial}
                        className={`h-10 px-3 rounded-2xl border text-xs sm:text-sm inline-flex items-center gap-2 ${
                          hpPage >= totalPagesHistorial
                            ? "bg-slate-950/30 border-slate-800 text-slate-600 cursor-not-allowed"
                            : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/60 cursor-pointer"
                        }`}
                      >
                        Siguiente
                        <HiChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tab-historial-recordatorios"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4"
          >
            <HistorialRecordatorios
              items={historialRecordatorios}
              loading={loadingHistorialRecordatorios}
              onRefresh={handleRefreshHistorialRecordatorios}
            />
          </motion.div>
        )}
      </div>

      <CuentasCobroModal
        open={showCuentasModal}
        onClose={() => setShowCuentasModal(false)}
        mpCuentas={mpCuentas}
        billeteras={billeteras}
        mediosCobro={mediosCobro}
      />
      <RecordatoriosCuotasModal
        isOpen={showRecordatoriosModal}
        onClose={() => setShowRecordatoriosModal(false)}
        mediosCobro={mediosCobro}
        sending={sendingRecordatorios}
        onEnviar={handleEnviarRecordatorios}
      />
    </div>
  );
};

export default PagosPage;