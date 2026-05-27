/* src/components/pagos/CuotasAlertas.jsx — Buckets 3/0/3/7/30 + Export CSV/Excel/PDF + filtros Oficina + Compañía + búsqueda intencional */
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  HiClock,
  HiExclamation,
  HiBadgeCheck,
  HiOfficeBuilding,
  HiChevronDown,
  HiShieldCheck,
  HiQuestionMarkCircle,
} from "react-icons/hi";
import { fetchCuotasAVencer } from "../../store/slices/pagosSlice";

// 🎯 Lógica unificada de cuotas (fuente única de verdad)
import {
  diasHastaVencimiento,
  fmtMoney as utilFmtMoney,
  fmtFecha,
} from "../../utils/cuotas";

dayjs.locale("es");

// ✅ Solo 3 oficinas + Todas
const FILTERS = [
  {
    key: "ALL",
    label: "Todas",
    active:
      "bg-slate-700 text-slate-100 border-slate-600 ",
    inactive:
      "bg-slate-900/50 text-slate-100 border-slate-700/80 hover:border-sky-300/60 hover: hover:bg-slate-900/70",
    ring: "focus-visible:ring-sky-200/80",
    badgeActive: "bg-slate-600 text-slate-100",
    badgeInactive: "bg-slate-800 text-slate-400",
  },
  {
    key: "1",
    label: "5 esquinas (1)",
    active:
      "bg-slate-700 text-slate-100 border-slate-600 ",
    inactive:
      "bg-slate-900/50 text-slate-100 border-slate-700/80 hover:border-emerald-300/60 hover: hover:bg-slate-900/70",
    ring: "focus-visible:ring-emerald-200/80",
    badgeActive: "bg-slate-600 text-slate-100",
    badgeInactive: "bg-slate-800 text-slate-400",
  },
  {
    key: "2",
    label: "axion (2)",
    active:
      "bg-slate-700 text-slate-100 border-slate-600 ",
    inactive:
      "bg-slate-900/50 text-slate-100 border-slate-700/80 hover:border-cyan-200/60 hover: hover:bg-slate-900/70",
    ring: "focus-visible:ring-cyan-100/80",
    badgeActive: "bg-slate-600 text-slate-100",
    badgeInactive: "bg-slate-800 text-slate-400",
  },
  {
    key: "3",
    label: "kilometro 39 (3)",
    active:
      "bg-slate-700 text-slate-100 border-slate-600 ",
    inactive:
      "bg-slate-900/50 text-slate-100 border-slate-700/80 hover:border-fuchsia-200/60 hover: hover:bg-slate-900/70",
    ring: "focus-visible:ring-fuchsia-200/80",
    badgeActive: "bg-slate-600 text-slate-100",
    badgeInactive: "bg-slate-800 text-slate-400",
  },
];

const getFilterMeta = (key) => FILTERS.find((f) => f.key === key) || FILTERS[0];

const oficinaLabelFromKey = (k) => {
  if (k === "1") return "5 esquinas (1)";
  if (k === "2") return "axion (2)";
  if (k === "3") return "kilometro 39 (3)";
  return "Sin oficina";
};

/** Extrae un valor "raw" de oficina desde varios posibles campos */
const extractRawOficina = (cuota) => {
  return (
    cuota?.poliza?.oficina ??
    cuota?.poliza?.oficina_nombre ??
    cuota?.poliza?.oficinaName ??
    cuota?.poliza?.oficina_id ??
    cuota?.poliza?.oficinaId ??
    cuota?.oficina ??
    cuota?.oficina_nombre ??
    cuota?.oficina_id ??
    cuota?.oficinaId ??
    ""
  );
};

/**
 * Normaliza oficina -> "1" | "2" | "3" | ""
 */
const normalizeOficina3 = (raw) => {
  const s0 = String(raw ?? "").trim();
  if (!s0) return "";

  const up = s0.toUpperCase();

  if (s0 === "1" || s0 === "2" || s0 === "3") return s0;

  if (/\bOFI\s*[-_]*\s*1\b/.test(up) || /\bOFI1\b/.test(up)) return "1";
  if (/\bOFI\s*[-_]*\s*2\b/.test(up) || /\bOFI2\b/.test(up)) return "2";
  if (/\bOFI\s*[-_]*\s*3\b/.test(up) || /\bOFI3\b/.test(up)) return "3";

  if ((/\(1\)/.test(up) || /\b1\b/.test(up)) && /ESQUINAS/.test(up)) return "1";
  if (/\(2\)/.test(up) || /AXION/.test(up)) return "2";
  if (/\(3\)/.test(up) || /KILOMETRO\s*39/.test(up) || /\bKM\s*39\b/.test(up))
    return "3";

  if (/5\s*ESQUINAS/.test(up)) return "1";
  if (/AXION/.test(up)) return "2";
  if (/KILOMETRO\s*39/.test(up) || /\bKM\s*39\b/.test(up)) return "3";

  return "";
};

/** Compañía: extrae desde varios campos posibles */
const extractRawCompania = (cuota) => {
  const pol = cuota?.poliza || {};
  const c =
    pol?.compania_nombre ??
    pol?.compania?.nombre ??
    pol?.compania ??
    cuota?.compania_nombre ??
    cuota?.compania?.nombre ??
    cuota?.compania ??
    "";
  return String(c ?? "").trim();
};

const normalizeCompaniaKey = (raw) => String(raw ?? "").trim().toLowerCase();

const labelCompania = (raw) => String(raw ?? "").trim() || "Sin compañía";

/**
 * 🎯 Calcula días relativos usando helper unificado.
 * Wrapper para no romper la API existente que pasa (fechaStr, hoy).
 */
function getDiasRelativos(fechaStr, hoy) {
  if (!fechaStr) return null;
  const fv = dayjs(fechaStr);
  if (!fv.isValid()) return null;
  // Usamos el `hoy` recibido para consistencia (en lugar de today() del util)
  return fv.startOf("day").diff(hoy, "day");
}

/**
 * 🎯 Formato de moneda con 2 decimales (más legible para alertas).
 */
function fmtMoney(n) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
}

/**
 * 🎯 Estilo + texto para una card de cuota según días relativos.
 * Lenguaje SIMPLE para operadores nuevos.
 */
function getCardStyleByDias(dias) {
  if (dias === null) {
    return {
      label: "Sin fecha de vencimiento",
      classes: "bg-neutral-400/20 border-neutral-300/30 text-neutral-100",
      Icon: HiExclamation,
      tooltip: "Esta cuota no tiene fecha de vencimiento cargada.",
    };
  }
  if (dias < 0) {
    const abs = Math.abs(dias);
    return {
      label: `Lleva ${abs} día${abs === 1 ? "" : "s"} sin pagar`,
      classes: "bg-rose-950/30 border-rose-900 text-rose-200",
      Icon: HiExclamation,
      tooltip: `La cuota tenía que pagarse hace ${abs} día${abs === 1 ? "" : "s"}. El auto está SIN cobertura del seguro desde esa fecha.`,
    };
  }
  if (dias === 0) {
    return {
      label: "Tiene que pagar hoy",
      classes: "bg-slate-900 border-slate-700 text-slate-200",
      Icon: HiClock,
      tooltip: "Esta cuota vence hoy. Si no se cobra, mañana el auto va a quedar sin cobertura.",
    };
  }
  return {
    label: dias === 1 ? "Le falta 1 día" : `Le faltan ${dias} días`,
    classes: "bg-amber-950/20 border-amber-900 text-amber-200",
    Icon: HiClock,
    tooltip: `Faltan ${dias} día${dias === 1 ? "" : "s"} para el vencimiento. Hay que avisarle al cliente.`,
  };
}

/**
 * 🎯 Buckets con títulos en lenguaje simple para operadores nuevos.
 *
 * IMPORTANTE: los `key` se mantienen EXACTAMENTE iguales porque otros
 * componentes del sistema los referencian. Solo cambian los textos.
 * El campo `message` (usado para WhatsApp masivo) tampoco se toca.
 */
const BUCKETS = [
  {
    key: "3_antes",
    title: "📌 Hay que avisarles (vence pronto)",
    subtitle: "Les faltan 1 a 3 días para pagar",
    message: "📌 Recordatorio: tenés cuotas que vencen pronto",
    match: (d) => d !== null && d >= 1 && d <= 3,
  },
  {
    key: "hoy",
    title: "⚠️ Hay que cobrar HOY",
    subtitle: "Las cuotas vencen hoy",
    message: "⚠️ Hoy vencen tus cuotas",
    match: (d) => d === 0,
  },
  {
    key: "3_despues",
    title: "🔔 Atrasados pocos días",
    subtitle: "Llevan 1 a 3 días sin pagar",
    message: "🔔 Tenés cuotas vencidas hace 3 días",
    match: (d) => d !== null && d <= -1 && d >= -3,
  },
  {
    key: "7_despues",
    title: "❗ Atrasados 1 semana",
    subtitle: "Llevan 4 a 7 días sin pagar",
    message: "❗ Atraso importante: cuotas vencidas hace 1 semana",
    match: (d) => d !== null && d <= -4 && d >= -7,
  },
  {
    key: "30_despues",
    title: "🚨 Atrasados más de 30 días",
    subtitle: "Llevan 30 días o más sin pagar",
    message: "🚨 Último aviso para recuperar cobertura: cuotas vencidas hace 30 días",
    match: (d) => d !== null && d <= -30,
  },
  {
    key: "otros",
    title: "Otros",
    subtitle: "Fuera de los grupos principales",
    message: "Otros vencimientos / atrasos",
    remainder: true,
  },
];

/** Busca cliente desde distintos lugares posibles */
function extractCliente(cuota) {
  return (
    cuota?.poliza?.cliente ??
    cuota?.cliente ??
    cuota?.poliza?.asegurado ??
    cuota?.asegurado ??
    null
  );
}

/** Nombre asegurado "robusto" */
function formatAseguradoName(cuota) {
  const cli = extractCliente(cuota) || {};
  const nombre = String(cli?.nombre || cli?.name || "").trim();
  const apellido = String(cli?.apellido || cli?.last_name || "").trim();
  const full =
    [apellido, nombre].filter(Boolean).join(", ").trim() ||
    [nombre, apellido].filter(Boolean).join(" ").trim();
  return full || "Asegurado";
}

/** CSV helpers */
function csvSafe(v) {
  const s = String(v ?? "").replace(/\r?\n/g, " ").trim();
  const esc = s.replace(/"/g, '""');
  return `"${esc}"`;
}

function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename, header, rows) {
  const lines = [header.map(csvSafe).join(","), ...rows.map((r) => r.map(csvSafe).join(","))].join("\n");
  downloadBlob(filename, "text/csv;charset=utf-8;", lines);
}

/** Excel sin librerías: HTML Table -> .xls */
function downloadExcelXls(filename, header, rows) {
  const escapeHtml = (x) =>
    String(x ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const thead = `<tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;

  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");

  const html = `<!doctype html>
<html>
<head><meta charset="UTF-8" /></head>
<body>
  <table border="1">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`;

  downloadBlob(filename, "application/vnd.ms-excel;charset=utf-8;", html);
}

/** PDF: vista imprimible (guardar como PDF) */
function openPrintToPDF({ title, header, rows }) {
  const escapeHtml = (x) =>
    String(x ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const thead = `<tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;

  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 18px; }
    h1 { font-size: 16px; margin: 0 0 10px; }
    .meta { font-size: 12px; color: #444; margin: 0 0 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
    th { background: #f2f2f2; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generado: ${escapeHtml(dayjs().format("DD/MM/YYYY HH:mm"))}</p>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    }
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * 🎯 Card de cuota en alerta — lenguaje simple para operadores nuevos.
 */
function CuotaAlertaCard({ cuota, dias }) {
  const { label, classes, Icon, tooltip } = getCardStyleByDias(dias);

  const rawOfi = extractRawOficina(cuota);
  const ofiNorm = normalizeOficina3(rawOfi);

  const ofiLabelFromBackend = String(cuota?.poliza?.oficina_nombre || "").trim();
  const ofiLabel = ofiLabelFromBackend || (ofiNorm ? oficinaLabelFromKey(ofiNorm) : "Sin oficina");

  const compLabel = labelCompania(extractRawCompania(cuota));

  const asegurado = formatAseguradoName(cuota);
  const patente = String(cuota?.poliza?.patente || "").toUpperCase().trim();
  const vehiculo = [cuota?.poliza?.marca, cuota?.poliza?.modelo].filter(Boolean).join(" ").trim();

  // Etiqueta del bloque fecha: si está vencida → "Tenía que pagar el", si no → "Tiene que pagar el"
  const labelVencimiento = dias !== null && dias < 0 ? "Tenía que pagar el" : "Tiene que pagar el";

  return (
    <motion.div
      key={cuota.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-lg border p-3 ${classes}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base sm:text-lg font-medium">{asegurado}</p>
          {patente && (
            <span className="shrink-0 inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm sm:text-base font-mono font-medium">
              {patente}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
            <HiOfficeBuilding className="w-4 h-4" />
            {ofiLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
            <HiShieldCheck className="w-4 h-4" />
            {compLabel}
          </span>
        </div>

        {/* 🎯 Estado simple con tooltip */}
        <div
          className="flex items-center gap-2 text-sm"
          title={tooltip}
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/10">
            <Icon className="w-4 h-4" />
          </span>
          <p className="font-medium">{label}</p>
          {tooltip && (
            <HiQuestionMarkCircle
              className="w-3.5 h-3.5 opacity-60 cursor-help"
              title={tooltip}
            />
          )}
        </div>

        <p className="opacity-95">
          <span className="font-semibold">{vehiculo || "Vehículo"}</span>
        </p>

        <p className="text-sm opacity-95">
          Cuota <span className="font-semibold">#{cuota.cuota_nro}</span> •{" "}
          <span className="font-semibold">$ {fmtMoney(cuota.monto)}</span>
        </p>

        <p className="text-sm">
          {labelVencimiento}:{" "}
          <span className="font-semibold">
            {cuota.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY") : "—"}
          </span>
        </p>

        {cuota.pagado && cuota.fecha_pago && (
          <p className="flex items-center gap-1 text-sm">
            <HiBadgeCheck className="w-4 h-4" />
            Pagó el: {dayjs(cuota.fecha_pago).format("DD/MM/YYYY")}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function BucketSection({ bucket, items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-200">
            {bucket.title} <span className="text-slate-300 font-normal">({items.length})</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{bucket.subtitle}</p>
        </div>

        <div className="text-xs text-slate-500 rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1.5">
          {bucket.message}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {items.map(({ cuota, dias }) => (
          <CuotaAlertaCard key={cuota.id} cuota={cuota} dias={dias} />
        ))}
      </div>
    </div>
  );
}

/**
 * Props opcionales (modo controlado):
 * - oficina: "ALL" | "1" | "2" | "3"
 * - onOficinaChange(oficinaKey)
 * - isWebAdmin: boolean 🚀 (NUEVO)
 */
export default function CuotasAlertas({ oficina, onOficinaChange, isWebAdmin }) {
  const dispatch = useDispatch();
  const { cuotasAVencer, status, error } = useSelector((s) => s.pagos);

  const [oficinaSelInternal, setOficinaSelInternal] = useState("ALL");
  const oficinaSel = oficina ?? oficinaSelInternal;
  const setOficinaSel = onOficinaChange ?? setOficinaSelInternal;

  const [companiaSel, setCompaniaSel] = useState("ALL"); // key normalizada (lower)
  const [exportFormat, setExportFormat] = useState("csv"); // csv | excel | pdf

  // ✅ NUEVO: búsqueda intencional
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = () => {
    setHasSearched(true);
    dispatch(fetchCuotasAVencer());
  };

  const listAll = useMemo(() => (Array.isArray(cuotasAVencer) ? cuotasAVencer : []), [cuotasAVencer]);

  /** Opciones y conteos de compañías (siempre desde el total cargado) */
  const companiasMeta = useMemo(() => {
    const counts = new Map(); // key -> { label, count }
    for (const cuota of listAll) {
      const raw = extractRawCompania(cuota);
      const label = labelCompania(raw);
      const key = normalizeCompaniaKey(label);
      if (!key) continue;

      const prev = counts.get(key);
      if (!prev) counts.set(key, { key, label, count: 1 });
      else prev.count += 1;
    }

    const arr = Array.from(counts.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" })
    );

    return {
      total: listAll.length,
      options: arr,
    };
  }, [listAll]);

  /** Primero aplico filtro por compañía */
  const listByCompany = useMemo(() => {
    if (!companiaSel || companiaSel === "ALL") return listAll;
    return listAll.filter((cuota) => {
      const raw = extractRawCompania(cuota);
      const label = labelCompania(raw);
      const key = normalizeCompaniaKey(label);
      return key === companiaSel;
    });
  }, [listAll, companiaSel]);

  /** Conteos de oficina SOBRE lo que queda por compañía (para que los números tengan sentido) */
  const conteosOficina = useMemo(() => {
    const list = Array.isArray(listByCompany) ? listByCompany : [];
    const c = { ALL: list.length, "1": 0, "2": 0, "3": 0 };

    for (const cuota of list) {
      const raw = extractRawOficina(cuota);
      const b = normalizeOficina3(raw);
      if (b) c[b] += 1;
    }
    return c;
  }, [listByCompany]);

  /** Luego aplico filtro por oficina */
  const cuotasFiltradas = useMemo(() => {
    const list = Array.isArray(listByCompany) ? listByCompany : [];
    if (!oficinaSel || oficinaSel === "ALL") return list;

    return list.filter((cuota) => {
      const raw = extractRawOficina(cuota);
      return normalizeOficina3(raw) === oficinaSel;
    });
  }, [listByCompany, oficinaSel]);

  const buckets = useMemo(() => {
    const hoy = dayjs().startOf("day");
    const list = Array.isArray(cuotasFiltradas) ? cuotasFiltradas : [];

    const out = {};
    BUCKETS.forEach((b) => {
      out[b.key] = [];
    });

    for (const cuota of list) {
      const dias = getDiasRelativos(cuota?.fecha_vencimiento, hoy);

      let placed = false;
      for (const b of BUCKETS) {
        if (b.remainder) continue;
        if (b.match && b.match(dias)) {
          out[b.key].push({ cuota, dias });
          placed = true;
          break;
        }
      }
      if (!placed) out.otros.push({ cuota, dias });
    }

    Object.keys(out).forEach((k) => {
      out[k].sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
    });

    return out;
  }, [cuotasFiltradas]);

  const totalMostrado = useMemo(() => {
    return Object.values(buckets || {}).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  }, [buckets]);

  /** Export: dedupe por cliente (solo visibles: compañía + oficina) */
  const buildAseguradosTable = () => {
    const hoy = dayjs().startOf("day");
    const allItems = Object.entries(buckets || {}).flatMap(([bucketKey, arr]) =>
      (arr || []).map((x) => ({ ...x, bucketKey }))
    );

    const map = new Map();

    for (const it of allItems) {
      const cuota = it.cuota;
      const dias = it.dias;

      const cli = extractCliente(cuota) || {};
      const cliId = cli?.id;
      const dni = (cli?.dni_cuit_cuil || cli?.dni || cli?.cuit || "").toString().trim();

      const nombre = (cli?.nombre || cli?.name || "").toString().trim();
      const apellido = (cli?.apellido || cli?.last_name || "").toString().trim();
      const telefono = (cli?.telefono || cli?.celular || cli?.whatsapp || "").toString().trim();
      const email = (cli?.email || "").toString().trim();

      const key =
        (cliId !== undefined && cliId !== null ? `id:${cliId}` : "") ||
        (dni ? `dni:${dni}` : "") ||
        `nom:${apellido}|${nombre}` ||
        `cuota:${cuota?.id}`;

      const rawOfi = extractRawOficina(cuota);
      const ofiNorm = normalizeOficina3(rawOfi);
      const ofiLabelFromBackend = String(cuota?.poliza?.oficina_nombre || "").trim();
      const oficinaLabel = ofiLabelFromBackend || (ofiNorm ? oficinaLabelFromKey(ofiNorm) : "Sin oficina");

      const compLabel = labelCompania(extractRawCompania(cuota));

      const pol = cuota?.poliza || {};
      const numeroPoliza = pol.numero_poliza || pol.numero || pol.nro_poliza || pol.n_poliza || "";
      const patente = (pol.patente || "").toString().toUpperCase();
      const vehiculo = [pol.marca, pol.modelo].filter(Boolean).join(" ").trim();

      const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
      const diasCalc = fv && fv.isValid() ? fv.diff(hoy, "day") : dias;

      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          cliente_id: cliId ?? "",
          apellido,
          nombre,
          dni,
          telefono,
          email,
          oficina: oficinaLabel,
          compania: compLabel,
          cuotas_count: 1,
          buckets: new Set([it.bucketKey]),
          vencimiento_mas_proximo: fv?.isValid() ? fv : null,
          dias_mas_proximo: typeof diasCalc === "number" ? diasCalc : "",
          numero_poliza: numeroPoliza,
          patente,
          vehiculo,
        });
      } else {
        prev.cuotas_count += 1;
        prev.buckets.add(it.bucketKey);

        if (fv?.isValid()) {
          if (!prev.vencimiento_mas_proximo) {
            prev.vencimiento_mas_proximo = fv;
            prev.dias_mas_proximo = diasCalc;
          } else {
            const prevDias = typeof prev.dias_mas_proximo === "number" ? prev.dias_mas_proximo : null;

            if (typeof diasCalc === "number") {
              if (prevDias === null || diasCalc < prevDias) {
                prev.vencimiento_mas_proximo = fv;
                prev.dias_mas_proximo = diasCalc;
              }
            }
          }
        }
      }
    }

    const header = [
      "cliente_id",
      "apellido",
      "nombre",
      "dni_cuit_cuil",
      "telefono",
      "email",
      "oficina",
      "compania",
      "cuotas_en_alerta",
      "buckets",
      "vencimiento_mas_proximo",
      "dias_mas_proximo",
      "numero_poliza",
      "patente",
      "vehiculo",
    ];

    const rows = Array.from(map.values()).map((x) => [
      x.cliente_id,
      x.apellido,
      x.nombre,
      x.dni,
      x.telefono,
      x.email,
      x.oficina,
      x.compania,
      x.cuotas_count,
      Array.from(x.buckets).join("|"),
      x.vencimiento_mas_proximo ? x.vencimiento_mas_proximo.format("YYYY-MM-DD") : "",
      x.dias_mas_proximo,
      x.numero_poliza,
      x.patente,
      x.vehiculo,
    ]);

    return { header, rows };
  };

  const doExport = () => {
    const { header, rows } = buildAseguradosTable();

    const fileOfi = oficinaSel && oficinaSel !== "ALL" ? `ofi_${oficinaSel}` : "todas";
    const fileComp = companiaSel && companiaSel !== "ALL" ? `comp_${companiaSel}` : "todas";
    const baseName = `asegurados_alertas_${fileOfi}_${fileComp}_${dayjs().format("YYYY-MM-DD_HH-mm")}`;

    if (exportFormat === "csv") {
      downloadCSV(`${baseName}.csv`, header, rows);
      return;
    }
    if (exportFormat === "excel") {
      downloadExcelXls(`${baseName}.xls`, header, rows);
      return;
    }

    openPrintToPDF({
      title: `Asegurados en alertas (${getFilterMeta(oficinaSel).label} / ${
        companiaSel === "ALL"
          ? "Todas las compañías"
          : companiasMeta.options.find((o) => o.key === companiaSel)?.label || "Compañía"
      })`,
      header,
      rows,
    });
  };

  // ✅ si aún no buscaste, mostramos un panel liviano
  if (!hasSearched) {
    return (
      <motion.div
        className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-400 text-slate-950">
              <HiClock className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Alertas de cuotas (agrupadas por urgencia)</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                La búsqueda es intencional para que la página cargue más rápido.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runSearch}
            className="h-9 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            title="Buscar cuotas por vencer o vencidas"
          >
            Buscar
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-slate-400">
          Elegí filtros (opcional) y tocá <span className="font-semibold">Buscar</span> para ver las alertas.
        </div>
      </motion.div>
    );
  }

  // ✅ loading / error solo aplican DESPUÉS de buscar
  if (status === "loading") {
    return (
      <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
        <div className="h-4 w-52 rounded bg-slate-700/50 animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-16 rounded-xl border border-slate-700/50 bg-slate-800/40 animate-pulse" />
          <div className="h-16 rounded-xl border border-slate-700/50 bg-slate-800/40 animate-pulse" />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100">
        Error cargando alertas: {String(error || "desconocido")}
      </div>
    );
  }

  // si buscaste y no hay resultados
  if (!cuotasAVencer || cuotasAVencer.length === 0) {
    return (
      <motion.div
        className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-400 text-slate-950">
              <HiClock className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Alertas de cuotas (agrupadas por urgencia)</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Sin resultados para esta búsqueda.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={runSearch}
            className="h-9 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            title="Volver a buscar"
          >
            Buscar
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-slate-400">
          Probá cambiar filtros y tocá <span className="font-semibold">Buscar</span> otra vez.
        </div>
      </motion.div>
    );
  }

  const otros = buckets?.otros || [];
  const anyBucket =
    (buckets?.["3_antes"]?.length || 0) +
      (buckets?.hoy?.length || 0) +
      (buckets?.["3_despues"]?.length || 0) +
      (buckets?.["7_despues"]?.length || 0) +
      (buckets?.["30_despues"]?.length || 0) >
    0;

  const optStyle = { backgroundColor: "#0b0e12", color: "#e5e7eb" };

  return (
    <motion.div
      className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-400 text-slate-950">
            <HiClock className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Alertas de cuotas (agrupadas por urgencia)</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mostrando <span className="font-semibold text-slate-50">{totalMostrado}</span> (filtradas) de{" "}
              <span className="font-semibold text-slate-50">{cuotasAVencer.length}</span> (totales)
            </p>
          </div>
        </div>

        {/* Acciones: Buscar + Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={runSearch}
            className="h-9 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            title="Actualizar búsqueda"
          >
            Buscar
          </button>

          <div className="relative">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className={[
                "h-10 pl-3 pr-10 rounded-2xl border text-sm outline-none transition",
                "border-neutral-800 bg-neutral-950 text-neutral-100",
                "focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/60",
                "appearance-none cursor-pointer",
              ].join(" ")}
              style={{ backgroundColor: "#0b0e12", color: "#e5e7eb" }}
              title="Formato de exportación"
            >
              <option value="csv" style={optStyle}>
                CSV
              </option>
              <option value="excel" style={optStyle}>
                Excel (.xls)
              </option>
              <option value="pdf" style={optStyle}>
                PDF (imprimir/guardar)
              </option>
            </select>
            <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
          </div>

          <button
            type="button"
            onClick={doExport}
            disabled={totalMostrado === 0}
            className={[
              "h-10 px-4 rounded-2xl border text-sm font-semibold transition",
              totalMostrado === 0
                ? "opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500"
                : "cursor-pointer bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200",
            ].join(" ")}
            title="Exporta los asegurados visibles (según filtros)"
          >
            Exportar asegurados
          </button>
        </div>
      </div>

      {/* ✅ FILTRO COMPAÑÍA */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-2 text-xs text-slate-300">
          <HiShieldCheck className="w-4 h-4" />
          Compañía:
        </span>

        <div className="relative">
          <select
            value={companiaSel}
            onChange={(e) => setCompaniaSel(e.target.value)}
            className={[
              "h-10 pl-3 pr-10 rounded-2xl border text-sm outline-none transition",
              "border-neutral-800 bg-neutral-950 text-neutral-100",
              "focus:ring-2 focus:ring-sky-300/60 focus:border-sky-300/60",
              "appearance-none cursor-pointer min-w-[260px]",
            ].join(" ")}
            style={{ backgroundColor: "#0b0e12", color: "#e5e7eb" }}
            title="Filtrar por compañía"
          >
            <option value="ALL" style={optStyle}>
              Todas las compañías ({companiaSel === "ALL" ? listAll.length : companiasMeta.total})
            </option>
            {companiasMeta.options.map((o) => (
              <option key={o.key} value={o.key} style={optStyle}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
          <HiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
        </div>

        {companiaSel !== "ALL" && (
          <button
            type="button"
            onClick={() => setCompaniaSel("ALL")}
            className="h-10 px-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-100 text-sm cursor-pointer"
            title="Quitar filtro de compañía"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ✅ CHIPS OFICINA CON ESCUDO BLINDADO */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-2 text-xs text-slate-300">
          <HiOfficeBuilding className="w-4 h-4" />
          Oficina:
        </span>

        {isWebAdmin ? (
          FILTERS.map((f) => {
            const active = oficinaSel === f.key;
            const count = conteosOficina?.[f.key] ?? 0;
            const disabled = f.key !== "ALL" && count === 0;

            return (
              <motion.button
                key={f.key}
                type="button"
                whileHover={!disabled ? { scale: 1.03 } : undefined}
                whileTap={!disabled ? { scale: 0.98 } : undefined}
                onClick={() => {
                  if (disabled) return;
                  setOficinaSel(f.key);
                }}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition backdrop-blur-md",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  f.ring,
                  active ? f.active : f.inactive,
                  disabled ? "opacity-35 cursor-not-allowed hover:scale-100" : "cursor-pointer",
                ].join(" ")}
              >
                <span className="font-semibold">{f.label}</span>
                <span
                  className={[
                    "ml-1 inline-flex min-w-[28px] justify-center rounded-xl px-2 py-0.5 text-xs font-semibold",
                    active ? f.badgeActive : f.badgeInactive,
                  ].join(" ")}
                >
                  {count}
                </span>
              </motion.button>
            );
          })
        ) : (
          // 🚀 Si no es admin, mostramos solo su oficina fija como un badge
          <div className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition backdrop-blur-md border-slate-600 bg-slate-800 text-slate-300">
            <span className="font-semibold">{getFilterMeta(oficinaSel).label}</span>
            <span className="ml-1 inline-flex min-w-[28px] justify-center rounded-xl px-2 py-0.5 text-xs font-semibold bg-slate-950/30 text-emerald-100">
              {conteosOficina?.[oficinaSel] ?? 0}
            </span>
          </div>
        )}
      </div>

      {/* Buckets */}
      <div className="space-y-5">
        <BucketSection bucket={BUCKETS[0]} items={buckets?.["3_antes"]} />
        <BucketSection bucket={BUCKETS[1]} items={buckets?.hoy} />
        <BucketSection bucket={BUCKETS[2]} items={buckets?.["3_despues"]} />
        <BucketSection bucket={BUCKETS[3]} items={buckets?.["7_despues"]} />
        <BucketSection bucket={BUCKETS[4]} items={buckets?.["30_despues"]} />

        {otros.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-medium text-slate-200">
                  Otros <span className="text-slate-300 font-normal">({otros.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cuotas que no entran en los grupos principales
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {otros.map(({ cuota, dias }) => (
                <CuotaAlertaCard key={cuota.id} cuota={cuota} dias={dias} />
              ))}
            </div>
          </div>
        )}

        {!anyBucket && totalMostrado === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-slate-400">
            No hay alertas para <span className="font-semibold">{getFilterMeta(oficinaSel).label}</span>
            {companiaSel !== "ALL" ? (
              <>
                {" "}
                en{" "}
                <span className="font-semibold">
                  {companiasMeta.options.find((o) => o.key === companiaSel)?.label || "la compañía seleccionada"}
                </span>
              </>
            ) : null}
            .
          </div>
        )}
      </div>
    </motion.div>
  );
}