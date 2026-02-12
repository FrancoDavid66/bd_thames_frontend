/* src/pages/PagosPage.jsx — Panel Pagos + Recordatorios (integrado con slice pagos)
   ✅ Nuevo flujo: Buscar → Lista de clientes → Modal con todas las cuotas del cliente → Pagar
*/

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
  useTransition,
} from "react";
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

// ---------- helpers UI
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

// ✅ helpers historial pagos: timestamp real
function pickRegistroTs(it) {
  const v = it?.pago_registrado_en ?? it?.registrado_en ?? it?.pago_ts ?? null;
  if (v) return v;

  const f = it?.fecha_guardado_pago || "";
  const h = it?.hora_guardado_pago || it?.pago_hora || "";
  if (f && h) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(f).trim());
    if (m) {
      const iso = `${m[3]}-${m[2]}-${m[1]}T${String(h).trim()}:00`;
      return iso;
    }
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

/**
 * ✅ PRO (cuotas aplanadas):
 * Normaliza una "cuota flat" para que PagosList siga recibiendo:
 *  - cuota con campos típicos (id, cuota_nro, fecha_vencimiento, pagado, monto...)
 *  - y adentro `poliza` con datos mínimos (numero_poliza, patente, oficina, compania, cliente...)
 */
function normalizeCuotaFlat(item) {
  const it = item && typeof item === "object" ? item : {};

  const existingPoliza =
    it.poliza && typeof it.poliza === "object" ? it.poliza : {};

  const existingCliente =
    existingPoliza?.cliente && typeof existingPoliza.cliente === "object"
      ? existingPoliza.cliente
      : it?.cliente && typeof it.cliente === "object"
      ? it.cliente
      : {};

  const cliente = {
    id:
      existingCliente?.id ??
      it?.cliente_id ??
      it?.cliente?.id ??
      existingPoliza?.cliente_id ??
      null,
    apellido: String(
      existingCliente?.apellido ??
        it?.cliente_apellido ??
        it?.cliente?.apellido ??
        existingPoliza?.cliente_apellido ??
        ""
    ).trim(),
    nombre: String(
      existingCliente?.nombre ??
        it?.cliente_nombre ??
        it?.cliente?.nombre ??
        existingPoliza?.cliente_nombre ??
        ""
    ).trim(),
    dni_cuit_cuil: String(
      existingCliente?.dni_cuit_cuil ??
        it?.cliente_dni ??
        it?.cliente?.dni_cuit_cuil ??
        it?.dni ??
        existingPoliza?.cliente_dni ??
        ""
    ).trim(),
    telefono: String(
      existingCliente?.telefono ??
        it?.cliente_telefono ??
        it?.cliente?.telefono ??
        existingPoliza?.cliente_telefono ??
        ""
    ).trim(),
  };

  const cliente_nombre = cliente.nombre;
  const cliente_apellido = cliente.apellido;
  const cliente_nombre_apellido = `${cliente.apellido} ${cliente.nombre}`.trim();

  const poliza = {
    ...existingPoliza,
    id: existingPoliza?.id ?? it?.poliza_id ?? it?.poliza?.id ?? null,
    numero_poliza:
      existingPoliza?.numero_poliza ??
      it?.numero_poliza ??
      it?.poliza_numero ??
      it?.poliza?.numero_poliza ??
      "",
    patente:
      existingPoliza?.patente ??
      it?.patente ??
      it?.poliza_patente ??
      it?.poliza?.patente ??
      "",
    oficina:
      existingPoliza?.oficina ??
      it?.oficina ??
      it?.oficina_nombre ??
      it?.poliza_oficina ??
      it?.poliza?.oficina ??
      "",
    compania:
      existingPoliza?.compania ??
      it?.compania ??
      it?.compania_nombre ??
      it?.poliza_compania ??
      it?.poliza?.compania ??
      "",

    cliente: existingPoliza?.cliente || cliente,

    cliente_nombre:
      existingPoliza?.cliente_nombre || existingCliente?.nombre || cliente_nombre,
    cliente_apellido:
      existingPoliza?.cliente_apellido ||
      existingCliente?.apellido ||
      cliente_apellido,
    cliente_nombre_apellido:
      existingPoliza?.cliente_nombre_apellido ||
      existingPoliza?.cliente_nombre_completo ||
      cliente_nombre_apellido,
  };

  const monto =
    it?.monto ??
    it?.monto_cuota ??
    it?.importe ??
    it?.precio_cuota ??
    it?.monto_pagado ??
    null;

  return {
    ...it,
    id: it?.cuota_id ?? it?.id,
    cuota_nro: it?.cuota_nro ?? it?.nro ?? it?.numero ?? it?.cuota_numero,
    cantidad_cuotas:
      it?.cantidad_cuotas ??
      it?.total_cuotas ??
      it?.cuotas_total ??
      it?.poliza_cantidad_cuotas ??
      existingPoliza?.cantidad_cuotas ??
      undefined,
    fecha_vencimiento:
      it?.fecha_vencimiento ??
      it?.vencimiento ??
      it?.fecha_vto ??
      it?.vto ??
      null,
    fecha_pago: it?.fecha_pago ?? it?.pago_fecha ?? null,
    pagado: Boolean(it?.pagado ?? it?.is_pagado ?? it?.estado_pagado),
    monto,
    forma_pago:
      it?.forma_pago ?? it?.medio ?? it?.metodo ?? it?.pago_metodo ?? "",
    poliza,
  };
}

function clienteKeyFromCuota(c) {
  const pol = c?.poliza || {};
  const cli = pol?.cliente || {};
  const id = cli?.id ?? pol?.cliente_id ?? c?.cliente_id ?? null;
  if (id !== null && id !== undefined && String(id).trim() !== "") return `id:${id}`;
  const dni =
    cli?.dni_cuit_cuil ??
    pol?.cliente_dni ??
    c?.cliente_dni ??
    c?.dni ??
    "";
  const d = String(dni || "").trim();
  if (d) return `dni:${d}`;
  // fallback: nombre
  const nom =
    pol?.cliente_nombre_apellido ??
    pol?.cliente_nombre_completo ??
    `${pol?.cliente_apellido || ""} ${pol?.cliente_nombre || ""}`.trim();
  const n = String(nom || "").trim().toLowerCase();
  return n ? `nom:${n}` : "unknown";
}

function clienteLabelFromCuota(c) {
  const pol = c?.poliza || {};
  const cli = pol?.cliente || {};
  const ap = String(cli?.apellido ?? pol?.cliente_apellido ?? "").trim();
  const nom = String(cli?.nombre ?? pol?.cliente_nombre ?? "").trim();

  const full =
    String(pol?.cliente_nombre_apellido || "").trim() ||
    String(pol?.cliente_nombre_completo || "").trim() ||
    [ap, nom].filter(Boolean).join(" ").trim();

  return full || "Cliente";
}

function dniFromCuota(c) {
  const pol = c?.poliza || {};
  const cli = pol?.cliente || {};
  const dni =
    cli?.dni_cuit_cuil ??
    pol?.cliente_dni ??
    c?.cliente_dni ??
    c?.dni ??
    "";
  return String(dni || "").trim();
}

function uniquePolizaLabel(pol) {
  const p = pol && typeof pol === "object" ? pol : {};
  const nro = String(p.numero_poliza || p.numero || p.nro_poliza || "").trim();
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
    const polId = pol?.id ?? c?.poliza_id ?? null;
    const polLabel = uniquePolizaLabel(pol);

    const hit =
      map.get(key) ||
      {
        key,
        label,
        dni,
        cuotas: [],
        polizasSet: new Set(),
        polizasLabels: new Map(), // id->label
        total: 0,
        pagadas: 0,
        pendientes: 0,
        vencidas: 0,
        venceHoy: 0,
        porVencer: 0,
        totalMontoPendiente: 0,
        proximoVto: null, // dayjs
      };

    hit.cuotas.push(c);
    hit.total += 1;

    if (polId !== null && polId !== undefined) {
      hit.polizasSet.add(String(polId));
      if (!hit.polizasLabels.has(String(polId))) hit.polizasLabels.set(String(polId), polLabel);
    } else {
      // igual sumamos label (sin id)
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
        // si no hay vencimiento lo consideramos "por vencer" (no bloquea)
        hit.porVencer += 1;
      }
    }

    map.set(key, hit);
  }

  const arr = Array.from(map.values());

  // orden: primero con pendientes, más vencidas, luego por próximo vencimiento, luego nombre
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

const PagosPage = () => {
  const dispatch = useDispatch();

  // Tabs: "pagos" | "historial_pagos" | "historial_recordatorios"
  const [tab, setTab] = useState("pagos");

  // Modales
  const [showCuentasModal, setShowCuentasModal] = useState(false);
  const [showRecordatoriosModal, setShowRecordatoriosModal] = useState(false);

  // Estado local de cuotas (resultado de la búsqueda)
  const [cuotas, setCuotas] = useState([]);
  const [ocultarPagadas, setOcultarPagadas] = useState(false);

  // ✅ nuevo: selección de cliente + modal cuotas del cliente
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // { key, label, dni, cuotas... }

  // ✅ meta + query de la última búsqueda PRO
  const [lastBuscarQuery, setLastBuscarQuery] = useState("");
  const [lastBuscarMeta, setLastBuscarMeta] = useState({
    count: 0,
    next: null,
    previous: null,
  });

  // Filtro de oficina para alertas
  const [alertasOficina, setAlertasOficina] = useState("ALL");

  // Envío masivo de recordatorios
  const [sendingRecordatorios, setSendingRecordatorios] = useState(false);

  // ---- Historial Pagos (filtros locales)
  const [hpModo, setHpModo] = useState("MES"); // "MES" | "DIA" | "RANGO"
  const [hpMes, setHpMes] = useState(monthKey(new Date())); // YYYY-MM
  const [hpDia, setHpDia] = useState(ymd(new Date())); // YYYY-MM-DD
  const [hpDesde, setHpDesde] = useState(ymd(dayjs().startOf("month"))); // YYYY-MM-DD
  const [hpHasta, setHpHasta] = useState(ymd(new Date())); // YYYY-MM-DD

  const [hpOficina, setHpOficina] = useState("ALL"); // ALL | 1 | 2 | 3

  // ✅ Debounce: input vs applied
  const [hpQInput, setHpQInput] = useState("");
  const [hpQApplied, setHpQApplied] = useState("");

  const [hpPage, setHpPage] = useState(1);
  const hpPageSize = 25;

  const [hpOrdering, setHpOrdering] = useState("-fecha_pago");

  const deferredHpQInput = useDeferredValue(hpQInput);
  const [isPending, startTransition] = useTransition();

  // Estado global desde Redux (slice pagos)
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

  const loadingHistorialRecordatorios =
    historialRecordatoriosStatus === "loading";
  const loadingHistorialPagos = historialPagosStatus === "loading";
  const downloadingCSV = historialPagosDownloadStatus === "loading";
  const downloadingPDF = historialPagosDownloadPdfStatus === "loading";

  /* ================== EFFECTS ================== */

  useEffect(() => {
    dispatch(fetchMediosCobro({ activo: true }));
  }, [dispatch]);

  const mesesOptions = useMemo(() => {
    const out = [];
    const base = dayjs().startOf("month");
    for (let i = 0; i < 18; i++)
      out.push(base.subtract(i, "month").format("YYYY-MM"));
    return out;
  }, []);

  // ✅ Debounce de búsqueda (solo cuando estás en historial_pagos)
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

      if (nuevoTab === "historial_pagos") {
        setHpPage(1);
      }
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
        out = {
          ...base,
          dia: hpDia,
          mes: undefined,
          desde: undefined,
          hasta: undefined,
        };
      } else if (hpModo === "RANGO") {
        out = {
          ...base,
          desde: hpDesde || undefined,
          hasta: hpHasta || undefined,
          mes: undefined,
          dia: undefined,
        };
      } else {
        out = {
          ...base,
          mes: hpMes,
          dia: undefined,
          desde: undefined,
          hasta: undefined,
        };
      }

      if (extra && typeof extra === "object") out = { ...out, ...extra };
      return out;
    },
    [
      hpModo,
      hpOficina,
      hpQApplied,
      hpPage,
      hpPageSize,
      hpMes,
      hpDia,
      hpDesde,
      hpHasta,
      hpOrdering,
    ]
  );

  useEffect(() => {
    if (tab !== "historial_pagos") return;
    dispatch(fetchHistorialPagos(buildHistorialParams()));
  }, [dispatch, tab, buildHistorialParams]);

  /* ================== HANDLERS ================== */

  // ✅ PRO: PagosSearch devuelve CUOTAS APLANADAS + meta + query
  const handleBuscarPolizas = useCallback((cuotasFlat, meta, q) => {
    const lista = Array.isArray(cuotasFlat) ? cuotasFlat : [];
    const normalized = lista.map(normalizeCuotaFlat);

    setCuotas(normalized);
    setClienteSeleccionado(null); // ✅ volvés al listado de clientes

    if (meta && typeof meta === "object") {
      setLastBuscarMeta({
        count: Number(meta?.count || 0) || 0,
        next: meta?.next ?? null,
        previous: meta?.previous ?? null,
      });
    } else {
      setLastBuscarMeta({
        count: normalized.length,
        next: null,
        previous: null,
      });
    }

    setLastBuscarQuery(String(q || "").trim());
  }, []);

  const handleActualizarCuotas = useCallback((actualizadas = []) => {
    if (!Array.isArray(actualizadas) || actualizadas.length === 0) return;

    setCuotas((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const map = new Map();

      actualizadas.forEach((item) => {
        if (item?.cuotaActualizada?.id) {
          map.set(item.cuotaActualizada.id, {
            ...item.cuotaActualizada,
            observaciones_pago:
              item.observaciones_pago ??
              item.cuotaActualizada.observaciones_pago,
          });
        } else if (item?.id) {
          map.set(item.id, item);
        }
      });

      if (map.size === 0) return prevList;

      return prevList.map((c) => {
        const upd = map.get(c.id);
        return upd ? { ...c, ...upd } : c;
      });
    });
  }, []);

  const handleOpenCuentas = useCallback(() => setShowCuentasModal(true), []);
  const handleCloseCuentas = useCallback(() => setShowCuentasModal(false), []);

  const handleOpenRecordatorios = useCallback(
    () => setShowRecordatoriosModal(true),
    []
  );
  const handleCloseRecordatorios = useCallback(
    () => setShowRecordatoriosModal(false),
    []
  );

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
    if (hpModo === "RANGO")
      return { ...base, desde: hpDesde || undefined, hasta: hpHasta || undefined };
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

        return result;
      } catch (err) {
        console.error("[PagosPage] Error enviando recordatorios:", err);
        throw err;
      } finally {
        setSendingRecordatorios(false);
      }
    },
    [dispatch, mediosCobro]
  );

  /* ================== KPIs (tab pagos) ================== */

  const { totalCuotas, alDia, porVencer, venceHoy, vencidas } = useMemo(() => {
    const hoy = dayjs().startOf("day");
    const stats = {
      totalCuotas: 0,
      alDia: 0,
      porVencer: 0,
      venceHoy: 0,
      vencidas: 0,
    };

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

  /* ================== KPIs (tab historial pagos) ================== */

  const hpKpis = useMemo(() => {
    const items = Array.isArray(historialPagosItems) ? historialPagosItems : [];
    let total = 0;
    let count = 0;
    items.forEach((it) => {
      count += 1;
      const monto =
        it?.monto_pagado ?? it?.monto ?? it?.importe ?? it?.precio_cuota ?? null;
      const n = Number(monto);
      if (Number.isFinite(n)) total += n;
    });
    return { count, total };
  }, [historialPagosItems]);

  /* ================== NUEVO: LISTA DE CLIENTES (desde cuotas buscadas) ================== */

  const clienteGroups = useMemo(() => computeClienteGroups(cuotas), [cuotas]);

  const visibleCuotasEnModal = useMemo(() => {
    if (!clienteSeleccionado) return [];
    const key = clienteSeleccionado?.key;
    return (Array.isArray(cuotas) ? cuotas : []).filter((c) => clienteKeyFromCuota(c) === key);
  }, [cuotas, clienteSeleccionado]);

  const abrirCliente = useCallback((g) => {
    setClienteSeleccionado(g);
  }, []);

  const cerrarClienteModal = useCallback(() => setClienteSeleccionado(null), []);

  /* ================== RENDER ================== */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-10 2xl:px-12 py-4 sm:py-6">
        {/* Header */}
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
              onClick={handleOpenCuentas}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-200 shadow-sm hover:bg-slate-700/80 cursor-pointer"
            >
              <HiCog className="text-base sm:text-lg" />
              <span>Medios de cobro</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={handleOpenRecordatorios}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-[0_0_32px_rgba(37,211,102,0.9)] cursor-pointer border border-emerald-200/80"
              style={{ backgroundColor: "#25D366" }}
            >
              <HiSpeakerphone className="text-base sm:text-lg" />
              <span>
                {sendingRecordatorios ? "Enviando recordatorios..." : "Enviar recordatorios"}
              </span>
            </motion.button>
          </div>
        </div>

        {/* KPIs (solo tab pagos) */}
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

        {/* Tabs navegación */}
        <div className="mb-3 sm:mb-4">
          <div className="inline-flex p-1 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-[0_0_18px_rgba(15,23,42,0.85)]">
            <button
              type="button"
              onClick={() => handleChangeTab("pagos")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "pagos"
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
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
              <span>Historial de recordatorios</span>
            </button>
          </div>
        </div>

        {/* Contenido según tab */}
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
                  {Number(lastBuscarMeta?.count || 0) > 0 ? (
                    <>
                      {" "}
                      • Total backend:{" "}
                      <span className="text-slate-200 font-semibold tabular-nums">
                        {Number(lastBuscarMeta.count || 0) || 0}
                      </span>
                      {" "}
                      • Clientes:{" "}
                      <span className="text-slate-200 font-semibold tabular-nums">
                        {clienteGroups.length}
                      </span>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* ✅ NUEVO: lista de clientes encontrados */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-200">
                    <HiUserGroup className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Resultados por cliente</div>
                    <div className="text-xs text-slate-400">
                      Elegí un cliente para ver todas sus cuotas y pagar desde ahí.
                    </div>
                  </div>
                </div>

                {clienteSeleccionado && (
                  <button
                    type="button"
                    onClick={() => setClienteSeleccionado(null)}
                    className="h-9 px-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-200 hover:bg-slate-900/60 cursor-pointer text-xs"
                  >
                    Volver a clientes
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
                                  DNI/CUIT: <span className="text-slate-200">{safe(g.dni, "—")}</span>
                                  {" "}• Pólizas: <span className="text-slate-200">{g.polizasCount}</span>
                                  {" "}• Cuotas: <span className="text-slate-200">{g.total}</span>
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
                                Vencidas: <span className="ml-1 tabular-nums">{g.vencidas}</span>
                              </span>

                              <span
                                className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${
                                  g.venceHoy > 0
                                    ? "bg-amber-500/15 border-amber-400/30 text-amber-200"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                                }`}
                              >
                                Hoy: <span className="ml-1 tabular-nums">{g.venceHoy}</span>
                              </span>

                              <span
                                className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${
                                  g.pendientes > 0
                                    ? "bg-indigo-500/15 border-indigo-400/30 text-indigo-200"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                                }`}
                              >
                                Pendientes: <span className="ml-1 tabular-nums">{g.pendientes}</span>
                              </span>

                              <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border bg-emerald-500/10 border-emerald-400/25 text-emerald-200">
                                Total a cobrar: <span className="ml-1 tabular-nums">{fmtMoney(g.totalMontoPendiente)}</span>
                              </span>
                            </div>

                            {g.polizas?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {g.polizas.map((p, idx) => (
                                  <span
                                    key={`${g.key}-p-${idx}`}
                                    className="inline-flex items-center rounded-full px-3 h-8 text-[11px] border bg-slate-900 border-slate-800 text-slate-300"
                                  >
                                    {p}
                                  </span>
                                ))}
                                {g.polizasCount > g.polizas.length && (
                                  <span className="inline-flex items-center rounded-full px-3 h-8 text-[11px] border bg-slate-900 border-slate-800 text-slate-400">
                                    +{g.polizasCount - g.polizas.length} más
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-3 text-xs text-slate-500">
                              Próximo vencimiento:{" "}
                              <span className="text-slate-200 font-semibold tabular-nums">
                                {g.proximoVtoStr}
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

            {/* ✅ Modal: cuotas del cliente seleccionado */}
            <AnimatePresence>
              {!!clienteSeleccionado && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
                >
                  <div
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    onClick={cerrarClienteModal}
                  />

                  <motion.div
                    initial={{ y: 22, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 22, opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="relative z-[81] w-full sm:w-[min(980px,92vw)] bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                  >
                    {/* header modal */}
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-semibold text-slate-50 truncate">
                            {clienteSeleccionado?.label || "Cliente"}
                          </div>
                          <div className="mt-1 text-xs sm:text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                            <span>
                              DNI/CUIT:{" "}
                              <span className="text-slate-200 font-semibold">
                                {safe(clienteSeleccionado?.dni, "—")}
                              </span>
                            </span>
                            <span>•</span>
                            <span>
                              Pólizas:{" "}
                              <span className="text-slate-200 font-semibold tabular-nums">
                                {clienteSeleccionado?.polizasCount ?? 0}
                              </span>
                            </span>
                            <span>•</span>
                            <span>
                              Cuotas:{" "}
                              <span className="text-slate-200 font-semibold tabular-nums">
                                {clienteSeleccionado?.total ?? 0}
                              </span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={cerrarClienteModal}
                          className="h-10 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 inline-flex items-center gap-2 cursor-pointer"
                          aria-label="Cerrar"
                        >
                          <HiX className="w-5 h-5" />
                          <span className="hidden sm:inline">Cerrar</span>
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border bg-emerald-500/10 border-emerald-400/25 text-emerald-200">
                          Total a cobrar:{" "}
                          <span className="ml-1 tabular-nums">
                            {fmtMoney(clienteSeleccionado?.totalMontoPendiente || 0)}
                          </span>
                        </span>
                        <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border bg-rose-500/15 border-rose-400/30 text-rose-200">
                          Vencidas: <span className="ml-1 tabular-nums">{clienteSeleccionado?.vencidas ?? 0}</span>
                        </span>
                        <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border bg-amber-500/15 border-amber-400/30 text-amber-200">
                          Hoy: <span className="ml-1 tabular-nums">{clienteSeleccionado?.venceHoy ?? 0}</span>
                        </span>
                        <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border bg-indigo-500/15 border-indigo-400/30 text-indigo-200">
                          Pendientes: <span className="ml-1 tabular-nums">{clienteSeleccionado?.pendientes ?? 0}</span>
                        </span>
                      </div>
                    </div>

                    {/* body modal: PagosList con cuotas del cliente */}
                    <div className="p-0">
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
          /* ---- (historial pagos) ---- */
          <motion.div
            key="tab-historial-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 sm:space-y-4"
          >
            {/* === tu historial (SIN CAMBIOS) === */}
            {/* Filtros */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex flex-col lg:flex-row gap-2 lg:items-end">
                {/* Modo */}
                <div className="w-full lg:w-56">
                  <label className="block text-xs text-slate-400 mb-1">Filtro</label>
                  <select
                    value={hpModo}
                    onChange={(e) => {
                      setHpModo(e.target.value);
                      setHpPage(1);
                    }}
                    className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                  >
                    <option value="MES">Mes</option>
                    <option value="DIA">Día</option>
                    <option value="RANGO">Rango</option>
                  </select>
                </div>

                {/* Inputs según modo */}
                {hpModo === "MES" ? (
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Mes</label>
                    <select
                      value={hpMes}
                      onChange={(e) => {
                        setHpMes(e.target.value);
                        setHpPage(1);
                      }}
                      className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                    >
                      {mesesOptions.map((ym) => (
                        <option key={ym} value={ym}>
                          {monthLabel(ym)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : hpModo === "DIA" ? (
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Día</label>
                    <div className="relative">
                      <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="date"
                        value={hpDia}
                        onChange={(e) => {
                          setHpDia(e.target.value);
                          setHpPage(1);
                        }}
                        className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 pl-10 pr-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Desde</label>
                      <input
                        type="date"
                        value={hpDesde}
                        onChange={(e) => {
                          setHpDesde(e.target.value);
                          setHpPage(1);
                        }}
                        className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Hasta</label>
                      <input
                        type="date"
                        value={hpHasta}
                        onChange={(e) => {
                          setHpHasta(e.target.value);
                          setHpPage(1);
                        }}
                        className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                  </div>
                )}

                <div className="w-full lg:w-56">
                  <label className="block text-xs text-slate-400 mb-1">Oficina</label>
                  <select
                    value={hpOficina}
                    onChange={(e) => {
                      setHpOficina(e.target.value);
                      setHpPage(1);
                    }}
                    className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                  >
                    <option value="ALL">Todas</option>
                    <option value="1">5 esquinas</option>
                    <option value="2">Axion</option>
                    <option value="3">39</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Buscar (DNI / Apellido / Patente / Póliza)
                  </label>
                  <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={hpQInput}
                      onChange={(e) => setHpQInput(e.target.value)}
                      placeholder="Ej: 30123456 • Gómez • ABC123 • 000123"
                      className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 pl-10 pr-10 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                    />
                    {!!hpQInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setHpQInput("");
                          startTransition(() => {
                            setHpQApplied("");
                            setHpPage(1);
                          });
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-slate-800/60 text-slate-300 cursor-pointer"
                        title="Limpiar"
                      >
                        <HiX />
                      </button>
                    )}
                  </div>
                  {!!hpQInput &&
                    (hpQApplied !== String(hpQInput || "").trim() || isPending) && (
                      <div className="mt-1 text-[0.72rem] text-slate-500">
                        Aplicando búsqueda…
                      </div>
                    )}
                </div>

                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    onClick={handleRefreshHistorialPagos}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-200 shadow-sm hover:bg-slate-700/80 cursor-pointer"
                  >
                    <HiRefresh className="text-base" />
                    <span>Actualizar</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={handleDownloadCSV}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={downloadingCSV || downloadingPDF}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border shadow-sm cursor-pointer ${
                      downloadingCSV || downloadingPDF
                        ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-emerald-500/15 border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20"
                    }`}
                    title="Descargar CSV"
                  >
                    <HiDownload className="text-base" />
                    <span>{downloadingCSV ? "Descargando..." : "CSV"}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={handleDownloadPDF}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={downloadingPDF || downloadingCSV}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border shadow-sm cursor-pointer ${
                      downloadingPDF || downloadingCSV
                        ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-indigo-500/15 border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/20"
                    }`}
                    title="Descargar PDF"
                  >
                    <HiDownload className="text-base" />
                    <span>{downloadingPDF ? "Descargando..." : "PDF"}</span>
                  </motion.button>
                </div>
              </div>

              {(historialPagosError ||
                historialPagosDownloadError ||
                historialPagosDownloadPdfError) && (
                <div className="mt-3 text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-2xl px-3 py-2">
                  {safe(
                    historialPagosDownloadError ||
                      historialPagosDownloadPdfError ||
                      historialPagosError,
                    "Error"
                  )}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2">
                  <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Pagos (página)
                  </div>
                  <div className="text-lg font-semibold tabular-nums">{hpKpis.count}</div>
                </div>
                <div className="rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2">
                  <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Total (página)
                  </div>
                  <div className="text-lg font-semibold tabular-nums">{fmtMoney(hpKpis.total)}</div>
                </div>
                <div className="rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2">
                  <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Total backend
                  </div>
                  <div className="text-lg font-semibold tabular-nums">
                    {Number(historialPagosMeta?.count || 0) || 0}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2">
                  <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">Estado</div>
                  <div className="text-sm font-semibold">
                    {loadingHistorialPagos
                      ? "Cargando..."
                      : downloadingCSV
                      ? "Descargando CSV..."
                      : downloadingPDF
                      ? "Descargando PDF..."
                      : "Listo"}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla (SIN CAMBIOS) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] overflow-hidden">
              <div className="overflow-auto">
                <table className="min-w-[1120px] w-full text-sm">
                  <thead className="bg-slate-950/60 border-b border-slate-800">
                    <tr className="text-slate-300">
                      <th className="text-left px-3 py-2">Fecha pago</th>
                      <th className="text-left px-3 py-2">Registrado</th>
                      <th className="text-left px-3 py-2">Cuota</th>
                      <th className="text-left px-3 py-2">Asegurado</th>
                      <th className="text-left px-3 py-2">DNI</th>
                      <th className="text-left px-3 py-2">Patente</th>
                      <th className="text-left px-3 py-2">Póliza</th>
                      <th className="text-left px-3 py-2">Compañía</th>
                      <th className="text-left px-3 py-2">Oficina</th>
                      <th className="text-right px-3 py-2">Importe</th>
                      <th className="text-left px-3 py-2">Medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(historialPagosItems) && historialPagosItems.length > 0 ? (
                      historialPagosItems.map((it) => {
                        const fechaPago = it?.fecha_pago || "";
                        const fechaFmt = fechaPago
                          ? dayjs(fechaPago).isValid()
                            ? dayjs(fechaPago).format("DD/MM/YYYY")
                            : String(fechaPago)
                          : "—";

                        const registradoFmt = fmtRegistro(it);

                        const clienteNombre = it?.cliente_nombre || "";
                        const dni = it?.cliente_dni || "";
                        const patente = it?.patente || "";
                        const numeroPoliza = it?.numero_poliza || "";
                        const compania = it?.compania || "";
                        const oficina = it?.oficina_nombre || it?.oficina || "";

                        const monto = it?.monto ?? it?.importe ?? it?.precio_cuota ?? null;
                        const medio = it?.medio || it?.forma_pago || "";

                        const cuotaLabel =
                          it?.cuota_label ||
                          it?.cuota_va ||
                          (it?.cuota_nro !== undefined && it?.cuota_nro !== null
                            ? String(it.cuota_nro)
                            : "");

                        return (
                          <tr
                            key={it?.id ?? `${fechaPago}-${numeroPoliza}-${patente}`}
                            className="border-b border-slate-800/70 hover:bg-slate-950/40"
                          >
                            <td className="px-3 py-2 text-slate-200">{fechaFmt}</td>

                            <td className="px-3 py-2 text-slate-300">
                              <span className="inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400/70 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
                                <span className="tabular-nums">{registradoFmt}</span>
                              </span>
                            </td>

                            <td className="px-3 py-2 text-slate-200 font-semibold tabular-nums">
                              {safe(cuotaLabel, "—")}
                            </td>

                            <td className="px-3 py-2 text-slate-100 font-medium">
                              {safe(clienteNombre)}
                            </td>
                            <td className="px-3 py-2 text-slate-300">{safe(dni)}</td>
                            <td className="px-3 py-2 text-slate-200">{safe(patente)}</td>
                            <td className="px-3 py-2 text-slate-300">{safe(numeroPoliza)}</td>
                            <td className="px-3 py-2 text-slate-300">{safe(compania)}</td>
                            <td className="px-3 py-2 text-slate-300">{safe(oficina)}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-100">
                              {fmtMoney(monto)}
                            </td>
                            <td className="px-3 py-2 text-slate-300">{safe(medio)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} className="px-3 py-10 text-center text-slate-400">
                          {loadingHistorialPagos
                            ? "Cargando historial de pagos..."
                            : "No hay pagos registrados con esos filtros."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between gap-2 px-3 py-3 border-t border-slate-800 bg-slate-950/40">
                <div className="text-xs text-slate-400">
                  Página <span className="text-slate-200">{hpPage}</span> • Total:{" "}
                  <span className="text-slate-200">{Number(historialPagosMeta?.count || 0) || 0}</span>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={() => setHpPage((p) => Math.max(1, p - 1))}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={hpPage <= 1 || loadingHistorialPagos}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border cursor-pointer ${
                      hpPage <= 1 || loadingHistorialPagos
                        ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    <HiChevronLeft />
                    <span>Anterior</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setHpPage((p) => p + 1)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={!historialPagosMeta?.next || loadingHistorialPagos}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border cursor-pointer ${
                      !historialPagosMeta?.next || loadingHistorialPagos
                        ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    <span>Siguiente</span>
                    <HiChevronRight />
                  </motion.button>
                </div>
              </div>
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

      {/* Modales */}
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
