// src/components/gruas/ProveedoresPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";

import ProveedoresModal from "./ProveedoresModal";
import ProveedorProfileModal from "./ProveedorProfileModal";
import FlotaModal from "./FlotaModal";

import {
  fetchProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  selectProveedores,
  selectProveedoresStatus,
} from "../../store/slices/gruasSlice";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* =========================
   Tel helpers (WhatsApp / Llamar)
========================= */
function digitsOnly(s) {
  return String(s || "").replace(/\D+/g, "");
}
function waUrl(rawTel, msg = "") {
  const d = digitsOnly(rawTel);
  if (!d) return "";
  // AR default: si no empieza con 54, lo agregamos
  const phone = d.startsWith("54") ? d : `54${d}`;
  const text = String(msg || "").trim();
  const qs = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone}${qs}`;
}
function telUrl(rawTel) {
  const d = digitsOnly(rawTel);
  if (!d) return "";
  return `tel:${d.startsWith("+") ? d : `+${d}`}`;
}

export default function ProveedoresPanel() {
  const dispatch = useDispatch();

  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFlotaOpen, setIsFlotaOpen] = useState(false);

  const [selected, setSelected] = useState(null);

  const itemsRaw = useSelector(selectProveedores);
  const status = useSelector(selectProveedoresStatus);
  const error = useSelector((s) => s.gruas?.proveedores?.error || null);

  const createStatus = useSelector((s) => s.gruas?.createProveedor?.status || "idle");
  const createError = useSelector((s) => s.gruas?.createProveedor?.error || null);

  const updateStatus = useSelector((s) => s.gruas?.updateProveedor?.status || "idle");
  const updateError = useSelector((s) => s.gruas?.updateProveedor?.error || null);

  const deleteStatus = useSelector((s) => s.gruas?.deleteProveedor?.status || "idle");
  const deleteError = useSelector((s) => s.gruas?.deleteProveedor?.error || null);

  // debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setQApplied(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // cargar lista
  useEffect(() => {
    dispatch(fetchProveedores({ q: qApplied }));
  }, [dispatch, qApplied]);

  const items = useMemo(() => {
    return Array.isArray(itemsRaw) ? itemsRaw : [];
  }, [itemsRaw]);

  async function handleCreatedProveedor(payload) {
    try {
      await dispatch(
        createProveedor({
          nombre: payload?.nombre || "",

          // ✅ NUEVO
          telefono: payload?.telefono || "",

          patente_camion: payload?.vehiculo?.patente || payload?.patente_camion || "",
          modelo_camion: payload?.vehiculo?.modelo || payload?.modelo_camion || "",
          anio_camion: payload?.vehiculo?.anio || payload?.anio_camion || 0,

          foto_camion_1_url: payload?.foto_camion_1_url || "",
          foto_camion_1_public_id: payload?.foto_camion_1_public_id || "",
          foto_camion_2_url: payload?.foto_camion_2_url || "",
          foto_camion_2_public_id: payload?.foto_camion_2_public_id || "",

          licencia_url: payload?.licencia_url || "",
          licencia_public_id: payload?.licencia_public_id || "",
          vtv_url: payload?.vtv_url || "",
          vtv_public_id: payload?.vtv_public_id || "",

          activo: true,
        })
      ).unwrap();

      setIsCreateOpen(false);
      dispatch(fetchProveedores({ q: qApplied }));
    } catch (e) {
      // queda en createError
    }
  }

  function openProfile(p) {
    setSelected(p);
    setIsProfileOpen(true);
  }

  function openFlota(p) {
    setSelected(p);
    setIsFlotaOpen(true);
  }

  async function handleUpdateProveedor(id, data) {
    const updated = await dispatch(updateProveedor({ id, data })).unwrap();
    setSelected(updated);
    dispatch(fetchProveedores({ q: qApplied }));
    return updated;
  }

  async function handleDeleteProveedor(p) {
    const id = p?.id;
    if (!id) return;
    try {
      await dispatch(deleteProveedor(id)).unwrap();
      setIsProfileOpen(false);
      setSelected(null);
      dispatch(fetchProveedores({ q: qApplied }));
    } catch (e) {
      // queda en deleteError
    }
  }

  const busy =
    status === "loading" ||
    createStatus === "loading" ||
    updateStatus === "loading" ||
    deleteStatus === "loading";

  const anyError = deleteError || updateError || createError || error;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-base font-semibold text-slate-100">Proveedores</div>
          <div className="text-xs text-slate-500">Alta, edición, documentos, flota.</div>
        </div>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar proveedor… (nombre / patente / modelo / año)"
            className={classNames(
              "w-full sm:w-80 px-3 py-2 rounded-xl text-sm",
              "bg-slate-900 border border-slate-800 text-slate-100",
              "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
            )}
          />
          <button
            className={classNames(
              "px-3 py-2 rounded-xl text-sm border",
              "bg-slate-100 text-slate-900 border-slate-100 hover:opacity-90"
            )}
            onClick={() => setIsCreateOpen(true)}
          >
            Nuevo
          </button>
        </div>
      </div>

      {busy && (
        <div className="mt-3 text-xs text-slate-400">
          {deleteStatus === "loading"
            ? "Eliminando proveedor…"
            : updateStatus === "loading"
            ? "Guardando cambios…"
            : createStatus === "loading"
            ? "Creando proveedor…"
            : "Cargando proveedores…"}
        </div>
      )}

      {anyError && (
        <div className="mt-3 text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
          {anyError}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((p) => {
          const activo = p?.activo !== false;
          const patente = (p?.patente_camion || "").toString().toUpperCase();
          const modelo = (p?.modelo_camion || "").toString();
          const anio = p?.anio_camion ? String(p.anio_camion) : "";
          const tel = String(p?.telefono || "").trim();

          const wa = tel ? waUrl(tel) : "";
          const call = tel ? telUrl(tel) : "";

          return (
            <motion.div
              key={p.id}
              layout
              className="rounded-2xl border border-slate-800 bg-slate-950 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100 truncate">
                    {p?.nombre || `Proveedor #${p?.id}`}
                  </div>

                  <div className="text-xs text-slate-400 truncate">
                    {patente ? `${patente}` : "—"}{" "}
                    {modelo || anio ? `· ${[modelo, anio].filter(Boolean).join(" ")}` : ""}
                  </div>

                  {/* ✅ NUEVO: Teléfono + acciones */}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-500">Tel</span>
                    <span className="text-sm sm:text-base font-semibold text-slate-100">
                      {tel || "—"}
                    </span>

                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] px-2 py-1 rounded-lg border border-emerald-800 bg-emerald-950/40 text-emerald-200 hover:opacity-90"
                      >
                        WhatsApp
                      </a>
                    ) : null}

                    {call ? (
                      <a
                        href={call}
                        className="text-[11px] px-2 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                      >
                        Llamar
                      </a>
                    ) : null}
                  </div>
                </div>

                <span
                  className={classNames(
                    "text-[11px] px-2 py-1 rounded-lg border",
                    activo
                      ? "border-emerald-800 bg-emerald-950 text-emerald-200"
                      : "border-slate-800 bg-slate-900 text-slate-300"
                  )}
                >
                  {activo ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => openProfile(p)}
                  className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                >
                  Ver perfil
                </button>
                <button
                  onClick={() => openFlota(p)}
                  className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                >
                  Flota
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {status !== "loading" && !items.length && (
        <div className="mt-6 text-sm text-slate-400">Sin resultados.</div>
      )}

      <ProveedoresModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(payload) => handleCreatedProveedor(payload)}
      />

      <ProveedorProfileModal
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        proveedor={selected}
        onUpdate={handleUpdateProveedor}
        onDelete={(p) => handleDeleteProveedor(p)}
      />

      <FlotaModal open={isFlotaOpen} onClose={() => setIsFlotaOpen(false)} proveedor={selected} />
    </div>
  );
}
