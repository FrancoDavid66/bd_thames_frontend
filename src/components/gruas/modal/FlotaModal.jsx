// src/components/gruas/modal/FlotaModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  HiTruck,
  HiRefresh,
  HiPlus,
  HiX,
  HiPencil,
  HiCheck,
  HiTrash,
  HiExternalLink,
  HiUpload,
  HiPhotograph,
  HiChevronDown,
  HiChevronUp,
  HiChevronLeft,
} from "react-icons/hi";

import Modal from "./Modal";
import GruasAPI from "../../../api/gruas";
import { uploadToCloudinary } from "../../../utils/cloudinary";

/* =========================
   Helpers
========================= */
const normalize = (res) => {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object") {
    for (const k of ["results", "items", "data", "rows"]) {
      if (Array.isArray(res[k])) return res[k];
    }
  }
  return [];
};

const toYM = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function normPatente(p) {
  return String(p || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function parseAnio(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const nn = Math.trunc(n);
  if (nn < 1900 || nn > 2100) return null;
  return nn;
}

function clsTab(active) {
  return active
    ? "px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white"
    : "px-3 py-2 rounded-lg bg-transparent border border-white/10 text-white/70 hover:text-white hover:bg-white/5";
}

function Badge({ children, className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-white/10 border border-white/10 text-white/80",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function SoftButton({ className = "", ...props }) {
  return (
    <button
      className={[
        "px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-60 transition",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] bg-black/30 border border-white/10 text-white/75">
      {children}
    </span>
  );
}

function emptyThumbLabel(patente = "") {
  const p = normPatente(patente);
  if (!p) return "—";
  return p.length <= 6 ? p : `${p.slice(0, 3)}…${p.slice(-2)}`;
}

/* =========================
   FlotaModal
========================= */
export default function FlotaModal({
  proveedor,
  onClose,
  api = GruasAPI,
  initialMes,
  variant = "social",
}) {
  const proveedorId = proveedor?.id;

  const [tab, setTab] = useState("vehiculos"); // vehiculos | viajes
  const [mes, setMes] = useState(initialMes || toYM());

  const [loadingVeh, setLoadingVeh] = useState(false);
  const [loadingViajes, setLoadingViajes] = useState(false);

  const [vehiculos, setVehiculos] = useState([]);
  const [viajesRows, setViajesRows] = useState([]);

  const [compatWarn, setCompatWarn] = useState("");
  const [error, setError] = useState("");

  // filtro / selección
  const [qVeh, setQVeh] = useState("");
  const [selectedVehId, setSelectedVehId] = useState(null);

  // alta vehículo (colapsado)
  const [showCreate, setShowCreate] = useState(false);
  const [nuevo, setNuevo] = useState({
    patente: "",
    alias: "",
    modelo: "",
    anio: "",
    activo: true,
  });
  const [savingNew, setSavingNew] = useState(false);

  // edición dentro del perfil
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    patente: "",
    alias: "",
    modelo: "",
    anio: "",
    activo: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // fotos
  const [fotoVehOpen, setFotoVehOpen] = useState(false);

  // Social UI: estado de "detalle"
  const [detailOpen, setDetailOpen] = useState(false);

  // cache de fotos por vehículo (lazy)
  const [fotosByVehId, setFotosByVehId] = useState({}); // { [vehId]: {loading, items, err} }

  const proveedorNombre = proveedor?.nombre || "Proveedor";

  // mapa viajes por patente
  const viajesMap = useMemo(() => {
    const map = new Map();
    for (const r of normalize(viajesRows)) {
      const pat = normPatente(r?.patente || r?.codigo || "");
      if (!pat) continue;
      const v =
        typeof r?.viajes_mes === "number"
          ? r.viajes_mes
          : typeof r?.servicios_mes === "number"
          ? r.servicios_mes
          : typeof r?.cantidad === "number"
          ? r.cantidad
          : 0;
      map.set(pat, v);
    }
    return map;
  }, [viajesRows]);

  const modoCompatSinVehiculos = !!compatWarn;

  const vehiculosFiltrados = useMemo(() => {
    const arr = normalize(vehiculos);
    if (!qVeh) return arr;
    const qq = qVeh.toLowerCase();
    const hay = (s) => String(s || "").toLowerCase().includes(qq);
    return arr.filter((v) => hay(v?.patente) || hay(v?.alias) || hay(v?.modelo));
  }, [vehiculos, qVeh]);

  const vehiculoSeleccionado = useMemo(() => {
    const arr = normalize(vehiculos);
    const found = arr.find((v) => String(v?.id) === String(selectedVehId));
    if (found) return found;
    return arr[0] || null;
  }, [vehiculos, selectedVehId]);

  // KPIs rápidos
  const kpiTotalVeh = vehiculosFiltrados.length;

  const kpiActivos = useMemo(() => {
    return vehiculosFiltrados.filter((v) => v?.activo !== false).length;
  }, [vehiculosFiltrados]);

  const kpiViajesMesTotal = useMemo(() => {
    let total = 0;
    for (const v of vehiculosFiltrados) {
      const pat = normPatente(v?.patente);
      const viajes =
        (typeof v?.viajes_mes === "number" ? v.viajes_mes : null) ??
        (viajesMap.get(pat) ?? 0);
      total += Number(viajes || 0);
    }
    return total;
  }, [vehiculosFiltrados, viajesMap]);

  useEffect(() => {
    if (!selectedVehId && vehiculosFiltrados?.[0]?.id) {
      setSelectedVehId(vehiculosFiltrados[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculosFiltrados?.length]);

  async function loadVehiculos() {
    if (!proveedorId) return;
    setLoadingVeh(true);
    setError("");
    setCompatWarn("");

    try {
      const data = await api.listProveedorVehiculos?.(proveedorId, { mes });
      const arr = normalize(data);
      setVehiculos(arr);
      if (arr?.[0]?.id) setSelectedVehId((prev) => prev ?? arr[0].id);
    } catch (e) {
      setVehiculos([]);
      setCompatWarn(
        "Tu backend aún no expone /vehiculos/ para este proveedor. Modo compat: solo mostramos viajes del mes."
      );
    } finally {
      setLoadingVeh(false);
    }
  }

  async function loadViajesMes() {
    if (!proveedorId) return;
    setLoadingViajes(true);
    setError("");

    try {
      const data = await api.getProveedorFlota?.(proveedorId, { mes });
      setViajesRows(normalize(data));
    } catch (e) {
      try {
        const data2 = await api.getGruasProveedor?.(proveedorId, { mes });
        setViajesRows(normalize(data2));
      } catch {
        setViajesRows([]);
      }
    } finally {
      setLoadingViajes(false);
    }
  }

  async function refreshAll() {
    setError("");
    await Promise.all([loadVehiculos(), loadViajesMes()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, proveedorId]);

  /* =========================
     Fotos: lazy load por vehículo
  ========================= */
  async function ensureFotosLoaded(vehiculoId) {
    if (!vehiculoId || !proveedorId) return;
    setFotosByVehId((s) => {
      const cur = s?.[vehiculoId];
      if (cur?.loading || Array.isArray(cur?.items)) return s;
      return { ...s, [vehiculoId]: { loading: true, items: null, err: "" } };
    });

    try {
      const data = await api.listVehiculoFotos?.(proveedorId, vehiculoId);
      const items = normalize(data);
      setFotosByVehId((s) => ({
        ...s,
        [vehiculoId]: { loading: false, items, err: "" },
      }));
    } catch (e) {
      setFotosByVehId((s) => ({
        ...s,
        [vehiculoId]: {
          loading: false,
          items: [],
          err: e?.message || "No se pudieron cargar las fotos",
        },
      }));
    }
  }

  // cuando abrimos detalle, traemos fotos del seleccionado
  useEffect(() => {
    if (!detailOpen) return;
    if (!vehiculoSeleccionado?.id) return;
    ensureFotosLoaded(vehiculoSeleccionado.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen, vehiculoSeleccionado?.id]);

  function getVehFotos(vehiculoId) {
    const block = fotosByVehId?.[vehiculoId];
    if (!block) return { loading: false, items: null, err: "" };
    return block;
  }

  function getVehThumbUrl(v) {
    // ✅ IMPORTANTE: ahora usamos foto_principal_url/foto_url guardada localmente al subir
    const direct =
      v?.foto_principal_url ||
      v?.foto_url ||
      v?.foto ||
      v?.camion_foto_url ||
      v?.foto_principal?.url;

    if (direct) return direct;

    // fallback: si hay cache de fotos
    const block = getVehFotos(v?.id);
    const first = Array.isArray(block?.items) ? block.items?.[0]?.url : null;
    return first || null;
  }

  /* =========================
     Vehículos: crear / editar / borrar
  ========================= */
  async function agregarVehiculo() {
    if (modoCompatSinVehiculos) return;

    const patente = normPatente(nuevo.patente);
    if (!patente) return alert("Completá la patente");

    const anioParsed = parseAnio(nuevo.anio);
    if (String(nuevo.anio || "").trim() && anioParsed == null) {
      return alert("Año inválido (ej: 2015)");
    }

    setSavingNew(true);
    setError("");
    try {
      await api.createProveedorVehiculo?.(proveedorId, {
        patente,
        alias: (nuevo.alias || "").trim() || null,
        modelo: (nuevo.modelo || "").trim() || null,
        anio: anioParsed,
        activo: nuevo.activo !== false,
      });

      setNuevo({ patente: "", alias: "", modelo: "", anio: "", activo: true });
      setShowCreate(false);
      await loadVehiculos();
      await loadViajesMes();
    } catch (e) {
      const msg =
        e?.payload?.detail ||
        (e?.payload &&
          Object.entries(e.payload)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" · "));
      setError(msg || e?.message || "No se pudo agregar el vehículo");
    } finally {
      setSavingNew(false);
    }
  }

  function openEditar(v) {
    if (!v?.id) return;
    setEditOpen(true);
    setEditForm({
      patente: v?.patente || "",
      alias: v?.alias || "",
      modelo: v?.modelo || "",
      anio: v?.anio != null ? String(v.anio) : "",
      activo: v?.activo !== false,
    });
  }

  function cerrarEditar() {
    setEditOpen(false);
    setEditForm({ patente: "", alias: "", modelo: "", anio: "", activo: true });
  }

  async function guardarEdicion() {
    if (modoCompatSinVehiculos) return;
    if (!vehiculoSeleccionado?.id) return;

    const patente = normPatente(editForm.patente);
    if (!patente) return alert("La patente es obligatoria");

    const anioParsed = parseAnio(editForm.anio);
    if (String(editForm.anio || "").trim() && anioParsed == null) {
      return alert("Año inválido (ej: 2015)");
    }

    setSavingEdit(true);
    setError("");
    try {
      await api.updateProveedorVehiculo?.(proveedorId, vehiculoSeleccionado.id, {
        patente,
        alias: (editForm.alias || "").trim() || null,
        modelo: (editForm.modelo || "").trim() || null,
        anio: anioParsed,
        activo: editForm.activo !== false,
      });
      cerrarEditar();
      await loadVehiculos();
      await loadViajesMes();
    } catch (e) {
      const msg =
        e?.payload?.detail ||
        (e?.payload &&
          Object.entries(e.payload)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" · "));
      setError(msg || e?.message || "No se pudo guardar");
    } finally {
      setSavingEdit(false);
    }
  }

  async function eliminarVehiculo(vehiculoId) {
    if (modoCompatSinVehiculos) return;
    if (!window.confirm("¿Eliminar vehículo de la flota?")) return;

    setError("");
    try {
      await api.deleteProveedorVehiculo?.(proveedorId, vehiculoId);
      if (String(selectedVehId) === String(vehiculoId)) {
        setSelectedVehId(null);
        setDetailOpen(false);
        setEditOpen(false);
      }
      await loadVehiculos();
      await loadViajesMes();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar");
    }
  }

  function selectVehiculo(id, { openDetail = false } = {}) {
    setSelectedVehId(id);
    setEditOpen(false);
    if (openDetail) setDetailOpen(true);
  }

  const busy = loadingVeh || loadingViajes;

  const viajesVehiculoSeleccionado = useMemo(() => {
    const v = vehiculoSeleccionado;
    if (!v) return 0;
    const pat = normPatente(v?.patente);
    const viajes =
      (typeof v?.viajes_mes === "number" ? v.viajes_mes : null) ??
      (viajesMap.get(pat) ?? 0);
    return Number(viajes || 0);
  }, [vehiculoSeleccionado, viajesMap]);

  // ✅ NUEVO: cuando subís foto, actualizamos thumbnail de ese vehículo en la grilla SIN F5
  function applyVehiculoThumb(vehiculoId, url) {
    if (!vehiculoId || !url) return;

    // 1) Actualiza el vehículo para que getVehThumbUrl lo agarre directo
    setVehiculos((prev) =>
      normalize(prev).map((v) =>
        String(v?.id) === String(vehiculoId)
          ? { ...v, foto_principal_url: url, foto_url: url }
          : v
      )
    );

    // 2) Actualiza cache de fotos para que el perfil también lo vea sin recargar
    setFotosByVehId((s) => {
      const cur = s?.[vehiculoId];
      const curItems = Array.isArray(cur?.items) ? cur.items : [];
      const nextFirst = { id: `tmp-${Date.now()}`, url, tipo: "OTRA" };
      const next = [nextFirst, ...curItems.filter((x) => x?.url !== url)];
      return { ...s, [vehiculoId]: { loading: false, items: next, err: "" } };
    });
  }

  function renderVehiculosSocial() {
    if (modoCompatSinVehiculos) {
      return (
        <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 text-amber-200 text-sm">
          <div className="font-semibold">Modo compat</div>
          <div className="text-amber-200/80 mt-1">
            No hay CRUD de vehículos (falta endpoint en backend). Podés ver{" "}
            <span className="font-semibold">Viajes del mes</span> en la otra pestaña.
          </div>
        </div>
      );
    }

    const grid = (
      <>
        {/* Alta colapsada */}
        <div className="rounded-2xl border border-gray-800 bg-black/20 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 px-4 py-3"
            onClick={() => setShowCreate((v) => !v)}
          >
            <div className="text-sm text-white/85 flex items-center gap-2">
              <HiPlus />
              <span className="font-semibold">Agregar camión</span>
              <span className="text-xs text-white/45 hidden md:inline">
                Patente obligatoria · Alias/Modelo/Año opcionales
              </span>
            </div>
            {showCreate ? (
              <HiChevronUp className="text-white/70" />
            ) : (
              <HiChevronDown className="text-white/70" />
            )}
          </button>

          {showCreate && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <label className="md:col-span-3 text-xs text-white/70">
                  Patente *
                  <input
                    className="mt-1 w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                    placeholder="AAA123 / AB123CD"
                    value={nuevo.patente}
                    onChange={(e) =>
                      setNuevo((s) => ({ ...s, patente: e.target.value }))
                    }
                  />
                </label>

                <label className="md:col-span-3 text-xs text-white/70">
                  Alias
                  <input
                    className="mt-1 w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                    placeholder="Ej: Camión chico"
                    value={nuevo.alias}
                    onChange={(e) =>
                      setNuevo((s) => ({ ...s, alias: e.target.value }))
                    }
                  />
                </label>

                <label className="md:col-span-4 text-xs text-white/70">
                  Modelo
                  <input
                    className="mt-1 w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                    placeholder="Ej: Iveco Daily"
                    value={nuevo.modelo}
                    onChange={(e) =>
                      setNuevo((s) => ({ ...s, modelo: e.target.value }))
                    }
                  />
                </label>

                <label className="md:col-span-2 text-xs text-white/70">
                  Año
                  <input
                    className="mt-1 w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                    placeholder="2018"
                    inputMode="numeric"
                    value={nuevo.anio}
                    onChange={(e) =>
                      setNuevo((s) => ({ ...s, anio: e.target.value }))
                    }
                  />
                </label>

                <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={nuevo.activo !== false}
                      onChange={(e) =>
                        setNuevo((s) => ({ ...s, activo: e.target.checked }))
                      }
                    />
                    Activo
                  </label>

                  <div className="flex gap-2">
                    <SoftButton
                      onClick={() => {
                        setNuevo({
                          patente: "",
                          alias: "",
                          modelo: "",
                          anio: "",
                          activo: true,
                        });
                        setShowCreate(false);
                      }}
                      disabled={savingNew}
                    >
                      Cancelar
                    </SoftButton>
                    <button
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold hover:brightness-105 disabled:opacity-50"
                      onClick={agregarVehiculo}
                      disabled={savingNew}
                    >
                      {savingNew ? "Guardando…" : "Guardar camión"}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-12 text-[11px] text-white/45">
                  * La patente se normaliza (sin espacios/guiones). Año permitido: 1900–2100.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* búsqueda + KPIs */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-3">
          <input
            className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-xl border border-gray-800"
            placeholder="Buscar camión (patente, alias, modelo)…"
            value={qVeh}
            onChange={(e) => setQVeh(e.target.value)}
          />

          <div className="flex items-center gap-2 text-xs text-white/70 flex-wrap">
            <Badge>{kpiTotalVeh} vehículos</Badge>
            <Badge>{kpiActivos} activos</Badge>
            <Badge>{kpiViajesMesTotal} viajes en {mes}</Badge>
          </div>
        </div>

        {/* grid cards */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {vehiculosFiltrados.map((v) => {
            const pat = normPatente(v?.patente);
            const viajes =
              (typeof v?.viajes_mes === "number" ? v.viajes_mes : null) ??
              (viajesMap.get(pat) ?? 0);

            const thumb = getVehThumbUrl(v);
            const isSelected = String(v?.id) === String(vehiculoSeleccionado?.id);

            return (
              <button
                key={v?.id || pat}
                type="button"
                onClick={() => selectVehiculo(v?.id, { openDetail: true })}
                className={[
                  "text-left rounded-2xl border overflow-hidden transition",
                  "bg-black/20 hover:bg-black/30",
                  isSelected
                    ? "border-emerald-400/40 ring-1 ring-emerald-400/20"
                    : "border-white/10",
                ].join(" ")}
              >
                <div className="relative">
                  <div className="aspect-[16/10] bg-black">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={v?.patente || "vehículo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-content-center">
                        <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 grid place-content-center">
                          <HiTruck className="text-white/70 text-2xl" />
                        </div>
                        <div className="mt-2 text-xs text-white/50 font-mono">
                          {emptyThumbLabel(v?.patente)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                    <Pill>{v?.activo === false ? "Inactivo" : "Activo"}</Pill>
                    <Pill>{viajes} viajes</Pill>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-white font-semibold leading-tight">
                        <span className="font-mono">{v?.patente || "—"}</span>
                      </div>
                      <div className="text-sm text-white/75 mt-1">
                        {v?.alias ? v.alias : <span className="text-white/45">Sin alias</span>}
                      </div>
                    </div>

                    <div className="text-xs text-white/55 text-right">
                      <div>{v?.modelo || "—"}</div>
                      <div>{v?.anio ?? "—"}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/45">Tocá para ver el perfil</span>
                    <span className="text-[11px] text-white/60">ID {v?.id ?? "—"}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {vehiculosFiltrados.length === 0 && (
            <div className="col-span-1 sm:col-span-2 xl:col-span-3 py-10 text-center text-white/55 text-sm rounded-2xl border border-white/10 bg-black/10">
              No hay vehículos.
            </div>
          )}
        </div>
      </>
    );

    if (!detailOpen) return <div className="mt-4">{grid}</div>;

    // Detail / profile view
    const v = vehiculoSeleccionado;
    if (!v) {
      return (
        <div className="mt-4">
          {grid}
          <div className="mt-3 text-center text-white/50 text-sm">Seleccioná un vehículo.</div>
        </div>
      );
    }

    const fotosBlock = getVehFotos(v?.id);
    const fotos = Array.isArray(fotosBlock?.items) ? fotosBlock.items : [];
    const thumb = getVehThumbUrl(v);

    return (
      <div className="mt-4">
        {/* Back + title */}
        <div className="flex items-center justify-between gap-2">
          <SoftButton onClick={() => { setDetailOpen(false); setEditOpen(false); }}>
            <HiChevronLeft className="inline -mt-0.5" /> Volver
          </SoftButton>

          <div className="text-sm text-white/80 flex items-center gap-2">
            <Badge>Perfil del camión</Badge>
            <span className="text-white/40">·</span>
            <span className="font-mono text-white">{v?.patente || "—"}</span>
          </div>

          <div className="flex items-center gap-2">
            <SoftButton
              onClick={() => {
                ensureFotosLoaded(v.id);
                setFotoVehOpen(true);
              }}
              disabled={modoCompatSinVehiculos}
              title="Fotos"
            >
              <HiPhotograph className="inline -mt-0.5" /> Fotos
            </SoftButton>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left: media */}
          <div className="lg:col-span-7 space-y-3">
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30">
              <div className="aspect-[16/10] bg-black">
                {thumb ? (
                  <img src={thumb} alt={v?.patente || "vehículo"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-content-center text-white/55">
                    <HiTruck className="text-4xl" />
                    <div className="mt-2 text-xs font-mono text-white/45">{emptyThumbLabel(v?.patente)}</div>
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Pill>{v?.activo === false ? "Inactivo" : "Activo"}</Pill>
                  <Pill>{viajesVehiculoSeleccionado} viajes en {mes}</Pill>
                  {v?.modelo ? <Pill>{v.modelo}</Pill> : null}
                  {v?.anio != null ? <Pill>{v.anio}</Pill> : null}
                </div>
                <div className="text-xs text-white/45">ID {v?.id ?? "—"}</div>
              </div>
            </div>

            {/* mini galería */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-white/85 font-semibold">Fotos del camión</div>
                <div className="text-xs text-white/45">
                  {fotosBlock?.loading ? "Cargando…" : `${fotos?.length || 0} fotos`}
                </div>
              </div>

              {fotosBlock?.err ? (
                <div className="mt-2 text-xs text-red-200">{fotosBlock.err}</div>
              ) : null}

              {fotosBlock?.loading && (
                <div className="mt-3 text-center text-white/55 text-sm">Cargando fotos…</div>
              )}

              {!fotosBlock?.loading && fotos?.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
                  {fotos.slice(0, 10).map((f) => (
                    <div
                      key={f?.id || f?.url}
                      className="rounded-xl overflow-hidden border border-white/10 bg-black"
                    >
                      <div className="aspect-square">
                        <img src={f.url} alt={f?.tipo || "foto"} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ))}
                  {fotos.length > 10 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 grid place-content-center text-xs text-white/60">
                      +{fotos.length - 10}
                    </div>
                  ) : null}
                </div>
              ) : (
                !fotosBlock?.loading && (
                  <div className="mt-3 text-xs text-white/50">
                    Sin fotos todavía. Tocá <span className="font-semibold">“Fotos”</span> para cargar.
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right: data + actions */}
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-white/85 font-semibold">Datos del camión</div>
                {!editOpen ? (
                  <SoftButton onClick={() => openEditar(v)} disabled={modoCompatSinVehiculos} title="Editar">
                    <HiPencil className="inline -mt-0.5" /> Editar
                  </SoftButton>
                ) : (
                  <SoftButton onClick={cerrarEditar} disabled={savingEdit}>
                    <HiX className="inline -mt-0.5" /> Cancelar
                  </SoftButton>
                )}
              </div>

              {!editOpen ? (
                <div className="mt-3 space-y-2 text-sm text-white/80">
                  <RowKV k="Patente" v={<span className="font-mono">{v?.patente || "—"}</span>} />
                  <RowKV k="Alias" v={v?.alias || "—"} />
                  <RowKV k="Modelo" v={v?.modelo || "—"} />
                  <RowKV k="Año" v={v?.anio ?? "—"} />
                  <RowKV k="Activo" v={v?.activo === false ? "NO" : "SÍ"} />
                  <div className="pt-2 border-t border-white/10">
                    <RowKV k={`Viajes en ${mes}`} v={<span className="font-semibold">{viajesVehiculoSeleccionado}</span>} />
                  </div>

                  <div className="pt-3 flex flex-wrap gap-2 justify-end">
                    <SoftButton
                      onClick={() => {
                        ensureFotosLoaded(v.id);
                        setFotoVehOpen(true);
                      }}
                      disabled={modoCompatSinVehiculos}
                    >
                      <HiPhotograph className="inline -mt-0.5" /> Administrar fotos
                    </SoftButton>

                    <SoftButton
                      onClick={() => eliminarVehiculo(v.id)}
                      disabled={modoCompatSinVehiculos}
                      className="hover:bg-red-500/10"
                    >
                      <HiTrash className="inline -mt-0.5" /> Eliminar
                    </SoftButton>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-white/70">
                      Patente *
                      <input
                        className="mt-1 w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                        value={editForm.patente}
                        onChange={(e) => setEditForm((s) => ({ ...s, patente: e.target.value }))}
                      />
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label className="text-xs text-white/70">
                        Alias
                        <input
                          className="mt-1 w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                          value={editForm.alias}
                          onChange={(e) => setEditForm((s) => ({ ...s, alias: e.target.value }))}
                        />
                      </label>

                      <label className="text-xs text-white/70">
                        Año
                        <input
                          className="mt-1 w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                          inputMode="numeric"
                          placeholder="2015"
                          value={editForm.anio}
                          onChange={(e) => setEditForm((s) => ({ ...s, anio: e.target.value }))}
                        />
                      </label>
                    </div>

                    <label className="text-xs text-white/70">
                      Modelo
                      <input
                        className="mt-1 w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                        value={editForm.modelo}
                        onChange={(e) => setEditForm((s) => ({ ...s, modelo: e.target.value }))}
                      />
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm text-white/80 pt-1">
                      <input
                        type="checkbox"
                        checked={editForm.activo !== false}
                        onChange={(e) => setEditForm((s) => ({ ...s, activo: e.target.checked }))}
                      />
                      Activo
                    </label>

                    <div className="pt-2 flex justify-end gap-2">
                      <SoftButton onClick={cerrarEditar} disabled={savingEdit}>
                        <HiX className="inline -mt-0.5" /> Cancelar
                      </SoftButton>
                      <button
                        className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold hover:brightness-105 disabled:opacity-60"
                        onClick={guardarEdicion}
                        disabled={savingEdit}
                      >
                        <HiCheck className="inline -mt-0.5" /> {savingEdit ? "Guardando…" : "Guardar"}
                      </button>
                    </div>

                    <div className="text-[11px] text-white/45">
                      * Año permitido: 1900–2100. Patente se normaliza automáticamente.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
              <div className="text-sm text-white/80 font-semibold mb-2">Atajos</div>
              <div className="flex flex-wrap gap-2">
                <SoftButton onClick={() => { setDetailOpen(false); setEditOpen(false); }}>
                  Ver grilla
                </SoftButton>
                <SoftButton onClick={() => { setDetailOpen(false); setEditOpen(false); }}>
                  Buscar otro
                </SoftButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <HiTruck className="text-xl" />
            <span className="font-semibold">Flota — {proveedorNombre}</span>
            <span className="hidden md:inline text-white/40">·</span>
            <span className="hidden md:inline text-white/70">{mes}</span>
          </div>
        }
        onClose={onClose}
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-xs text-white/50">
              {busy ? "Actualizando…" : "Listo"}
              {modoCompatSinVehiculos ? (
                <span className="ml-2">
                  <Badge>MODO COMPAT</Badge>
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                onClick={onClose}
              >
                Cerrar
              </button>
              <button
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 disabled:opacity-60"
                onClick={refreshAll}
                disabled={busy}
              >
                <HiRefresh className="inline -mt-0.5" /> Refrescar
              </button>
            </div>
          </div>
        }
      >
        {/* Top bar: mes + tabs + estado */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-white/80">
              Mes
              <input
                type="month"
                className="ml-2 px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </label>

            <div className="flex items-center gap-2">
              <button className={clsTab(tab === "vehiculos")} onClick={() => setTab("vehiculos")}>
                Vehículos
              </button>
              <button className={clsTab(tab === "viajes")} onClick={() => setTab("viajes")}>
                Viajes del mes
              </button>
            </div>

            {variant === "social" && tab === "vehiculos" && !modoCompatSinVehiculos ? (
              <Badge className="ml-1">UI social</Badge>
            ) : null}
          </div>

          <div className="text-xs text-white/50">
            {loadingVeh ? "Cargando vehículos…" : "Vehículos listos"}
            {loadingViajes ? " · Cargando viajes…" : " · Viajes listos"}
          </div>
        </div>

        {/* banners */}
        {compatWarn && (
          <div className="mt-3 p-3 rounded bg-amber-900/20 border border-amber-700/40 text-amber-200 text-sm">
            {compatWarn}
          </div>
        )}
        {error && (
          <div className="mt-3 p-3 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {tab === "vehiculos" && variant === "social" && renderVehiculosSocial()}

        {tab === "viajes" && (
          <div className="mt-4">
            <div className="rounded-xl border border-gray-800 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-900 sticky top-0 z-10">
                  <tr className="text-left text-gray-300 uppercase text-xs">
                    <th className="px-3 py-2">Patente</th>
                    <th className="px-3 py-2">Viajes</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {normalize(viajesRows).map((r, idx) => (
                    <tr
                      key={r?.id || r?.patente || idx}
                      className="border-t border-gray-800 hover:bg-gray-900/50"
                    >
                      <td className="px-3 py-2 font-mono">{r?.patente || r?.codigo || "—"}</td>
                      <td className="px-3 py-2">
                        {typeof r?.viajes_mes === "number"
                          ? r.viajes_mes
                          : typeof r?.servicios_mes === "number"
                          ? r.servicios_mes
                          : typeof r?.cantidad === "number"
                          ? r.cantidad
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{r?.estado || "—"}</td>
                      <td className="px-3 py-2 text-white/60">{r?.detalle || r?.nota || "—"}</td>
                    </tr>
                  ))}

                  {normalize(viajesRows).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        Sin datos de viajes para {mes}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-white/50 mt-3">
              * Esta tabla sale de <span className="font-mono">getProveedorFlota</span>{" "}
              o fallback <span className="font-mono">getGruasProveedor</span>.
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Fotos vehículo */}
      {fotoVehOpen && vehiculoSeleccionado?.id && (
        <VehiculoFotosModal
          api={api}
          proveedorId={proveedorId}
          vehiculo={vehiculoSeleccionado}
          onClose={() => setFotoVehOpen(false)}
          // ✅ clave: actualiza thumbnail en grilla instantáneo
          onUploaded={(secureUrl) => {
            applyVehiculoThumb(vehiculoSeleccionado.id, secureUrl);
            // opcional: mantener cache sincronizado con backend
            ensureFotosLoaded(vehiculoSeleccionado.id);
          }}
        />
      )}
    </>
  );
}

/* =========================
   RowKV helper
========================= */
function RowKV({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/55">{k}</span>
      <span className="text-white/85 text-right break-words">{v}</span>
    </div>
  );
}

/* =========================
   VehiculoFotosModal (SOLO ARCHIVO)
========================= */
function VehiculoFotosModal({ api, proveedorId, vehiculo, onClose, onUploaded }) {
  const vehiculoId = vehiculo?.id;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [tipo, setTipo] = useState("FRENTE");
  const [uploading, setUploading] = useState(false);

  const inputRef = useRef(null);

  const FOTO_TIPOS = ["FRENTE", "TRASERA", "LATERAL", "INTERIOR", "OTRA"];

  async function load() {
    if (!proveedorId || !vehiculoId) return;
    setLoading(true);
    setErr("");
    try {
      const data = await api.listVehiculoFotos?.(proveedorId, vehiculoId);
      setItems(normalize(data));
    } catch (e) {
      setErr(e?.message || "No se pudieron cargar las fotos");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedorId, vehiculoId]);

  async function addByFile(file) {
    if (!file) return;

    const MAX_MB = 12;
    if (file.size > MAX_MB * 1024 * 1024) return alert(`Máx ${MAX_MB}MB`);
    if (!/image\//i.test(file.type)) return alert("Subí una imagen (JPG/PNG/WebP)");

    setUploading(true);
    setErr("");

    try {
      const folder = `de-thames/gruas/proveedores/${proveedorId}/vehiculos/${vehiculoId}`;
      const up = await uploadToCloudinary(file, { folder });
      const secureUrl = up?.secure_url || up?.url;
      const publicId = up?.public_id || up?.publicId;

      if (!secureUrl) throw new Error("Upload sin URL");

      await api.addVehiculoFoto?.(proveedorId, vehiculoId, {
        tipo,
        url: secureUrl,
        public_id: publicId,
      });

      // ✅ clave: avisar al padre para que se vea el camión en la grilla SIN F5
      onUploaded?.(secureUrl);

      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo subir/guardar la foto");
    } finally {
      setUploading(false);
    }
  }

  async function remove(fotoId) {
    if (!window.confirm("¿Eliminar foto?")) return;
    setErr("");
    try {
      await api.deleteVehiculoFoto?.(proveedorId, vehiculoId, fotoId);
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo eliminar");
    }
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full h-[100dvh] md:h-auto md:max-w-4xl md:mx-auto md:my-8 md:rounded-2xl bg-[#111418] border border-white/10 p-3 md:p-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-9 w-9 grid place-content-center rounded-lg bg-white/10 hover:bg-white/20"
          type="button"
        >
          <HiX className="text-white" />
        </button>

        <div className="pr-10">
          <h3 className="text-white font-semibold text-base flex items-center gap-2">
            <HiPhotograph className="text-xl" />
            Fotos — {vehiculo?.patente || `Vehículo #${vehiculoId}`}
          </h3>
          <div className="text-xs text-white/50 mt-1">
            /api/gruas/proveedores/{proveedorId}/vehiculos/{vehiculoId}/fotos/
          </div>
        </div>

        {err && (
          <div className="mt-3 p-3 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {err}
          </div>
        )}

        {/* add row (SOLO ARCHIVO) */}
        <div className="mt-4 rounded-xl border border-gray-800 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-white/80 font-semibold">Agregar foto</div>
            <div className="text-xs text-white/50">Elegí tipo y subí un archivo</div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <label className="md:col-span-4 text-sm text-white/80">
              Tipo
              <select
                className="w-full mt-1 px-3 py-2 bg-gray-900 text-white rounded border border-gray-800"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {FOTO_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-8 flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-60"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <HiUpload className="inline -mt-0.5" /> {uploading ? "Subiendo…" : "Subir archivo"}
              </button>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addByFile(f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="md:col-span-12 text-[11px] text-white/45">
              * Máx 12MB. Formatos: JPG/PNG/WebP.
            </div>
          </div>
        </div>

        {/* grid */}
        <div className="mt-4">
          {loading ? (
            <div className="p-8 text-center text-white/60">Cargando…</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {normalize(items).map((f) => (
                <div
                  key={f?.id || f?.url}
                  className="rounded-xl border border-gray-800 bg-black/20 overflow-hidden"
                >
                  <div className="aspect-square bg-black">
                    {f?.url ? (
                      <img
                        src={f.url}
                        alt={f?.tipo || "foto"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-content-center text-white/40 text-sm">
                        Sin URL
                      </div>
                    )}
                  </div>
                  <div className="p-2 text-xs text-white/70 flex items-center justify-between gap-2">
                    <span className="truncate">{f?.tipo || "—"}</span>
                    <div className="flex items-center gap-1">
                      {f?.url && (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700"
                          title="Abrir"
                        >
                          <HiExternalLink className="inline -mt-0.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700"
                        onClick={() => remove(f.id)}
                        title="Eliminar"
                      >
                        <HiTrash className="inline -mt-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {normalize(items).length === 0 && (
                <div className="col-span-2 md:col-span-4 py-10 text-center text-white/50 text-sm">
                  Sin fotos cargadas para este vehículo.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
