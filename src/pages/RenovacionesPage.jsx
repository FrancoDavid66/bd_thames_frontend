// src/pages/RenovacionesPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
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
  selectRenovacionesItems,
  selectRenovacionesStatus,
  selectRenovacionesError,
  selectRenovacionesCount,
  selectRenovacionesOficinas,
  selectRenovacionesOficinasStatus,
  selectRenovacionesOficinasError,
  selectRenovacionesResumen,
  selectRenovacionesResumenStatus,
  selectRenovacionesResumenError,
} from "../store/slices/renovacionesSlice";

import RenovacionModal from "../components/renovaciones/RenovacionModal";
import RenovacionesBucketsBar from "../components/renovaciones/RenovacionesBucketsBar";
import RenovacionesFiltersBar from "../components/renovaciones/RenovacionesFiltersBar";

const cx = (...a) => a.filter(Boolean).join(" ");

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
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold",
        map[tone] || map.neutral
      )}
    >
      {children}
    </span>
  );
};

function fmtDate(d) {
  if (!d) return "—";
  try {
    return dayjs(d).format("DD/MM/YYYY");
  } catch {
    return String(d);
  }
}

function pickVtoRef(item) {
  return (
    item?.vto_referencia ||
    item?.ultima_cuota_vencimiento ||
    item?.fecha_vencimiento ||
    item?.proxima_vencimiento_impaga ||
    null
  );
}

function calcUrgencyTone(dias) {
  if (dias == null || Number.isNaN(Number(dias))) return "neutral";
  const n = Number(dias);
  if (n < 0) return "red";
  if (n === 0) return "yellow";
  if (n <= 3) return "yellow";
  if (n <= 7) return "blue";
  return "neutral";
}

export default function RenovacionesPage() {
  dayjs.locale("es");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = useSelector(selectRenovacionesItems);
  const status = useSelector(selectRenovacionesStatus);
  const error = useSelector(selectRenovacionesError);
  const count = useSelector(selectRenovacionesCount);

  const oficinas = useSelector(selectRenovacionesOficinas);
  const oficinasStatus = useSelector(selectRenovacionesOficinasStatus);
  const oficinasError = useSelector(selectRenovacionesOficinasError);

  const resumen = useSelector(selectRenovacionesResumen);
  const resumenStatus = useSelector(selectRenovacionesResumenStatus);
  const resumenError = useSelector(selectRenovacionesResumenError);

  // UI (draft)
  const [uiDias, setUiDias] = useState(30);
  const [uiFechaBase, setUiFechaBase] = useState("");
  const [uiSoloPendientes, setUiSoloPendientes] = useState(true);
  const [uiSearch, setUiSearch] = useState("");
  const [uiOficina, setUiOficina] = useState("");

  // Aplicados
  const [dias, setDias] = useState(30);
  const [fechaBase, setFechaBase] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [search, setSearch] = useState("");
  const [oficina, setOficina] = useState("");
  const [bucket, setBucket] = useState("");

  // paginación
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
    return arr.filter((o) => o && o.value && o.label);
  }, [oficinas]);

  const oficinaLabelAplicada = useMemo(() => {
    if (!oficina) return "Todas las oficinas";
    const found = oficinasOptions.find((o) => String(o.value) === String(oficina));
    return found?.label || String(oficina);
  }, [oficina, oficinasOptions]);

  const baseCalculoLabel = useMemo(() => {
    const h = resumen?.hoy || (fechaBase ? fechaBase : null);
    return h ? fmtDate(h) : fmtDate(dayjs().format("YYYY-MM-DD"));
  }, [resumen?.hoy, fechaBase]);

  const load = useCallback(
    async (opts = {}) => {
      const payload = {
        dias,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        ordering: "vto_referencia", // ✅ fijo (se entiende y es el que querés)
        oficina: oficina || undefined,
        bucket: bucket || undefined,
        fecha: (fechaBase || "").trim() || undefined,
        page,
        page_size: pageSize,
        ...opts,
      };

      try {
        await dispatch(fetchRenovaciones(payload)).unwrap();
      } catch {
        // error queda en state
      }
    },
    [dias, fechaBase, soloPendientes, search, oficina, bucket, page, pageSize, dispatch]
  );

  const loadResumen = useCallback(
    async (opts = {}) => {
      const payload = {
        dias,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        oficina: oficina || undefined,
        fecha: (fechaBase || "").trim() || undefined,
        ...opts,
      };

      try {
        await dispatch(fetchRenovacionesResumen(payload)).unwrap();
      } catch {
        // error queda en state
      }
    },
    [dias, fechaBase, soloPendientes, search, oficina, dispatch]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  const counters = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const total = arr.length;
    const urgentes = arr.filter((x) => {
      const d = x?.dias_para_vencer_poliza;
      return d != null && Number(d) <= 3;
    }).length;
    return { total, urgentes };
  }, [items]);

  const totalCount = Number(count || 0);
  const receivedCount = Array.isArray(items) ? items.length : 0;

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const from = totalCount ? (safePage - 1) * pageSize + 1 : 0;
  const to = totalCount ? Math.min(safePage * pageSize, totalCount) : 0;

  const canPrev = safePage > 1;
  const canNext = totalCount ? safePage < totalPages : receivedCount === pageSize;

  const applyFilters = () => {
    setPage(1);
    setDias(Number(uiDias || 0));
    setFechaBase((uiFechaBase || "").trim());
    setSoloPendientes(!!uiSoloPendientes);
    setSearch((uiSearch || "").trim());
    setOficina(uiOficina || "");
    // bucket queda como estaba
  };

  const onSelectBucket = (b) => {
    setBucket(b || "");
    setPage(1);
  };

  const onClearBucket = () => {
    setBucket("");
    setPage(1);
  };

  const resumenBuckets = resumen?.buckets || {};
  const pendientesVentana = Number(resumen?.pendientes_ventana || 0);

  const allVencidasCount = useMemo(() => {
    const v3 = Number(resumenBuckets?.vencidas_3 || 0);
    const v4 = Number(resumenBuckets?.vencidas_4_mas || 0);
    return v3 + v4;
  }, [resumenBuckets]);

  const quickButtons = useMemo(() => {
    return [
      { id: "", label: "Todos", tone: "neutral", count: pendientesVentana, title: "Sin filtro rápido" },

      { id: "hoy", label: "Hoy", tone: "yellow", count: Number(resumenBuckets?.vence_hoy || 0), title: "Vence hoy" },
      { id: "en_1", label: "+1", tone: "blue", count: Number(resumenBuckets?.vence_en_1 || 0), title: "Vence mañana" },
      { id: "en_2", label: "+2", tone: "blue", count: Number(resumenBuckets?.vence_en_2 || 0), title: "Vence en 2 días" },
      { id: "en_3", label: "+3", tone: "blue", count: Number(resumenBuckets?.vence_en_3 || 0), title: "Vence en 3 días" },
      { id: "proximos_3", label: "Próx 3", tone: "blue", count: Number(resumenBuckets?.proximos_3 || 0), title: "Vence entre hoy y +3" },

      { id: "vencida_1", label: "-1", tone: "red", count: Number(resumenBuckets?.vencida_1 || 0), title: "Venció ayer" },
      { id: "vencida_2", label: "-2", tone: "red", count: Number(resumenBuckets?.vencida_2 || 0), title: "Venció hace 2 días" },
      { id: "vencida_3", label: "-3", tone: "red", count: Number(resumenBuckets?.vencida_3 || 0), title: "Venció hace 3 días" },

      { id: "vencidas_3", label: "Vencidas ≤3", tone: "red", count: Number(resumenBuckets?.vencidas_3 || 0), title: "Vencidas 1..3 días" },
      { id: "vencidas", label: "Vencidas 4+", tone: "red", count: Number(resumenBuckets?.vencidas_4_mas || 0), title: "Vencidas 4+ días" },

      { id: "__all_vencidas__", label: "Vencidas (todas)", tone: "red", count: allVencidasCount, title: "Solo informativo", disabled: true },
    ];
  }, [resumenBuckets, pendientesVentana, allVencidasCount]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-3 md:p-6">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xl font-extrabold text-white">Renovaciones</div>

            <div className="mt-1 text-sm text-white/75">
              Bandeja operativa ·{" "}
              <span className="text-white/60">Total backend: {totalCount || 0}</span>
              <span className="text-white/60"> · Recibidos (página): {receivedCount}</span>
              {!!totalCount && <span className="text-white/60"> · Mostrando: {from}-{to}</span>}
            </div>

            <div className="mt-1 text-xs text-white/55">
              Base de cálculo:{" "}
              <span className="text-white/80 font-semibold">{baseCalculoLabel}</span>{" "}
              · Oficina:{" "}
              <span className="text-white/80 font-semibold">{oficinaLabelAplicada}</span>
            </div>

            {(oficinasStatus === "failed" || oficinasError) && (
              <div className="mt-2 text-xs text-rose-200/90">
                No se pudieron cargar oficinas:{" "}
                {typeof oficinasError === "string"
                  ? oficinasError
                  : oficinasError
                  ? JSON.stringify(oficinasError)
                  : ""}
              </div>
            )}

            {resumenStatus === "failed" && (
              <div className="mt-2 text-xs text-amber-200/90">
                No se pudo cargar el resumen:{" "}
                {typeof resumenError === "string"
                  ? resumenError
                  : resumenError
                  ? JSON.stringify(resumenError)
                  : ""}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Visible (página): {counters.total}</Badge>
            <Badge tone="red">Urgentes ≤ 3d: {counters.urgentes}</Badge>

            <button
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              onClick={() => {
                load({ force: true });
                loadResumen({ force: true });
              }}
              disabled={loading}
              type="button"
            >
              <HiRefresh className={loading ? "animate-spin" : ""} />
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
        </div>

        <RenovacionesBucketsBar
          quickButtons={quickButtons}
          activeBucket={bucket}
          onSelectBucket={onSelectBucket}
          onClearBucket={onClearBucket}
        />

        <RenovacionesFiltersBar
          loading={loading}
          baseCalculoLabel={baseCalculoLabel}
          uiDias={uiDias}
          setUiDias={setUiDias}
          uiFechaBase={uiFechaBase}
          setUiFechaBase={setUiFechaBase}
          uiSoloPendientes={uiSoloPendientes}
          setUiSoloPendientes={setUiSoloPendientes}
          uiSearch={uiSearch}
          setUiSearch={setUiSearch}
          uiOficina={uiOficina}
          setUiOficina={setUiOficina}
          oficinasOptions={oficinasOptions}
          oficinasStatus={oficinasStatus}
          onApply={applyFilters}
        />

        {!!error && (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/15 p-3 text-sm text-rose-50">
            <div className="flex items-start gap-2">
              <HiExclamation className="mt-0.5" />
              <div>
                <div className="font-bold">Error</div>
                <div className="opacity-90">
                  {typeof error === "string" ? error : JSON.stringify(error, null, 2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra paginación + tamaño página */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-white/65">
          Página <span className="text-white/90 font-semibold">{safePage}</span> de{" "}
          <span className="text-white/90 font-semibold">{totalPages}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
            <span className="text-xs font-semibold text-white/70">Tamaño:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const v = Number(e.target.value || 25);
                setPageSize(v);
                setPage(1);
              }}
              className="bg-transparent text-sm font-bold text-white outline-none"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-slate-900 text-white">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            disabled={safePage <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            Anterior
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            disabled={totalCount ? safePage >= totalPages : receivedCount !== pageSize || loading}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Listado */}
      <div className="grid gap-3">
        {loading && receivedCount === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-white/80">
            Cargando bandeja...
          </div>
        ) : receivedCount === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-white/80">
            No hay pólizas para mostrar con estos filtros.
          </div>
        ) : (
          items.map((p) => {
            const vtoRef = pickVtoRef(p);
            const diasVto = p?.dias_para_vencer_poliza;
            const tone = calcUrgencyTone(diasVto);

            return (
              <motion.div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 shadow-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/polizas/${p.id}`}
                        className="inline-flex items-center gap-2 text-base font-extrabold text-white hover:underline"
                      >
                        {p?.patente || "SIN PATENTE"} <HiArrowRight className="text-white/60" />
                      </Link>

                      <Badge tone={tone}>
                        Vto ref: {fmtDate(vtoRef)} {diasVto != null ? `· ${diasVto}d` : ""}
                      </Badge>

                      <Badge tone="neutral">Oficina: {p?.oficina || "—"}</Badge>
                    </div>

                    <div className="mt-2 grid gap-1 text-sm text-white/85">
                      <div className="truncate">
                        <span className="text-white/60">Asegurado:</span>{" "}
                        <span className="font-semibold text-white">
                          {p?.cliente?.apellido || ""} {p?.cliente?.nombre || ""}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/70">
                        <span>
                          <span className="text-white/60">N°:</span> {p?.numero_poliza || "—"}
                        </span>
                        <span>
                          <span className="text-white/60">Compañía:</span>{" "}
                          {p?.compania_nombre || p?.compania || "—"}
                        </span>
                        <span>
                          <span className="text-white/60">Precio cuota:</span> {p?.precio_cuota ?? "—"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/70">
                        <span>
                          <span className="text-white/60">Primer pago:</span> {fmtDate(p?.primer_pago)}
                        </span>
                        <span>
                          <span className="text-white/60">Vto póliza:</span> {fmtDate(p?.fecha_vencimiento)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:min-w-[220px]">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-extrabold text-black hover:bg-emerald-200 disabled:opacity-60"
                      disabled={submitting}
                      onClick={() => {
                        setSelected(p);
                        setModalOpen(true);
                      }}
                      type="button"
                    >
                      <HiClipboardCheck />
                      Renovar
                    </button>

                    <Link
                      to={`/polizas/${p.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      Ver detalle
                      <HiArrowRight />
                    </Link>
                  </div>
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

          try {
            const res = await dispatch(renovarPoliza({ id: selected.id, payload })).unwrap();
            const nuevaId = res?.data?.id;

            toast.success("Póliza renovada ✅");

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
