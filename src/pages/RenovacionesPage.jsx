// src/pages/RenovacionesPage.jsx
import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import toast from "react-hot-toast";
import { HiRefresh, HiClipboardCheck, HiArrowRight, HiExclamation } from "react-icons/hi";

import {
  fetchRenovaciones,
  renovarPoliza,
  fetchRenovacionesOficinas,
  fetchRenovacionesResumen,
  fetchRenovacionesGlobalResumen, // 🚀 NUEVO THUNK
  selectRenovacionesItems,
  selectRenovacionesStatus,
  selectRenovacionesError,
  selectRenovacionesCount,
  selectRenovacionesOficinas,
  selectRenovacionesResumen,
  selectRenovacionesGlobalResumen, // 🚀 NUEVO SELECTOR
} from "../store/slices/renovacionesSlice";

import RenovacionModal from "../components/renovaciones/RenovacionModal";
import RenovacionesFiltersBar from "../components/renovaciones/RenovacionesFiltersBar";
import RenovacionesBucketsBar from "../components/renovaciones/RenovacionesBucketsBar";
import { useAuth } from "../context/AuthContext"; // 🚀 IMPORTAMOS AUTH

// 🎯 Lógica unificada de fechas/vencimientos (misma que Bajas)
import { getDiasVencida, getTonoUrgencia, fmtFecha } from "../utils/cuotas";

const cx = (...a) => a.filter(Boolean).join(" ");

const EstadoPolizaBadge = memo(function EstadoPolizaBadge({ estado }) {
  const statusStr = (estado || "desconocido").toString().toLowerCase();
  
  let config = { 
    label: statusStr.toUpperCase(), 
    clase: "border-white/20 text-white/70 bg-white/5",
    dot: "bg-white/50"
  };

  if (statusStr === "activa") {
    config = { label: "ACTIVA", clase: "border-emerald-500/60 text-emerald-300 bg-emerald-500/10", dot: "bg-emerald-400" };
  } else if (statusStr === "vencida") {
    config = { label: "VENCIDA", clase: "border-rose-500/60 text-rose-300 bg-rose-500/10", dot: "bg-rose-400 animate-pulse" };
  } else if (statusStr === "cancelada") {
    config = { label: "CANCELADA", clase: "border-gray-600 text-gray-400 bg-gray-800", dot: "bg-gray-500" };
  } else if (statusStr === "finalizada") {
    config = { label: "FINALIZADA", clase: "border-blue-500/60 text-blue-300 bg-blue-500/10", dot: "bg-blue-400" };
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${config.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
});

const Badge = ({ children, tone = "neutral" }) => {
  const map = {
    neutral: "bg-white/10 text-white border-white/15",
    green: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30",
    yellow: "bg-amber-500/15 text-amber-100 border-amber-400/30",
    red: "bg-rose-500/15 text-rose-100 border-rose-400/30",
    blue: "bg-sky-500/15 text-sky-100 border-sky-400/30",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        map[tone] || map.neutral
      )}
    >
      {children}
    </span>
  );
};

// 🎯 fmtDate y calcUrgencyTone migrados a utils/cuotas.js
// (fmtFecha y getTonoUrgencia respectivamente)
const fmtDate = fmtFecha;
const calcUrgencyTone = getTonoUrgencia;

// 🎯 Devuelve la fecha de referencia para mostrar el vencimiento de una póliza.
// Prioriza la última cuota porque es la regla unificada (misma que Bajas).
function pickVtoRef(item) {
  return (
    item?.ultima_cuota_vencimiento ||
    item?.vto_referencia ||
    item?.fecha_vencimiento ||
    item?.proxima_vencimiento_impaga ||
    null
  );
}

function getClienteNombreApellido(p) {
  const ap = p?.cliente?.apellido ?? p?.cliente_apellido ?? p?.clienteApellido ?? p?.apellido ?? "";
  const no = p?.cliente?.nombre ?? p?.cliente_nombre ?? p?.clienteNombre ?? p?.nombre ?? "";
  const full = `${ap} ${no}`.trim();
  return full || "Asegurado desconocido";
}

function getPatente(p) {
  return p?.patente || p?.vehiculo_patente || p?.vehiculo?.patente || "SIN PATENTE";
}

function getOficinaLabel(p, oficinasOptions) {
  const raw = p?.oficina;
  if (!raw) return "—";
  if (typeof raw === "object") return raw?.nombre || raw?.label || raw?.value || "—";

  const s = String(raw);
  const match = (Array.isArray(oficinasOptions) ? oficinasOptions : []).find(
    (o) => String(o?.value) === s || String(o?.label) === s
  ) || null;
  return match?.label || s;
}

function normalizeOficinaOption(x) {
  if (x == null) return null;
  if (typeof x === "string" || typeof x === "number") {
    const s = String(x).trim();
    if (!s) return null;
    return { value: s, label: s };
  }
  if (typeof x === "object") {
    const value = x.value ?? x.id ?? x.pk ?? x.codigo ?? x.key ?? x.nombre ?? x.name ?? x.label ?? "";
    const label = x.label ?? x.nombre ?? x.name ?? x.descripcion ?? x.value ?? x.id ?? "";
    const v = String(value || "").trim();
    const l = String(label || "").trim();
    if (!v && !l) return null;
    return { value: v || l, label: l || v };
  }
  return null;
}

export default function RenovacionesPage() {
  dayjs.locale("es");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth(); // 🚀 Obtenemos el usuario activo
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const items = useSelector(selectRenovacionesItems);
  const status = useSelector(selectRenovacionesStatus);
  const error = useSelector(selectRenovacionesError);
  const count = useSelector(selectRenovacionesCount);

  const oficinas = useSelector(selectRenovacionesOficinas);
  const resumen = useSelector(selectRenovacionesResumen);
  const globalResumen = useSelector(selectRenovacionesGlobalResumen) || {}; // 🚀 KPIs Globales

  // 🚀 Forzamos la oficina si no es Admin
  const [oficina, setOficina] = useState(() => {
    if (!isWebAdmin && user?.perfil?.oficina) {
      return String(user.perfil.oficina.id || user.perfil.oficina);
    }
    return localStorage.getItem("scope.renovaciones.oficina") || "";
  });

  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loading = status === "loading";

  useEffect(() => {
    dispatch(fetchRenovacionesOficinas());
  }, [dispatch]);

  const oficinasOptions = useMemo(() => {
    const arr = Array.isArray(oficinas) ? oficinas : [];
    const seen = new Map();
    const out = [];
    for (const raw of arr) {
      const opt = normalizeOficinaOption(raw);
      if (!opt) continue;
      const key = String(opt.value || "").trim();
      if (!key) continue;
      if (!seen.has(key)) {
        seen.set(key, true);
        out.push({ value: key, label: String(opt.label || key).trim() || key });
      }
    }
    out.sort((a, b) => String(a.label).localeCompare(String(b.label), "es"));
    return out;
  }, [oficinas]);

  const load = useCallback(
    async (opts = {}) => {
      const ofi = !isWebAdmin && user?.perfil?.oficina 
                  ? String(user.perfil.oficina.id || user.perfil.oficina) 
                  : (opts.oficina !== undefined ? opts.oficina : oficina);

      const payload = {
        dias: 30,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        ordering: "vto_referencia",
        oficina: ofi || undefined,
        bucket: bucket || undefined,
        page,
        page_size: pageSize,
        ...opts,
      };

      try {
        await dispatch(fetchRenovaciones(payload)).unwrap();
      } catch {}
    },
    [soloPendientes, search, oficina, bucket, page, pageSize, dispatch, isWebAdmin, user]
  );

  const loadResumen = useCallback(
    async (opts = {}) => {
      const ofi = !isWebAdmin && user?.perfil?.oficina 
                  ? String(user.perfil.oficina.id || user.perfil.oficina) 
                  : (opts.oficina !== undefined ? opts.oficina : oficina);

      const payload = {
        dias: 30,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        oficina: ofi || undefined,
        ...opts,
      };

      try {
        // 1. Carga resumen de la sucursal actual
        dispatch(fetchRenovacionesResumen(payload));
        
        // 2. Si es Admin, carga el resumen global (sin filtro de oficina)
        if (isWebAdmin) {
          dispatch(fetchRenovacionesGlobalResumen({
            dias: 30,
            solo_pendientes: soloPendientes,
            search: (search || "").trim()
          }));
        }
      } catch {}
    },
    [soloPendientes, search, oficina, dispatch, isWebAdmin, user]
  );

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadResumen(); }, [loadResumen]);

  // 🚀 Guardamos preferencia si es Admin
  useEffect(() => { 
    if (isWebAdmin) {
      localStorage.setItem("scope.renovaciones.oficina", oficina); 
    }
  }, [oficina, isWebAdmin]);

  const quickButtons = useMemo(
    () => [
      { id: "", label: "Todas", count: resumen?.buckets?.todas, tone: "neutral" },
      { id: "proximos_3", label: "Próx. 3 días", count: resumen?.buckets?.proximos_3, tone: "blue" },
      { id: "vence_hoy", label: "Hoy", count: resumen?.buckets?.vence_hoy, tone: "yellow" },
      { id: "vencidas_3", label: "Venc. 3 días", count: resumen?.buckets?.vencidas_3, tone: "red" },
      { id: "vencidas", label: "Vencidas Antiguas", count: resumen?.buckets?.vencidas, tone: "red" },
    ],
    [resumen]
  );

  // 🚀 Botones Globales
  const globalQuickButtons = useMemo(
    () => [
      { id: "", label: "Todas", count: globalResumen?.buckets?.todas, tone: "neutral" },
      { id: "proximos_3", label: "Próx. 3 días", count: globalResumen?.buckets?.proximos_3, tone: "blue" },
      { id: "vence_hoy", label: "Hoy", count: globalResumen?.buckets?.vence_hoy, tone: "yellow" },
      { id: "vencidas_3", label: "Venc. 3 días", count: globalResumen?.buckets?.vencidas_3, tone: "red" },
      { id: "vencidas", label: "Vencidas Antiguas", count: globalResumen?.buckets?.vencidas, tone: "red" },
    ],
    [globalResumen]
  );

  const counters = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const urgentes = arr.filter((x) => {
      const d = x?.dias_para_vencer_poliza;
      return d != null && Number(d) <= 3;
    }).length;
    return { urgentes };
  }, [items]);

  const totalCount = Number(count || 0);
  const receivedCount = Array.isArray(items) ? items.length : 0;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [safePage, page]);

  const applyFilters = () => {
    setPage(1);
    load({ force: true, page: 1 });
    loadResumen({ force: true });
  };

  const canPrev = safePage > 1;
  const canNext = totalCount ? safePage < totalPages : receivedCount === pageSize;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-3 md:p-6">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <HiClipboardCheck className="text-emerald-400" />
              Renovaciones y Vencimientos
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Gestioná las pólizas próximas a vencer o ya vencidas.
              {!isWebAdmin && <span className="text-sky-400 ml-2 font-bold uppercase tracking-widest text-[10px]">({user?.perfil?.oficina_nombre || "Tu Sucursal"})</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="neutral">Total filtrado: {totalCount}</Badge>
            <Badge tone="red">Urgentes (≤3d): {counters.urgentes}</Badge>

            <button
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              onClick={() => {
                load({ force: true });
                loadResumen({ force: true });
              }}
              disabled={loading}
              type="button"
            >
              <HiRefresh className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>

        <RenovacionesFiltersBar
          loading={loading}
          search={search}
          setSearch={setSearch}
          oficina={oficina}
          setOficina={setOficina}
          soloPendientes={soloPendientes}
          setSoloPendientes={setSoloPendientes}
          bucket={bucket}
          setBucket={setBucket}
          oficinasOptions={oficinasOptions}
          resumenBuckets={resumen?.buckets}
          onApply={applyFilters}
          isWebAdmin={isWebAdmin} // 🚀 Pasamos isWebAdmin para ocultarlo dentro
        />

        {/* 🚀 DOBLE FILA DE KPIs PARA EL ADMIN */}
        {isWebAdmin ? (
          <div className="flex flex-col gap-6 mt-6">
            <div>
              <h3 className="text-[11px] font-black text-sky-400/80 uppercase tracking-[0.2em] mb-3 ml-2">Métricas Globales (Toda la Empresa)</h3>
              <RenovacionesBucketsBar
                quickButtons={globalQuickButtons}
                activeBucket={bucket}
                onSelectBucket={setBucket}
                onClearBucket={() => setBucket("")}
              />
            </div>
            <div>
              <h3 className="text-[11px] font-black text-sky-400/80 uppercase tracking-[0.2em] mb-3 ml-2">Métricas por Sucursal (Según filtro actual)</h3>
              <RenovacionesBucketsBar
                quickButtons={quickButtons}
                activeBucket={bucket}
                onSelectBucket={setBucket}
                onClearBucket={() => setBucket("")}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6">
             <h3 className="text-[11px] font-black text-sky-400/80 uppercase tracking-[0.2em] mb-3 ml-2">Métricas de Tu Sucursal</h3>
             <RenovacionesBucketsBar
                quickButtons={quickButtons}
                activeBucket={bucket}
                onSelectBucket={setBucket}
                onClearBucket={() => setBucket("")}
              />
          </div>
        )}

        {!!error && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-200 flex items-center gap-2">
            <HiExclamation className="text-lg" />
            No se pudieron cargar las pólizas. Intenta actualizar.
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-white/65">
          Página <span className="text-white font-semibold">{safePage}</span> de{" "}
          <span className="text-white font-semibold">{totalPages}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-xs font-semibold text-white/50">Ver:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value || 25));
                setPage(1);
              }}
              className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
              aria-label="Tamaño de página"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-slate-900 text-white">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && receivedCount === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-white/60">
            <HiRefresh className="mx-auto h-6 w-6 animate-spin mb-2" />
            Buscando renovaciones...
          </div>
        ) : receivedCount === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-white/60">
            No se encontraron pólizas para renovar con estos filtros.
          </div>
        ) : (
          items.map((p) => {
            const vtoRef = pickVtoRef(p);
            // 🎯 Misma lógica que Bajas: días vencida = hoy − vto última cuota
            const diasVencida = getDiasVencida(p);
            // Para el tono usamos los días vencida como negativos (la urgencia
            // crece cuanto MAS vencida está)
            const tone = calcUrgencyTone(diasVencida > 0 ? -diasVencida : 0);

            const patente = getPatente(p);
            const asegurado = getClienteNombreApellido(p);
            const oficinaLabel = getOficinaLabel(p, oficinasOptions);

            return (
              <motion.div
                key={p.id}
                layoutId={`renov-${p.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 p-4 transition-all hover:bg-slate-900/80 hover:border-white/10 hover:shadow-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-400/20 to-emerald-400/20 opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">
                          Póliza
                        </span>
                        <EstadoPolizaBadge estado={p.estado} />
                      </div>
                      <div className="truncate font-mono text-sm font-bold text-white">
                        {p.numero_poliza || `ID: ${p.id}`}
                      </div>
                    </div>
                    <Badge tone={tone}>
                      Vence: {fmtDate(vtoRef)}
                      {diasVencida > 0 ? ` · vencida hace ${diasVencida}d` : ""}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-2.5">
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Cliente</div>
                      <div className="truncate text-xs font-semibold text-slate-200">
                        {asegurado || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Vehículo</div>
                      <div className="truncate text-xs font-semibold text-slate-200">
                        {patente || "—"}
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase text-slate-500">Compañía</div>
                        <div className="truncate text-xs font-medium text-slate-300">
                          {p?.compania_nombre || p?.compania || "—"}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {oficinaLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-2 border-t border-white/5 pt-3">
                  <button
                    className="flex w-full md:w-auto h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-4 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                    disabled={submitting}
                    onClick={() => {
                      setSelected(p);
                      setModalOpen(true);
                    }}
                  >
                    <HiClipboardCheck className="text-sm" />
                    Renovar
                  </button>

                  <Link
                    to={`/polizas/${p.id}`}
                    className="flex w-full md:w-auto h-9 items-center justify-center gap-1 rounded-lg border border-white/10 px-4 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    Ver detalles <HiArrowRight className="opacity-60" />
                  </Link>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <RenovacionModal
        open={modalOpen}
        item={selected}
        onClose={() => {
          if (submitting) return;
          setModalOpen(false);
          setSelected(null);
        }}
        onSubmit={async (payload) => {
          if (!selected?.id) return;
          setSubmitting(true);

          const finalPayload = {
            ...(payload || {}),
            transferir_grua: payload?.transferir_grua ?? payload?.transferirGrua ?? payload?.grua ?? 1,
          };

          try {
            const res = await dispatch(renovarPoliza({ id: selected.id, payload: finalPayload })).unwrap();
            const nuevaId = res?.data?.id;

            toast.success("Póliza renovada correctamente");
            setModalOpen(false);
            setSelected(null);

            if (nuevaId) {
              navigate(`/polizas/${nuevaId}`);
              return;
            }

            await load({ force: true });
            await loadResumen({ force: true });
          } catch (e) {
            toast.error(e?.message || "No se pudo renovar");
          } finally {
            setSubmitting(false);
          }
        }}
        submitting={submitting}
      />
    </div>
  );
}