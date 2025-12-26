/* src/components/pagos/CuotasAlertas.jsx — Reemplaza TODO el archivo con esta versión */
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  HiClock,
  HiExclamation,
  HiBadgeCheck,
  HiOfficeBuilding,
} from "react-icons/hi";
import { fetchCuotasAVencer } from "../../store/slices/pagosSlice";

dayjs.locale("es");

// ✅ Solo 3 oficinas + Todas
const FILTERS = [
  {
    key: "ALL",
    label: "Todas",
    active:
      "bg-gradient-to-r from-sky-300 via-cyan-300 to-blue-300 text-slate-950 border-white/30 shadow-[0_0_34px_rgba(56,189,248,0.55)]",
    inactive:
      "bg-slate-900/50 text-slate-100 border-slate-700/80 hover:border-sky-300/60 hover:shadow-[0_0_24px_rgba(56,189,248,0.25)] hover:bg-slate-900/70",
    ring: "focus-visible:ring-sky-200/80",
    badgeActive: "bg-slate-950/15 text-slate-950",
    badgeInactive: "bg-white/10 text-slate-200",
  },
  {
    key: "1",
    label: "5 esquinas (1)",
    active:
      "bg-gradient-to-r from-emerald-300 via-lime-300 to-emerald-200 text-slate-950 border-white/30 shadow-[0_0_34px_rgba(52,211,153,0.55)]",
    inactive:
      "bg-slate-900/50 text-slate-100 border-slate-700/80 hover:border-emerald-300/60 hover:shadow-[0_0_24px_rgba(52,211,153,0.25)] hover:bg-slate-900/70",
    ring: "focus-visible:ring-emerald-200/80",
    badgeActive: "bg-slate-950/15 text-slate-950",
    badgeInactive: "bg-white/10 text-slate-200",
  },
  {
    key: "2",
    label: "axion (2)",
    active:
      "bg-gradient-to-r from-cyan-300 via-teal-300 to-cyan-200 text-slate-950 border-white/30 shadow-[0_0_34px_rgba(34,211,238,0.55)]",
    inactive:
      "bg-slate-900/50 text-slate-100 border-slate-700/80 hover:border-cyan-200/60 hover:shadow-[0_0_24px_rgba(34,211,238,0.25)] hover:bg-slate-900/70",
    ring: "focus-visible:ring-cyan-100/80",
    badgeActive: "bg-slate-950/15 text-slate-950",
    badgeInactive: "bg-white/10 text-slate-200",
  },
  {
    key: "3",
    label: "kilometro 39 (3)",
    active:
      "bg-gradient-to-r from-fuchsia-300 via-pink-300 to-fuchsia-200 text-slate-950 border-white/30 shadow-[0_0_34px_rgba(232,121,249,0.55)]",
    inactive:
      "bg-slate-900/50 text-slate-100 border-slate-700/80 hover:border-fuchsia-200/60 hover:shadow-[0_0_24px_rgba(232,121,249,0.25)] hover:bg-slate-900/70",
    ring: "focus-visible:ring-fuchsia-200/80",
    badgeActive: "bg-slate-950/15 text-slate-950",
    badgeInactive: "bg-white/10 text-slate-200",
  },
];

const getFilterMeta = (key) => FILTERS.find((f) => f.key === key) || FILTERS[0];

const oficinaLabelFromKey = (k) => {
  if (k === "1") return "5 esquinas (1)";
  if (k === "2") return "axion (2)";
  if (k === "3") return "kilometro 39 (3)";
  return "Sin oficina";
};

/** Extrae un valor “raw” de oficina desde varios posibles campos */
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
 * (muy tolerante: reconoce OFI1/OFI 1, (1), "5 esquinas", "axion", "km 39", etc.)
 */
const normalizeOficina3 = (raw) => {
  const s0 = String(raw ?? "").trim();
  if (!s0) return "";

  const up = s0.toUpperCase();

  // directos
  if (s0 === "1" || s0 === "2" || s0 === "3") return s0;

  // OFI1 / OFI 1 / OFI-1
  if (/\bOFI\s*[-_]*\s*1\b/.test(up) || /\bOFI1\b/.test(up)) return "1";
  if (/\bOFI\s*[-_]*\s*2\b/.test(up) || /\bOFI2\b/.test(up)) return "2";
  if (/\bOFI\s*[-_]*\s*3\b/.test(up) || /\bOFI3\b/.test(up)) return "3";

  // "(1)" etc
  if ((/\(1\)/.test(up) || /\b1\b/.test(up)) && /ESQUINAS/.test(up)) return "1";
  if (/\(2\)/.test(up) || /AXION/.test(up)) return "2";
  if (/\(3\)/.test(up) || /KILOMETRO\s*39/.test(up) || /\bKM\s*39\b/.test(up))
    return "3";

  // nombres amigables (por si vienen sin (n))
  if (/5\s*ESQUINAS/.test(up)) return "1";
  if (/AXION/.test(up)) return "2";
  if (/KILOMETRO\s*39/.test(up) || /\bKM\s*39\b/.test(up)) return "3";

  return "";
};

/** Devuelve metadata visual según vencimiento */
function getAlertaMeta(fechaStr) {
  const hoy = dayjs().startOf("day");
  const fv = dayjs(fechaStr);

  if (!fv.isValid()) {
    return {
      label: "Fecha inválida",
      classes: "bg-neutral-400/20 border-neutral-300/30 text-neutral-100",
      icon: HiExclamation,
    };
  }

  if (fv.isBefore(hoy)) {
    return {
      label: `Vencida hace ${hoy.diff(fv, "day")} días`,
      classes: "bg-rose-500/10 border-rose-500/30 text-rose-100",
      icon: HiExclamation,
    };
  }

  if (fv.isSame(hoy)) {
    return {
      label: "Vence hoy",
      classes: "bg-cyan-500/10 border-cyan-500/30 text-cyan-100",
      icon: HiClock,
    };
  }

  return {
    label: `Vence en ${fv.diff(hoy, "day")} días`,
    classes: "bg-amber-500/10 border-amber-500/30 text-amber-100",
    icon: HiClock,
  };
}

/**
 * Props opcionales (modo controlado):
 * - oficina: "ALL" | "1" | "2" | "3"
 * - onOficinaChange(bucket)
 */
export default function CuotasAlertas({ oficina, onOficinaChange }) {
  const dispatch = useDispatch();
  const { cuotasAVencer, status, error } = useSelector((s) => s.pagos);

  const [oficinaSelInternal, setOficinaSelInternal] = useState("ALL");
  const oficinaSel = oficina ?? oficinaSelInternal;
  const setOficinaSel = onOficinaChange ?? setOficinaSelInternal;

  useEffect(() => {
    dispatch(fetchCuotasAVencer());
  }, [dispatch]);

  const conteos = useMemo(() => {
    const list = Array.isArray(cuotasAVencer) ? cuotasAVencer : [];
    const c = { ALL: list.length, "1": 0, "2": 0, "3": 0 };

    for (const cuota of list) {
      const raw = extractRawOficina(cuota);
      const b = normalizeOficina3(raw);
      if (b) c[b] += 1;
    }

    return c;
  }, [cuotasAVencer]);

  const cuotasFiltradas = useMemo(() => {
    const list = Array.isArray(cuotasAVencer) ? cuotasAVencer : [];
    if (!oficinaSel || oficinaSel === "ALL") return list;

    return list.filter((cuota) => {
      const raw = extractRawOficina(cuota);
      return normalizeOficina3(raw) === oficinaSel;
    });
  }, [cuotasAVencer, oficinaSel]);

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

  if (!cuotasAVencer || cuotasAVencer.length === 0) return null;

  return (
    <motion.div
      className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_0_30px_rgba(15,23,42,0.55)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-400 text-slate-950">
          <HiClock className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">
            Alertas de cuotas por vencer / vencidas
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Mostrando{" "}
            <span className="font-semibold text-slate-50">
              {cuotasFiltradas.length}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-50">
              {cuotasAVencer.length}
            </span>
          </p>
        </div>
      </div>

      {/* Chips brillantes */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-2 text-xs text-slate-300">
          <HiOfficeBuilding className="w-4 h-4" />
          Oficina:
        </span>

        {FILTERS.map((f) => {
          const active = oficinaSel === f.key;
          const count = conteos?.[f.key] ?? 0;
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
                disabled
                  ? "opacity-35 cursor-not-allowed hover:scale-100"
                  : "cursor-pointer",
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
        })}
      </div>

      {cuotasFiltradas.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-slate-200">
          No hay alertas para{" "}
          <span className="font-semibold">{getFilterMeta(oficinaSel).label}</span>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {cuotasFiltradas.map((cuota) => {
            const meta = getAlertaMeta(cuota.fecha_vencimiento);
            const Icon = meta.icon || HiClock;

            const rawOfi = extractRawOficina(cuota);
            const ofiNorm = normalizeOficina3(rawOfi);

            // ✅ NUEVO: si el backend manda oficina_nombre, mostrarla directo
            const ofiLabelFromBackend = String(cuota?.poliza?.oficina_nombre || "").trim();
            const ofiLabel =
              ofiLabelFromBackend ||
              (ofiNorm ? oficinaLabelFromKey(ofiNorm) : "Sin oficina");

            return (
              <motion.div
                key={cuota.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`rounded-2xl border p-4 ${meta.classes}`}
              >
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/10">
                      <Icon className="w-4 h-4" />
                    </span>
                    <p className="font-medium">{meta.label}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
                      <HiOfficeBuilding className="w-4 h-4" />
                      {ofiLabel}
                    </span>
                  </div>

                  <p className="opacity-90">
                    <span className="font-semibold">
                      {cuota.poliza?.marca} {cuota.poliza?.modelo}
                    </span>{" "}
                    ({cuota.poliza?.patente})
                  </p>

                  <p>
                    Cuota #{cuota.cuota_nro} • $
                    {new Intl.NumberFormat("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(Number(cuota.monto || 0))}
                  </p>

                  <p>
                    Vencimiento:{" "}
                    {cuota.fecha_vencimiento
                      ? dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY")
                      : "—"}
                  </p>

                  {cuota.pagado && cuota.fecha_pago && (
                    <p className="flex items-center gap-1">
                      <HiBadgeCheck className="w-4 h-4" />
                      Pagado el: {dayjs(cuota.fecha_pago).format("DD/MM/YYYY")}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
