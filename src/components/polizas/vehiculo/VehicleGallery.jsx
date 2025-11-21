// src/components/polizas/vehiculo/VehicleGallery.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  HiOutlinePhotograph,
  HiUpload,
  HiTrash,
  HiStar,
  HiX,
  HiArrowLeft,
  HiArrowRight,
  HiDownload,
  HiEye,
  HiRefresh,
  HiClipboardCopy,
} from "react-icons/hi";
import { uploadToCloudinary } from "../../../utils/cloudinary";
import { PolizasAPI } from "../../../api/polizas";
import { updatePoliza } from "../../../store/slices/polizasSlice";

const shell =
  "rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-xl shadow-black/20";
const linkStyle =
  "inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ring-sky-400/40";

// 🔹 Incluimos TUBO_GNC para poder subir / filtrar esa foto
const TIPO_FOTO = [
  "PATENTE",
  "FRENTE",
  "LATERAL_IZQ",
  "LATERAL_DER",
  "TRASERA",
  "INTERIOR",
  "TUBO_GNC",
  "VIN",
  "OTRA",
];

function SegBtn({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
        active
          ? "bg-sky-600 text-white border-sky-600 hover:bg-sky-500"
          : "bg-white/10 hover:bg-white/20 text-white border-white/10"
      }`}
    >
      {children}
    </button>
  );
}

async function apiGetFotos(polizaId) {
  try {
    if (PolizasAPI?.getFotosVehiculo) {
      const data = await PolizasAPI.getFotosVehiculo({ poliza: polizaId });
      return Array.isArray(data) ? data : data?.results || [];
    }
  } catch (e) {
    console.warn("[VehicleGallery] getFotosVehiculo fallback", e);
  }

  const r = await fetch(
    `/api/polizas/fotos/?poliza=${encodeURIComponent(polizaId)}`,
    { credentials: "include" }
  );
  if (!r.ok) throw new Error("No se pudieron cargar las fotos");
  const d = await r.json();
  return Array.isArray(d) ? d : d?.results || [];
}

async function apiCrearFoto(payload) {
  try {
    if (PolizasAPI?.crearFotoVehiculo) {
      return await PolizasAPI.crearFotoVehiculo(payload);
    }
  } catch (e) {
    console.warn("[VehicleGallery] crearFotoVehiculo fallback", e);
  }

  const r = await fetch(`/api/polizas/fotos/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d?.detail || d?.message || "No se pudo crear la foto");
  }
  return await r.json();
}

async function apiBorrarFoto(id) {
  try {
    if (PolizasAPI?.borrarFotoVehiculo) {
      return await PolizasAPI.borrarFotoVehiculo(id);
    }
    if (PolizasAPI?.deleteFoto) {
      return await PolizasAPI.deleteFoto(id);
    }
  } catch (e) {
    console.warn("[VehicleGallery] borrarFotoVehiculo fallback", e);
  }

  const r = await fetch(`/api/polizas/fotos/${id}/`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok && r.status !== 204) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d?.detail || d?.message || "No se pudo eliminar la foto");
  }
  return true;
}

const byNewest = (a, b) => {
  const ta = a?.subido_en ? new Date(a.subido_en).getTime() : 0;
  const tb = b?.subido_en ? new Date(b.subido_en).getTime() : 0;
  if (tb !== ta) return tb - ta;
  return Number(b?.id || 0) - Number(a?.id || 0);
};

/* ====== Mapeo de tipos a labels humanos (lado → conductor / acompañante) ====== */
function mapTipoLabel(t) {
  switch (t) {
    case "LATERAL_IZQ":
      return "Lado conductor";
    case "LATERAL_DER":
      return "Lado acompañante";
    case "PATENTE":
      return "Patente";
    case "FRENTE":
      return "Frente";
    case "TRASERA":
      return "Parte trasera";
    case "INTERIOR":
      return "Interior";
    case "TUBO_GNC":
      return "Tubo GNC";
    case "VIN":
      return "VIN";
    case "OTRA":
      return "Otra";
    default:
      return t ? t.replace("_", " ") : "";
  }
}

export default function VehicleGallery({ polizaId, currentPerfilUrl, onChanged }) {
  const dispatch = useDispatch();

  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtro, setFiltro] = useState("TODOS");
  const [tipoFoto, setTipoFoto] = useState("FRENTE");

  const [subiendo, setSubiendo] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [perfilBusy, setPerfilBusy] = useState(false);

  const fileRef = useRef(null);

  // Carga inicial
  useEffect(() => {
    let alive = true;
    if (!polizaId) return;

    (async () => {
      setLoading(true);
      try {
        const list = await apiGetFotos(polizaId);
        if (!alive) return;
        setFotos([...list].sort(byNewest));
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar las fotos");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [polizaId]);

  const counts = useMemo(() => {
    const map = {};
    for (const k of ["TODOS", ...TIPO_FOTO]) map[k] = 0;
    for (const f of fotos) {
      map.TODOS += 1;
      if (map[f.tipo] !== undefined) map[f.tipo] += 1;
    }
    return map;
  }, [fotos]);

  const fotosFiltradas = useMemo(
    () => (filtro === "TODOS" ? fotos : fotos.filter((f) => f.tipo === filtro)),
    [fotos, filtro]
  );

  const esPerfil = useCallback(
    (f) => !!currentPerfilUrl && f.url === currentPerfilUrl,
    [currentPerfilUrl]
  );

  const subirVarios = async (files) => {
    if (!polizaId || !files?.length) return;

    setSubiendo(true);
    setUploadCount({ done: 0, total: files.length });

    try {
      const nuevos = [];

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        try {
          const data = await uploadToCloudinary(file, "de-thames/vehiculos");

          const created = await apiCrearFoto({
            poliza: polizaId,
            url: data.secure_url,
            public_id: data.public_id || "",
            tipo: tipoFoto, // 🔹 acá viaja "LATERAL_IZQ" / "LATERAL_DER" pero se muestra como conductor/acompañante
          });

          nuevos.push(created);
          setUploadCount((s) => ({ ...s, done: s.done + 1 }));
        } catch (e) {
          console.error(e);
          toast.error(`Error subiendo ${file.name || "archivo"}`);
        }
      }

      if (nuevos.length) {
        setFotos((arr) => [...nuevos, ...arr].sort(byNewest));
        toast.success(`Se agregaron ${nuevos.length} foto(s)`);
        onChanged?.();
      }
    } finally {
      setSubiendo(false);
      setUploadCount({ done: 0, total: 0 });
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPickFiles = (e) => subirVarios(Array.from(e.target.files || []));

  const eliminarFoto = async (id) => {
    if (!window.confirm("¿Eliminar esta foto?")) return;
    try {
      await apiBorrarFoto(id);
      setFotos((arr) => arr.filter((f) => f.id !== id));
      toast.success("Foto eliminada");
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo eliminar");
    }
  };

  const setDesdeGaleria = async (foto) => {
    if (!polizaId || !foto?.url) return;
    setPerfilBusy(true);
    try {
      if (PolizasAPI?.setFotoPerfil) {
        await PolizasAPI.setFotoPerfil(polizaId, {
          url: foto.url,
          public_id: foto.public_id || "",
        });
      } else {
        await dispatch(
          updatePoliza({
            id: polizaId,
            foto_perfil_url: foto.url,
            foto_perfil_public_id: foto.public_id || "",
          })
        ).unwrap();
      }
      toast.success("Foto establecida como perfil");
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo establecer como perfil");
    } finally {
      setPerfilBusy(false);
    }
  };

  const openViewerAt = (idx) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };
  const closeViewer = () => setViewerOpen(false);
  const prev = () =>
    setViewerIndex((i) => (i - 1 + fotosFiltradas.length) % fotosFiltradas.length);
  const next = () =>
    setViewerIndex((i) => (i + 1) % fotosFiltradas.length);

  const current = fotosFiltradas[viewerIndex];

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className={shell}>
      {/* Forzar dropdowns oscuros */}
      <style>{`
        select.dark-select { color-scheme: dark; background-color: rgba(255,255,255,0.06); color:#fff; }
        select.dark-select:focus { outline: none; }
        select.dark-select option,
        select.dark-select optgroup { background-color: #0b0f19; color:#fff; }
      `}</style>

      {/* Barra superior */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="p-1.5 rounded-lg bg-white/10 border border-white/10">
            <HiOutlinePhotograph className="w-4 h-4 text-sky-300" />
          </span>
          Galería del vehículo
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex gap-2">
            <SegBtn active={filtro === "TODOS"} onClick={() => setFiltro("TODOS")}>
              Todos · {counts.TODOS || 0}
            </SegBtn>
            {TIPO_FOTO.map((t) => (
              <SegBtn
                key={t}
                active={filtro === t}
                onClick={() => setFiltro(t)}
              >
                {mapTipoLabel(t)} · {counts[t] || 0}
              </SegBtn>
            ))}
          </div>

          <div className="md:hidden flex gap-2">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="dark-select rounded-lg bg-white/10 border border-white/10 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 ring-sky-400/30"
            >
              {["TODOS", ...TIPO_FOTO].map((t) => (
                <option key={t} value={t}>
                  {t === "TODOS" ? "Todos" : mapTipoLabel(t)} · {counts[t] || 0}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tablero: primera tarjeta es “Agregar” */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Tarjeta Agregar */}
          <div className="rounded-xl border border-dashed border-sky-400/60 bg-sky-400/10 p-4 flex flex-col justify-between min-h-[12rem]">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white">Agregar fotos</div>
              <div className="text-xs text-white/80">
                Serán guardadas como:{" "}
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                  {mapTipoLabel(tipoFoto)}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={tipoFoto}
                onChange={(e) => setTipoFoto(e.target.value)}
                className="dark-select rounded bg-white/10 border border-white/10 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 ring-sky-400/30"
              >
                {TIPO_FOTO.map((t) => (
                  <option key={t} value={t}>
                    {mapTipoLabel(t)}
                  </option>
                ))}
              </select>

              <div className="col-span-1" />

              <div className="col-span-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={onPickFiles}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm px-3 py-2 transition-colors cursor-pointer"
                >
                  {subiendo ? (
                    <HiRefresh className="animate-spin" />
                  ) : (
                    <HiUpload className="w-4 h-4" />
                  )}
                  {subiendo
                    ? `Subiendo ${uploadCount.done}/${uploadCount.total}`
                    : "Seleccionar archivos"}
                </button>

                {subiendo && uploadCount.total > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{
                        width: `${Math.round(
                          (uploadCount.done / uploadCount.total) * 100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tarjetas de fotos */}
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="h-64 rounded-xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))
          ) : fotosFiltradas.length ? (
            fotosFiltradas.map((f, idx) => (
              <div
                key={f.id}
                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col"
              >
                <div className="relative">
                  {esPerfil(f) && (
                    <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40">
                      <HiStar className="w-3 h-3" /> Perfil
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openViewerAt(idx)}
                    className="block w-full aspect-[16/10] md:aspect-[16/9] bg-black/30 cursor-pointer"
                    title="Ver"
                  >
                    <img
                      src={f.url}
                      alt={f.tipo}
                      className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                    />
                  </button>
                </div>

                <div className="p-3 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      onClick={() => openViewerAt(idx)}
                      className={linkStyle}
                    >
                      <HiEye className="w-4 h-4" /> Ver
                    </span>

                    <span
                      onClick={() => !esPerfil(f) && setDesdeGaleria(f)}
                      className={`${linkStyle} ${
                        esPerfil(f)
                          ? "text-white/60 hover:text-white/60 cursor-default"
                          : "text-amber-300 hover:text-amber-200"
                      }`}
                    >
                      <HiStar className="w-4 h-4" />{" "}
                      {esPerfil(f) ? "Es perfil" : "Perfil"}
                    </span>

                    <span
                      onClick={() => copy(f.url)}
                      className={linkStyle}
                    >
                      <HiClipboardCopy className="w-4 h-4" /> Copiar
                    </span>

                    <button
                      type="button"
                      onClick={() => eliminarFoto(f.id)}
                      className="ml-auto px-2 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <HiTrash className="w-4 h-4" /> Eliminar
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] text-white/80">
                    {mapTipoLabel(f.tipo) || "OTRA"} ·{" "}
                    {f.subido_en
                      ? dayjs(f.subido_en).format("DD/MM/YYYY HH:mm")
                      : "—"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-sm text-white/70">
              No hay fotos para este filtro.
            </div>
          )}
        </div>
      </div>

      {/* Visor */}
      {viewerOpen && current && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeViewer}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative w-full max-w-5xl">
              <img
                src={current.url}
                alt={current.tipo}
                className="w-full max-h-[75vh] object-contain rounded-xl border border-white/10 shadow-2xl"
              />

              <button
                type="button"
                title="Cerrar"
                onClick={closeViewer}
                className="absolute -top-3 -right-3 w-8 h-8 grid place-items-center rounded-lg bg-black/70 text-white cursor-pointer"
              >
                <HiX className="w-5 h-5" />
              </button>

              <button
                type="button"
                title="Anterior"
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-lg bg-black/70 text-white cursor-pointer"
              >
                <HiArrowLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                title="Siguiente"
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-lg bg-black/70 text-white cursor-pointer"
              >
                <HiArrowRight className="w-5 h-5" />
              </button>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/90">
                <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                  {mapTipoLabel(current.tipo) || "OTRA"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                  {current.subido_en
                    ? dayjs(current.subido_en).format("DD/MM/YYYY HH:mm")
                    : "—"}
                </span>

                <div className="ml-auto flex gap-3">
                  <a
                    href={current.url}
                    download
                    className={linkStyle}
                  >
                    <HiDownload className="w-4 h-4" /> Descargar
                  </a>

                  <span
                    onClick={() => !esPerfil(current) && setDesdeGaleria(current)}
                    className={`${linkStyle} ${
                      esPerfil(current)
                        ? "text-white/60 hover:text-white/60 cursor-default"
                        : "text-amber-300 hover:text-amber-200"
                    }`}
                  >
                    <HiStar className="w-4 h-4" />{" "}
                    {esPerfil(current) ? "Es perfil" : "Usar como perfil"}
                  </span>
                </div>
              </div>

              <div className="mt-1 text-center text-xs text-white/70">
                Imagen {viewerIndex + 1} de {fotosFiltradas.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
