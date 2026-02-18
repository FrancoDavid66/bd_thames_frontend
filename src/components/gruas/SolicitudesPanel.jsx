// src/components/gruas/SolicitudesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiX, HiRefresh, HiEye, HiUserAdd, HiExternalLink } from "react-icons/hi";

import SolicitarGruaModal from "./SolicitarGruaModal";
import GruasAPI from "../../api/gruas";
import {
  fetchSolicitudes,
  selectSolicitudes,
  selectSolicitudesStatus,
  fetchProveedores,
  selectProveedores,
  selectProveedoresStatus,
  updateSolicitud,
} from "../../store/slices/gruasSlice";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

const ESTADOS = ["TODAS", "ABIERTA", "ASIGNADA", "EN_CAMINO", "CERRADA"];

function EstadoPill({ estado }) {
  const st = String(estado || "").toUpperCase() || "—";
  const meta =
    st === "CERRADA"
      ? "border-emerald-900 bg-emerald-950/30 text-emerald-200"
      : st === "EN_CAMINO"
      ? "border-sky-900 bg-sky-950/30 text-sky-200"
      : st === "ASIGNADA"
      ? "border-amber-900 bg-amber-950/30 text-amber-200"
      : "border-slate-800 bg-slate-900 text-slate-200";

  return <span className={classNames("text-[11px] px-2 py-1 rounded-lg border", meta)}>{st}</span>;
}

function ModalShell({ open, title, subtitle, onClose, children, footer, maxWidth = "max-w-3xl" }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            className={classNames(
              "relative w-full rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden",
              maxWidth
            )}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-slate-100">{title}</div>
                {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
              </div>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
                aria-label="Cerrar"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">{children}</div>

            {footer ? <div className="border-t border-slate-800 p-4">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function fmtDateTime(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s);
    return d.toLocaleString();
  } catch {
    return String(s);
  }
}

function safeUpper(s) {
  return String(s || "").toUpperCase();
}

function linkOrDash(url) {
  const u = String(url || "").trim();
  if (!u) return "—";
  return (
    <a
      href={u}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-slate-200 hover:underline"
      title={u}
    >
      Ver <HiExternalLink className="h-4 w-4" />
    </a>
  );
}

function PhotosGrid({ fotos }) {
  const list = Array.isArray(fotos) ? fotos : [];
  if (!list.length) return <div className="text-xs text-slate-500">Sin fotos.</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {list.map((f) => {
        const url = f?.url || f?.secure_url || f?.image_url || "";
        const id = f?.id || f?.public_id || url;
        return (
          <a
            key={id}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
            title={f?.tipo || f?.categoria || ""}
          >
            <div className="aspect-square w-full bg-slate-900">
              {url ? (
                <img
                  src={url}
                  alt={f?.tipo || "foto"}
                  className="h-full w-full object-cover group-hover:opacity-90"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="px-2 py-1 text-[10px] text-slate-400 truncate">
              {f?.tipo || f?.categoria || "foto"}
            </div>
          </a>
        );
      })}
    </div>
  );
}

/* =========================
   Helpers proveedor
========================= */
function getProveedorNombre(it) {
  const d = it?.proveedor_detalle;
  const fromDetalle = d?.nombre || d?.razon_social || d?.alias;

  const pObj = typeof it?.proveedor === "object" ? it.proveedor : null;
  const fromObj = pObj?.nombre || pObj?.razon_social || pObj?.alias;

  const id = it?.proveedor_id ?? (typeof it?.proveedor === "number" ? it.proveedor : null);

  return (fromDetalle || fromObj || (id ? `Proveedor #${id}` : "") || "—").trim();
}

function getProveedorId(it) {
  return it?.proveedor_detalle?.id ?? it?.proveedor?.id ?? it?.proveedor_id ?? (typeof it?.proveedor === "number" ? it.proveedor : null);
}

/* =========================
   API helper: enviar proveedor
========================= */
async function apiEnviarProveedor(solicitudId, payload) {
  const url = `/api/gruas/solicitudes/${solicitudId}/enviar_proveedor/`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || "No se pudo enviar";
    const err = new Error(msg);
    err.data = data;
    throw err;
  }
  return data;
}

/* =========================
   DETALLE
========================= */
function SolicitudDetailModal({ open, onClose, solicitudId }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (!solicitudId) return;

    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        setData(null);

        const res = await GruasAPI.getSolicitud(solicitudId);

        if (!alive) return;
        setData(res);
      } catch (e) {
        if (!alive) return;
        setErr(e?.data?.detail || e?.message || "Error cargando solicitud");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, solicitudId]);

  const estado = safeUpper(data?.estado);
  const cliente =
    data?.cliente_nombre ||
    data?.cliente ||
    `${data?.cliente_apellido || ""} ${data?.cliente_nombre || ""}`.trim() ||
    "—";
  const patente =
    (data?.patente || data?.vehiculo_patente || data?.poliza_patente || "").toString().toUpperCase() || "—";

  const proveedorNombre = getProveedorNombre(data);

  const fotos = data?.fotos || data?.fotos_detalle || data?.imagenes || [];
  const eventos = Array.isArray(data?.eventos) ? data.eventos : [];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Detalle solicitud #${solicitudId || "—"}`}
      subtitle={`${cliente} · Patente ${patente}`}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Estado: <span className="text-slate-200">{estado || "—"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-sm border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-20 rounded-2xl bg-slate-900/60 border border-slate-800" />
          <div className="h-20 rounded-2xl bg-slate-900/60 border border-slate-800" />
        </div>
      ) : err ? (
        <div className="text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
          {String(err)}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">
                  {cliente} · {patente}
                </div>
                <div className="text-xs text-slate-400">
                  Motivo: <span className="text-slate-200">{data?.motivo || "—"}</span>
                </div>
                {data?.notas ? (
                  <div className="text-xs text-slate-400 mt-1">
                    Notas: <span className="text-slate-200">{data?.notas}</span>
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 flex flex-col items-end gap-2">
                <EstadoPill estado={data?.estado} />
                <div className="text-[11px] text-slate-500">
                  Creada:{" "}
                  <span className="text-slate-300">{fmtDateTime(data?.creado_en || data?.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-400">Origen</div>
                <div className="text-sm text-slate-100 mt-1">{data?.origen_direccion || "—"}</div>
                <div className="text-xs text-slate-400 mt-1">{linkOrDash(data?.origen_maps_url)}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-400">Destino</div>
                <div className="text-sm text-slate-100 mt-1">{data?.destino_direccion || "—"}</div>
                <div className="text-xs text-slate-400 mt-1">{linkOrDash(data?.destino_maps_url)}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Proveedor asignado</div>
              <div className="mt-1 text-base sm:text-lg font-semibold text-slate-100 truncate">{proveedorNombre}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-sm font-semibold text-slate-100">Fotos</div>
            <div className="mt-2">
              <PhotosGrid fotos={fotos} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-sm font-semibold text-slate-100">Eventos</div>
            {eventos.length ? (
              <div className="mt-2 space-y-2">
                {eventos.map((ev) => (
                  <div
                    key={ev?.id || `${ev?.tipo}-${ev?.creado_en}-${Math.random()}`}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-300">{safeUpper(ev?.tipo) || "EVENTO"}</div>
                      <div className="text-[11px] text-slate-500">{fmtDateTime(ev?.creado_en)}</div>
                    </div>
                    {ev?.detalle ? <div className="mt-1 text-xs text-slate-400">{String(ev.detalle)}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">Sin eventos.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500">—</div>
      )}
    </ModalShell>
  );
}

/* =========================
   ASIGNAR proveedor
========================= */
function AssignProveedorModal({ open, onClose, solicitudId, cliente, patente, estado, proveedorActualId, onAssigned }) {
  const dispatch = useDispatch();
  const proveedores = useSelector(selectProveedores);
  const provStatus = useSelector(selectProveedoresStatus);

  const [proveedorId, setProveedorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    dispatch(fetchProveedores({ activo: 1, page_size: 200 }));
  }, [open, dispatch]);

  useEffect(() => {
    if (!open) return;
    const pid = proveedorActualId ? String(proveedorActualId) : "";
    setProveedorId(pid);
    setErr("");
    setSaving(false);
  }, [open, proveedorActualId]);

  async function asignar() {
    setErr("");
    const pid = Number(proveedorId);
    if (!pid) return toast.error("Elegí un proveedor.");

    try {
      setSaving(true);
      const upd = await dispatch(updateSolicitud({ id: solicitudId, data: { proveedor: pid } })).unwrap();
      toast.success("Proveedor asignado.");
      onAssigned?.(upd);
      onClose?.();
    } catch (e) {
      const msg = e?.detail || e?.message || e?.data?.detail || "No se pudo asignar";
      setErr(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const provList = Array.isArray(proveedores) ? proveedores : [];

  return (
    <ModalShell
      open={open}
      onClose={() => (saving ? null : onClose?.())}
      title={`Asignar proveedor · Solicitud #${solicitudId || "—"}`}
      subtitle={`${cliente || "—"} · Patente ${patente || "—"}`}
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            Estado: <span className="text-slate-200">{safeUpper(estado) || "—"}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-sm border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={asignar}
              disabled={saving || provStatus === "loading"}
              className="px-3 py-2 rounded-xl text-sm border border-emerald-800 bg-emerald-950 text-emerald-200 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Asignando..." : "Asignar"}
            </button>
          </div>
        </div>
      }
    >
      {err ? (
        <div className="mb-3 text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
          {String(err)}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
        <div className="text-xs text-slate-400">Proveedor</div>

        <div className="mt-2">
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className={classNames(
              "w-full px-3 py-2 rounded-xl text-sm",
              "bg-slate-900 border border-slate-800 text-slate-100",
              "focus:outline-none focus:ring-2 focus:ring-slate-700"
            )}
            disabled={provStatus === "loading" || saving}
          >
            <option value="">Seleccionar proveedor…</option>
            {provList.map((p) => {
              const id = p?.id;
              const nombre = p?.nombre || p?.razon_social || p?.alias || `Proveedor #${id}`;
              const tel = p?.telefono ? ` · ${p.telefono}` : "";
              return (
                <option key={id} value={String(id)}>
                  {nombre}
                  {tel}
                </option>
              );
            })}
          </select>

          {provStatus === "loading" ? <div className="mt-2 text-xs text-slate-500">Cargando proveedores…</div> : null}

          {!provStatus || (provStatus !== "loading" && !provList.length) ? (
            <div className="mt-2 text-xs text-slate-500">No hay proveedores.</div>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}

/* =========================
   ENVIAR a proveedor (WhatsApp)
========================= */
function SendProveedorModal({ open, onClose, solicitudId, cliente, patente, proveedorNombre, onSent }) {
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setMsg("");
    setErr("");
    setSaving(false);
  }, [open]);

  async function enviar() {
    if (!solicitudId) return;
    try {
      setErr("");
      setSaving(true);

      const res = await apiEnviarProveedor(solicitudId, { mensaje: msg });

      const wa = res?.wa_url;
      if (!wa) {
        toast.error("No llegó wa_url desde el backend");
        return;
      }

      toast.success("Listo. Abriendo WhatsApp…");
      window.open(wa, "_blank", "noreferrer");
      onSent?.(res);
      onClose?.();
    } catch (e) {
      const m = e?.data?.detail || e?.message || "No se pudo enviar";
      setErr(m);
      toast.error(m);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={() => (saving ? null : onClose?.())}
      title={`Enviar a proveedor · Solicitud #${solicitudId || "—"}`}
      subtitle={`${cliente || "—"} · Patente ${patente || "—"} · ${proveedorNombre || "—"}`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">Se abre WhatsApp con el mensaje armado.</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-sm border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800 disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={enviar}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-sm border border-emerald-800 bg-emerald-950 text-emerald-200 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Enviando..." : "Enviar por WhatsApp"}
            </button>
          </div>
        </div>
      }
    >
      {err ? (
        <div className="mb-3 text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
          {String(err)}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
        <div className="text-xs text-slate-400">Mensaje opcional (se agrega al final)</div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={5}
          placeholder="Ej: Llegá por Av. ..., tocar timbre, etc."
          className={classNames(
            "mt-2 w-full px-3 py-2 rounded-xl text-sm",
            "bg-slate-900 border border-slate-800 text-slate-100",
            "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
          )}
        />
      </div>
    </ModalShell>
  );
}

export default function SolicitudesPanel() {
  const dispatch = useDispatch();

  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [estado, setEstado] = useState("TODAS");
  const [modalOpen, setModalOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const [sendOpen, setSendOpen] = useState(false);

  const [selectedId, setSelectedId] = useState(null);

  const [selectedMeta, setSelectedMeta] = useState({
    cliente: "—",
    patente: "—",
    estado: "—",
    proveedorActualId: "",
    proveedorNombre: "—",
  });

  const itemsRaw = useSelector(selectSolicitudes);
  const status = useSelector(selectSolicitudesStatus);
  const error = useSelector((s) => s.gruas?.solicitudes?.error || null);

  useEffect(() => {
    const t = setTimeout(() => setQApplied(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = useMemo(() => {
    const p = { q: qApplied };
    if (estado && estado !== "TODAS") p.estado = estado;
    return p;
  }, [qApplied, estado]);

  useEffect(() => {
    dispatch(fetchSolicitudes(params));
  }, [dispatch, params]);

  const items = useMemo(() => (Array.isArray(itemsRaw) ? itemsRaw : []), [itemsRaw]);
  const loading = status === "loading";

  const forceReload = () => {
    dispatch(fetchSolicitudes({ ...params, force: true }));
  };

  const openDetail = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const openAssign = (it) => {
    const id = it?.id;
    setSelectedId(id);

    const cliente =
      it?.cliente_nombre ||
      it?.cliente ||
      `${it?.cliente_apellido || ""} ${it?.cliente_nombre || ""}`.trim() ||
      "—";

    const patente =
      (it?.patente || it?.vehiculo_patente || it?.poliza_patente || "").toString().toUpperCase() || "—";

    const estadoIt = (it?.estado || "").toString().toUpperCase() || "—";
    const proveedorActualId = getProveedorId(it) ?? "";
    const proveedorNombre = getProveedorNombre(it);

    setSelectedMeta({
      cliente,
      patente,
      estado: estadoIt,
      proveedorActualId: proveedorActualId ? String(proveedorActualId) : "",
      proveedorNombre,
    });

    setAssignOpen(true);
  };

  const openSend = (it) => {
    const id = it?.id;
    const provId = getProveedorId(it);
    if (!provId) {
      toast.error("Primero asigná un proveedor.");
      return;
    }

    const cliente =
      it?.cliente_nombre ||
      it?.cliente ||
      `${it?.cliente_apellido || ""} ${it?.cliente_nombre || ""}`.trim() ||
      "—";

    const patente =
      (it?.patente || it?.vehiculo_patente || it?.poliza_patente || "").toString().toUpperCase() || "—";

    const estadoIt = (it?.estado || "").toString().toUpperCase() || "—";
    const proveedorNombre = getProveedorNombre(it);

    setSelectedId(id);
    setSelectedMeta({
      cliente,
      patente,
      estado: estadoIt,
      proveedorActualId: provId ? String(provId) : "",
      proveedorNombre,
    });
    setSendOpen(true);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-base font-semibold text-slate-100">Solicitudes</div>
          <div className="text-xs text-slate-500">Crear y gestionar solicitudes de grúa.</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className={classNames(
              "px-3 py-2 rounded-xl text-sm",
              "bg-slate-900 border border-slate-800 text-slate-100",
              "focus:outline-none focus:ring-2 focus:ring-slate-700"
            )}
          >
            {ESTADOS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente o patente…"
            className={classNames(
              "px-3 py-2 rounded-xl text-sm w-full sm:w-80",
              "bg-slate-900 border border-slate-800 text-slate-100",
              "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
            )}
          />

          <button
            className="px-3 py-2 rounded-xl text-sm border bg-slate-100 text-slate-900 border-slate-100 hover:opacity-90"
            onClick={() => setModalOpen(true)}
          >
            Nueva
          </button>

          <button
            className={classNames(
              "px-3 py-2 rounded-xl text-sm border inline-flex items-center gap-2",
              "border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
            )}
            onClick={forceReload}
            title="Refrescar (forzar backend)"
          >
            <HiRefresh className="h-4 w-4" />
            Refrescar
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
          {String(error)}
        </div>
      ) : null}

      {loading && !items.length ? (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-14 rounded-2xl bg-slate-900/60 border border-slate-800" />
          <div className="h-14 rounded-2xl bg-slate-900/60 border border-slate-800" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((it) => {
            const id = it?.id;
            const estadoIt = (it?.estado || "").toString().toUpperCase() || "—";

            const cliente =
              it?.cliente_nombre ||
              it?.cliente ||
              `${it?.cliente_apellido || ""} ${it?.cliente_nombre || ""}`.trim() ||
              "—";

            const patente =
              (it?.patente || it?.vehiculo_patente || it?.poliza_patente || "").toString().toUpperCase() || "—";

            const origenTxt = it?.origen_direccion || it?.origen_texto || "";
            const destinoTxt = it?.destino_direccion || it?.destino_texto || "";

            const proveedorTxt = getProveedorNombre(it);
            const hasProveedor = Boolean(getProveedorId(it));

            return (
              <motion.div key={id} layout className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">
                      #{id} · {cliente}
                    </div>

                    <div className="text-xs text-slate-400 truncate">
                      Patente: {patente}
                      {origenTxt || destinoTxt ? (
                        <>
                          {" "}
                          · {origenTxt ? `O: ${origenTxt}` : ""}
                          {origenTxt && destinoTxt ? " → " : ""}
                          {destinoTxt ? `D: ${destinoTxt}` : ""}
                        </>
                      ) : null}
                    </div>

                    {/* ✅ proveedor más grande */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-500">Proveedor</span>
                      <span
                        className={classNames(
                          "text-base sm:text-lg font-semibold truncate",
                          hasProveedor ? "text-emerald-200" : "text-slate-200"
                        )}
                        title={proveedorTxt}
                      >
                        {proveedorTxt}
                      </span>
                      {hasProveedor ? (
                        <span className="text-[10px] px-2 py-1 rounded-lg border border-emerald-900 bg-emerald-950/20 text-emerald-200">
                          asignado
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-300">
                          sin asignar
                        </span>
                      )}
                    </div>
                  </div>

                  <EstadoPill estado={estadoIt} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => openDetail(id)}
                    className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800 inline-flex items-center gap-2"
                  >
                    <HiEye className="h-4 w-4" />
                    Ver
                  </button>

                  <button
                    onClick={() => openAssign(it)}
                    className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800 inline-flex items-center gap-2"
                  >
                    <HiUserAdd className="h-4 w-4" />
                    Asignar
                  </button>

                  <button
                    onClick={() => openSend(it)}
                    disabled={!hasProveedor}
                    className={classNames(
                      "px-3 py-2 rounded-xl text-xs border inline-flex items-center gap-2",
                      hasProveedor
                        ? "border-emerald-800 bg-emerald-950 text-emerald-200 hover:opacity-90"
                        : "border-slate-800 bg-slate-900 text-slate-500 opacity-60 cursor-not-allowed"
                    )}
                    title={hasProveedor ? "Enviar info al proveedor por WhatsApp" : "Asigná un proveedor primero"}
                  >
                    <HiExternalLink className="h-4 w-4" />
                    Enviar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && !items.length && <div className="mt-6 text-sm text-slate-400">Sin solicitudes.</div>}

      <SolicitarGruaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          dispatch(fetchSolicitudes({ ...params, force: true }));
        }}
      />

      <SolicitudDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} solicitudId={selectedId} />

      <AssignProveedorModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        solicitudId={selectedId}
        cliente={selectedMeta.cliente}
        patente={selectedMeta.patente}
        estado={selectedMeta.estado}
        proveedorActualId={selectedMeta.proveedorActualId}
        onAssigned={() => {
          dispatch(fetchSolicitudes({ ...params, force: true }));
        }}
      />

      <SendProveedorModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        solicitudId={selectedId}
        cliente={selectedMeta.cliente}
        patente={selectedMeta.patente}
        proveedorNombre={selectedMeta.proveedorNombre}
        onSent={() => {
          // refrescar para ver evento/estado si cambia
          dispatch(fetchSolicitudes({ ...params, force: true }));
        }}
      />
    </div>
  );
}
