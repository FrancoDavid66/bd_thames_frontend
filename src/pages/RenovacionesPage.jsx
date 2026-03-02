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
  selectRenovacionesResumen,
} from "../store/slices/renovacionesSlice";

import RenovacionModal from "../components/renovaciones/RenovacionModal";
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

/* ===================== helpers robustos payload ===================== */

function getClienteNombreApellido(p) {
  const ap =
    p?.cliente?.apellido ??
    p?.cliente_apellido ??
    p?.clienteApellido ??
    p?.apellido ??
    "";
  const no =
    p?.cliente?.nombre ??
    p?.cliente_nombre ??
    p?.clienteNombre ??
    p?.nombre ??
    "";
  const full = `${ap} ${no}`.trim();
  return full || "Asegurado desconocido";
}

function getPatente(p) {
  return p?.patente || p?.vehiculo_patente || p?.vehiculo?.patente || "SIN PATENTE";
}

function getOficinaLabel(p, oficinasOptions) {
  const raw = p?.oficina;
  if (!raw) return "—";

  if (typeof raw === "object") {
    return raw?.nombre || raw?.label || raw?.value || "—";
  }

  const s = String(raw);
  const match =
    (Array.isArray(oficinasOptions) ? oficinasOptions : []).find(
      (o) => String(o?.value) === s || String(o?.label) === s
    ) || null;

  return match?.label || s;
}

/* ✅ Normaliza oficinas del slice (strings/objects) a [{value,label}] */
function normalizeOficinaOption(x) {
  if (x == null) return null;

  if (typeof x === "string" || typeof x === "number") {
    const s = String(x).trim();
    if (!s) return null;
    return { value: s, label: s };
  }

  if (typeof x === "object") {
    const value =
      x.value ??
      x.id ??
      x.pk ??
      x.codigo ??
      x.key ??
      x.nombre ??
      x.name ??
      x.label ??
      "";
    const label =
      x.label ??
      x.nombre ??
      x.name ??
      x.descripcion ??
      x.value ??
      x.id ??
      "";

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

  const items = useSelector(selectRenovacionesItems);
  const status = useSelector(selectRenovacionesStatus);
  const error = useSelector(selectRenovacionesError);
  const count = useSelector(selectRenovacionesCount);

  const oficinas = useSelector(selectRenovacionesOficinas);
  const resumen = useSelector(selectRenovacionesResumen);

  // Estados de Filtros unificados
  const [search, setSearch] = useState("");
  const [oficina, setOficina] = useState("");
  const [bucket, setBucket] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(true);

  // Paginación
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
      const payload = {
        dias: 30,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        ordering: "vto_referencia",
        oficina: oficina || undefined,
        bucket: bucket || undefined,
        page,
        page_size: pageSize,
        ...opts,
      };

      try {
        await dispatch(fetchRenovaciones(payload)).unwrap();
      } catch {}
    },
    [soloPendientes, search, oficina, bucket, page, pageSize, dispatch]
  );

  const loadResumen = useCallback(
    async (opts = {}) => {
      const payload = {
        dias: 30,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        oficina: oficina || undefined,
        ...opts,
      };

      try {
        await dispatch(fetchRenovacionesResumen(payload)).unwrap();
      } catch {}
    },
    [soloPendientes, search, oficina, dispatch]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

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
            <h1 className="text-2xl font-extrabold text-white">Renovaciones</h1>
            <p className="mt-1 text-sm text-white/60">
              Gestioná las pólizas próximas a vencer o ya vencidas.
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
        />

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

      <div className="grid gap-3">
        {loading && receivedCount === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            <HiRefresh className="mx-auto h-6 w-6 animate-spin mb-2" />
            Buscando renovaciones...
          </div>
        ) : receivedCount === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            No se encontraron pólizas para renovar con estos filtros.
          </div>
        ) : (
          items.map((p) => {
            const vtoRef = pickVtoRef(p);
            const diasVto = p?.dias_para_vencer_poliza;
            const tone = calcUrgencyTone(diasVto);

            const patente = getPatente(p);
            const asegurado = getClienteNombreApellido(p);
            const oficinaLabel = getOficinaLabel(p, oficinasOptions);

            return (
              <motion.div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-lg transition-colors hover:bg-white/[0.12]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Link
                        to={`/polizas/${p.id}`}
                        className="inline-flex items-center gap-2 text-lg font-black text-sky-300 hover:text-sky-200 transition-colors"
                        title={`${patente} — ${asegurado}`}
                      >
                        {patente} <HiArrowRight className="opacity-60" />
                      </Link>

                      <Badge tone={tone}>
                        Vence: {fmtDate(vtoRef)} {diasVto != null ? `(${diasVto}d)` : ""}
                      </Badge>

                      <Badge tone="neutral">Oficina: {oficinaLabel}</Badge>
                    </div>

                    <div className="grid gap-1.5 text-sm text-white/80">
                      <div className="truncate">
                        <span className="text-white/50">Asegurado:</span>{" "}
                        <span className="font-semibold text-white">{asegurado}</span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          <span className="text-white/50">N° Póliza:</span> {p?.numero_poliza || "—"}
                        </span>
                        <span>
                          <span className="text-white/50">Compañía:</span>{" "}
                          <span className="font-medium text-amber-200">
                            {p?.compania_nombre || p?.compania || "—"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:min-w-[200px]">
                    <button
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-emerald-300 transition-colors shadow-sm shadow-emerald-500/20 disabled:opacity-60"
                      disabled={submitting}
                      onClick={() => {
                        setSelected(p);
                        setModalOpen(true);
                      }}
                    >
                      <HiClipboardCheck className="text-lg" />
                      Renovar Póliza
                    </button>

                    <Link
                      to={`/polizas/${p.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                    >
                      Ver detalles
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