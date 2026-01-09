// src/pages/RenovacionesPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import toast from "react-hot-toast";
import {
  HiRefresh,
  HiSearch,
  HiX,
  HiClipboardCheck,
  HiArrowRight,
  HiExclamation,
} from "react-icons/hi";

import {
  fetchRenovaciones,
  renovarPoliza,
  fetchRenovacionesOficinas,
  selectRenovacionesItems,
  selectRenovacionesStatus,
  selectRenovacionesError,
  selectRenovacionesCount,
  selectRenovacionesOficinas,
  selectRenovacionesOficinasStatus,
  selectRenovacionesOficinasError,
} from "../store/slices/renovacionesSlice";

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
  if (n <= 3) return "yellow";
  if (n <= 7) return "blue";
  return "neutral";
}

// =====================
// Modal renovar
// =====================
function RenovacionModal({ open, item, onClose, onSubmit, submitting }) {
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevaCompania, setNuevaCompania] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");

  useEffect(() => {
    if (!open) return;

    setNuevoNumero(item?.numero_poliza || "");
    setNuevaCompania(item?.compania || "");
    setNuevoPrecio(
      item?.precio_cuota != null && item?.precio_cuota !== ""
        ? String(item?.precio_cuota)
        : ""
    );

    const base = pickVtoRef(item) || item?.primer_pago || null;
    setNuevaFecha(base ? dayjs(base).format("YYYY-MM-DD") : "");
  }, [open, item]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl"
          initial={{ y: 18, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <div className="text-lg font-extrabold text-white">
                Renovar póliza
              </div>
              <div className="mt-1 text-sm text-white/80">
                {item?.patente ? (
                  <>
                    <span className="font-semibold text-white">
                      {item.patente}
                    </span>{" "}
                    · {item?.cliente?.apellido}, {item?.cliente?.nombre}
                  </>
                ) : (
                  <>
                    {item?.cliente?.apellido}, {item?.cliente?.nombre}
                  </>
                )}
              </div>
            </div>

            <button
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
              onClick={onClose}
              disabled={submitting}
              title="Cerrar"
            >
              <HiX />
            </button>
          </div>

          <div className="grid gap-3 p-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">
                Nuevo número (opcional)
              </label>
              <input
                value={nuevoNumero}
                onChange={(e) => setNuevoNumero(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                placeholder="Ej: 12345-ABC"
              />
              <div className="text-xs text-white/60">
                Si existe, el backend lo hace único (agrega sufijo -R1, -R2…).
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/90">
                Nueva compañía (opcional)
              </label>
              <input
                value={nuevaCompania}
                onChange={(e) => setNuevaCompania(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                placeholder="Ej: RUS / SANCOR / etc."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/90">
                  Nuevo precio cuota (opcional)
                </label>
                <input
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                  placeholder="Ej: 12000"
                  inputMode="decimal"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/90">
                  Nueva fecha (primer pago)
                </label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div className="mt-2 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
              <button
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/15"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </button>

              <button
                className={cx(
                  "rounded-xl px-4 py-2 font-extrabold text-black",
                  submitting
                    ? "bg-white/40"
                    : "bg-emerald-300 hover:bg-emerald-200"
                )}
                disabled={submitting}
                onClick={() =>
                  onSubmit({
                    nuevoNumero: (nuevoNumero || "").trim() || undefined,
                    nuevaCompania: (nuevaCompania || "").trim() || undefined,
                    nuevoPrecio:
                      nuevoPrecio === "" ? undefined : Number(nuevoPrecio),
                    nuevaFecha: nuevaFecha || undefined,
                  })
                }
              >
                {submitting ? "Procesando..." : "Renovar"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =====================
// Page
// =====================
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

  const [dias, setDias] = useState(30);
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("vto_referencia");
  const [oficina, setOficina] = useState("");

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // token para forzar reload al aplicar filtros aunque page=1
  const [filtersToken, setFiltersToken] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loading = status === "loading";

  // ✅ cargar oficinas UNA vez (cacheado en slice)
  useEffect(() => {
    dispatch(fetchRenovacionesOficinas());
  }, [dispatch]);

  const oficinasOptions = useMemo(() => {
    const arr = Array.isArray(oficinas) ? oficinas : [];
    return ["", ...arr];
  }, [oficinas]);

  const load = useCallback(
    async (opts = {}) => {
      const payload = {
        dias,
        solo_pendientes: soloPendientes,
        search: (search || "").trim(),
        ordering: ordering || "",
        oficina: oficina || undefined,
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
    [dias, soloPendientes, search, ordering, oficina, page, pageSize, dispatch]
  );

  useEffect(() => {
    load();
  }, [load, page, pageSize, filtersToken]);

  const filtered = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const q = (search || "").trim().toLowerCase();
    if (!q) return arr;

    return arr.filter((p) => {
      const cliente =
        `${p?.cliente?.apellido || ""} ${p?.cliente?.nombre || ""}`.toLowerCase();
      const patente = (p?.patente || "").toLowerCase();
      const numero = (p?.numero_poliza || "").toLowerCase();
      const compania = (p?.compania || "").toLowerCase();
      const ofi = (p?.oficina || "").toLowerCase();
      return (
        cliente.includes(q) ||
        patente.includes(q) ||
        numero.includes(q) ||
        compania.includes(q) ||
        ofi.includes(q)
      );
    });
  }, [items, search]);

  const counters = useMemo(() => {
    const arr = filtered;
    const total = arr.length;
    const urgentes = arr.filter((x) => {
      const d = x?.dias_para_vencer_poliza;
      return d != null && Number(d) <= 3;
    }).length;
    return { total, urgentes };
  }, [filtered]);

  const openModal = (item) => {
    setSelected(item);
    setModalOpen(true);
  };

  const handleSubmitModal = async (payload) => {
    if (!selected?.id) return;
    setSubmitting(true);

    try {
      const res = await dispatch(
        renovarPoliza({ id: selected.id, payload })
      ).unwrap();

      const nuevaId = res?.data?.id;

      toast.success("Póliza renovada ✅");

      setModalOpen(false);
      setSelected(null);

      if (nuevaId) {
        navigate(`/polizas/${nuevaId}`);
        return;
      }

      await load({ force: true });
    } catch (e) {
      toast.error(e?.message || "No se pudo renovar");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = Number(count || 0);
  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  const from = totalCount ? (safePage - 1) * pageSize + 1 : 0;
  const to = totalCount ? Math.min(safePage * pageSize, totalCount) : 0;

  const canPrev = safePage > 1;
  const canNext = totalCount ? safePage < totalPages : filtered.length === pageSize;

  const applyFilters = () => {
    setPage(1);
    setFiltersToken((t) => t + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-3 md:p-6">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xl font-extrabold text-white">Renovaciones</div>
            <div className="mt-1 text-sm text-white/75">
              Bandeja operativa ·{" "}
              <span className="text-white/60">Total backend: {totalCount || 0}</span>
              {!!totalCount && (
                <span className="text-white/60"> · Mostrando: {from}-{to}</span>
              )}
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Visible (página): {counters.total}</Badge>
            <Badge tone="red">Urgentes ≤ 3d: {counters.urgentes}</Badge>

            <button
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              onClick={() => load({ force: true })}
              disabled={loading}
            >
              <HiRefresh className={loading ? "animate-spin" : ""} />
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-white/90">Días</label>
            <input
              value={dias}
              onChange={(e) => setDias(Number(e.target.value || 0))}
              type="number"
              min={0}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-white/90">
              Solo pendientes
            </label>
            <button
              className={cx(
                "w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold",
                soloPendientes
                  ? "border-emerald-400/30 bg-emerald-300/15 text-emerald-50"
                  : "border-white/10 bg-white/10 text-white hover:bg-white/15"
              )}
              onClick={() => setSoloPendientes((v) => !v)}
            >
              {soloPendientes ? "✅ Sí" : "No"}
            </button>
          </div>

          {/* Oficina */}
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-white/90">Oficina</label>
            <select
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
            >
              <option value="" className="bg-slate-900 text-white">
                Todas
              </option>
              {oficinasOptions
                .filter((o) => o)
                .map((o) => (
                  <option key={o} value={o} className="bg-slate-900 text-white">
                    {o}
                  </option>
                ))}
            </select>
            <div className="text-[11px] text-white/55">
              {oficinasStatus === "loading"
                ? "Cargando oficinas..."
                : "Oficinas cargadas desde backend (no depende del paginado)."}
            </div>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs font-semibold text-white/90">Buscar</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
              <HiSearch className="text-white/70" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-white outline-none"
                placeholder="Asegurado, patente, número, compañía..."
              />
              {!!search && (
                <button
                  className="rounded-lg p-1 text-white/80 hover:bg-white/10"
                  onClick={() => setSearch("")}
                  title="Limpiar"
                >
                  <HiX />
                </button>
              )}
            </div>
          </div>

          {/* Orden */}
          <div className="grid gap-2 md:col-span-3">
            <label className="text-xs font-semibold text-white/90">Orden</label>
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
            >
              <option value="vto_referencia" className="bg-slate-900 text-white">
                Vto referencia (asc)
              </option>
              <option value="-vto_referencia" className="bg-slate-900 text-white">
                Vto referencia (desc)
              </option>
              <option value="fecha_vencimiento" className="bg-slate-900 text-white">
                Vto póliza (asc)
              </option>
              <option value="-fecha_vencimiento" className="bg-slate-900 text-white">
                Vto póliza (desc)
              </option>
              <option value="id" className="bg-slate-900 text-white">
                ID (asc)
              </option>
              <option value="-id" className="bg-slate-900 text-white">
                ID (desc)
              </option>
            </select>
          </div>

          {/* Page size */}
          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs font-semibold text-white/90">
              Tamaño página
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                const v = Number(e.target.value || 25);
                setPageSize(v);
                setPage(1);
                setFiltersToken((t) => t + 1);
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-slate-900 text-white">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              className="w-full rounded-xl bg-sky-300 px-4 py-2 text-sm font-extrabold text-black hover:bg-sky-200 disabled:opacity-70"
              onClick={applyFilters}
              disabled={loading}
            >
              Aplicar filtros
            </button>
          </div>
        </div>

        {!!error && (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/15 p-3 text-sm text-rose-50">
            <div className="flex items-start gap-2">
              <HiExclamation className="mt-0.5" />
              <div>
                <div className="font-bold">Error</div>
                <div className="opacity-90">
                  {typeof error === "string"
                    ? error
                    : JSON.stringify(error, null, 2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controles paginación */}
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-white/65">
          Página <span className="text-white/90 font-semibold">{safePage}</span>{" "}
          de <span className="text-white/90 font-semibold">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {loading && !filtered.length ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-white/80">
            Cargando bandeja...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-white/80">
            No hay pólizas para mostrar con estos filtros.
          </div>
        ) : (
          filtered.map((p) => {
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
                        {p?.patente || "SIN PATENTE"}{" "}
                        <HiArrowRight className="text-white/60" />
                      </Link>

                      <Badge tone={tone}>
                        Vto ref: {fmtDate(vtoRef)}{" "}
                        {diasVto != null ? `· ${diasVto}d` : ""}
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
                          <span className="text-white/60">N°:</span>{" "}
                          {p?.numero_poliza || "—"}
                        </span>
                        <span>
                          <span className="text-white/60">Compañía:</span>{" "}
                          {p?.compania_nombre || p?.compania || "—"}
                        </span>
                        <span>
                          <span className="text-white/60">Precio cuota:</span>{" "}
                          {p?.precio_cuota ?? "—"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/70">
                        <span>
                          <span className="text-white/60">Primer pago:</span>{" "}
                          {fmtDate(p?.primer_pago)}
                        </span>
                        <span>
                          <span className="text-white/60">Vto póliza:</span>{" "}
                          {fmtDate(p?.fecha_vencimiento)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:min-w-[220px]">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-extrabold text-black hover:bg-emerald-200 disabled:opacity-60"
                      disabled={submitting}
                      onClick={() => openModal(p)}
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
        onSubmit={handleSubmitModal}
        submitting={submitting}
      />
    </div>
  );
}
