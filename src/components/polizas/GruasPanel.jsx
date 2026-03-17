// src/components/polizas/GruasPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  HiOutlinePhotograph,
  HiCheckCircle,
  HiExclamationCircle,
  HiRefresh,
  HiPlus,
  HiCloudDownload,
  HiLink,
  HiExternalLink,
  HiUpload,
  HiDocumentText,
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";
import { GruasAPI } from "../../api/gruas";
import { uploadToCloudinary } from "../../utils/cloudinary";

function Pill({ ok, text }) {
  const cls = ok
    ? "bg-emerald-500/15 text-emerald-300"
    : "bg-yellow-500/15 text-yellow-300";
  return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>{text}</span>;
}

function LoadingButton({ onClick, loading, children, className = "", disabled, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-3 py-1.5 rounded-lg inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt?.getTime?.())) return String(d);
    return dt.toLocaleDateString();
  } catch {
    return String(d);
  }
}

export default function GruasPanel({ polizaId }) {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  
  // ----- Debug: de dónde saco el ID -----
  const params = useParams?.() || {};
  const idFromUrlRaw = params.id ?? params.polizaId ?? params.poliza ?? null;
  const idFromUrl = idFromUrlRaw != null ? Number(idFromUrlRaw) : null;

  const polizaNum = Number(polizaId ?? idFromUrl ?? 0);

  // ----- Estado principal -----
  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState(null);

  // Planes + modal (asociar)
  const [planes, setPlanes] = useState([]);
  const [planSel, setPlanSel] = useState("");
  const [modalMode, setModalMode] = useState(null); // null | 'asociar'

  // Importación desde galería
  const [importando, setImportando] = useState(false);

  // Contrato
  const [contratoOpen, setContratoOpen] = useState(false);
  const [contratoFile, setContratoFile] = useState(null);
  const [contratoURL, setContratoURL] = useState("");
  const [subiendoContrato, setSubiendoContrato] = useState(false);

  // 🛡️ Lógica de permisos
  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  const adhesion = res?.adhesion || null;
  const operable = res?.operable || null;
  const stats = res?.stats || null;

  const fotos = useMemo(() => adhesion?.fotos || [], [adhesion?.fotos]);
  const fotosPatente = fotos.filter((f) => f.tipo === "PATENTE");
  const faltanPatente = Math.max(0, 4 - (fotosPatente?.length || 0));

  const contrato = adhesion?.contrato || {
    firmado: false,
    firmado_en: null,
    archivo_url: "",
  };

  const carenciaRestante = adhesion?.carencia_dias_restantes ?? 0;
  const servicioActivoDesde = adhesion?.fecha_carencia_fin || null;

  async function load() {
    if (!polizaNum || Number.isNaN(polizaNum)) {
      setRes(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await GruasAPI.getPolizaResumen(polizaNum);
      setRes(data);
    } catch (e) {
      console.error("[GruasPanel] Error cargando resumen grúa:", e);
      toast.error(e.message || "No se pudo cargar la grúa de esta póliza.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!polizaNum) {
      setLoading(false);
      return;
    }
    load();
  }, [polizaNum]);

  async function ensurePlanes() {
    const p = await GruasAPI.getPlanes();
    const activos = Array.isArray(p) ? p.filter((x) => x?.activo !== false) : [];
    setPlanes(activos);
    setPlanSel((prev) => prev || (activos?.[0]?.id || ""));
  }

  async function openModal(mode) {
    // 🛡️ Solo Admin puede asociar grúas nuevas
    if (!isWebAdmin) {
      toast.error("Solo los administradores pueden asociar servicios de grúa.");
      return;
    }

    if (!polizaNum) {
      toast.error("ID de póliza inválido.");
      return;
    }
    try {
      await ensurePlanes();
      setModalMode(mode); 
    } catch (e) {
      toast.error(e.message || "No se pudieron cargar los planes.");
    }
  }

  function closeModal() {
    setModalMode(null);
  }

  async function submitModal() {
    if (!planSel) {
      toast.error("Elegí un plan.");
      return;
    }
    setLoading(true);
    try {
      await GruasAPI.asociarGrua(polizaNum, {
        plan_id: Number(planSel),
        auto_importar_galeria: true,
      });
      toast.success("Grúa asociada a la póliza.");
      setModalMode(null);
      await load();
    } catch (e) {
      toast.error(e.message || "No se pudo completar la operación.");
    } finally {
      setLoading(false);
    }
  }

  async function importarDesdeGaleria() {
    if (!adhesion?.id || !polizaNum) return;
    setImportando(true);
    try {
      const resImp = await GruasAPI.importarFotosDesdeGaleria({
        poliza: polizaNum,
        adhesion: adhesion.id,
        fotoIds: [],
        minimoPatente: 4,
      });
      const { creadas = 0, omitidas = 0 } = resImp || {};
      if (creadas === 0 && omitidas === 0) {
        toast("Sin cambios en fotos.", { icon: "ℹ️" });
      } else {
        toast.success(`Importación lista · Creadas: ${creadas} · Omitidas: ${omitidas}`);
      }
      await load();
    } catch (e) {
      toast.error(e.message || "No se pudo importar desde la galería.");
    } finally {
      setImportando(false);
    }
  }

  function openContrato() {
    // 🛡️ Solo Admin puede subir contratos firmados
    if (!isWebAdmin) {
      toast.error("Acceso denegado: Solo el administrador puede subir contratos.");
      return;
    }

    if (!adhesion?.id) {
      toast.error("Necesitás una adhesión activa para subir el contrato.");
      return;
    }
    setContratoFile(null);
    setContratoURL("");
    setContratoOpen(true);
  }

  function closeContrato() {
    setContratoOpen(false);
  }

  async function subirContrato() {
    if (!adhesion?.id) return;
    setSubiendoContrato(true);
    try {
      let finalURL = "";
      if (contratoFile) {
        const up = await uploadToCloudinary(contratoFile, `gruas/contratos/${adhesion.id}`);
        finalURL = up?.secure_url;
        if (!finalURL) throw new Error("No se obtuvo URL del contrato.");
      } else if (contratoURL && contratoURL.trim() !== "") {
        finalURL = contratoURL.trim();
      } else {
        toast.error("Elegí un archivo o ingresá una URL.");
        setSubiendoContrato(false);
        return;
      }
      await GruasAPI.firmarContrato(adhesion.id, { archivo_url: finalURL });
      toast.success("Contrato guardado.");
      setContratoOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message || "No se pudo guardar el contrato.");
    } finally {
      setSubiendoContrato(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-400/20 bg-neutral-900/60 p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-neutral-200/20 border border-neutral-400/20">
            <HiOutlinePhotograph className="w-5 h-5 text-primary-400" />
          </span>
          <div>
            <div className="text-sm font-semibold text-neutral-100">
              Grúa / Asistencia
            </div>
            <div className="text-xs text-neutral-400">
              Sucursal: {res?.adhesion?.oficina_nombre || user?.perfil?.oficina_nombre || 'Local'}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <LoadingButton
            onClick={load}
            loading={loading}
            icon={HiRefresh}
            className="bg-neutral-200/20 text-neutral-100 border border-neutral-400/20 hover:bg-neutral-200/30 w-full sm:w-auto"
          >
            Actualizar
          </LoadingButton>

          {/* Único botón para alta - PROTEGIDO POR ROL */}
          {isWebAdmin && (
            <LoadingButton
              onClick={() => openModal("asociar")}
              loading={false}
              icon={HiLink}
              disabled={!polizaNum}
              className="bg-emerald-600 text-white hover:opacity-90 w-full sm:w-auto"
            >
              Asociar grúa
            </LoadingButton>
          )}

          {/* Si ya hay adhesión → importar */}
          {adhesion && (
            <LoadingButton
              onClick={importarDesdeGaleria}
              loading={importando}
              icon={HiCloudDownload}
              className="bg-primary-400 text-neutral-900 font-semibold hover:opacity-90 w-full sm:w-auto"
            >
              Importar 4 desde galería
            </LoadingButton>
          )}
        </div>
      </header>

      <div className="mt-4">
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-neutral-800/60" />
        ) : !adhesion ? (
          <div className="text-sm text-neutral-300">
            No hay adhesión activa para esta póliza. 
            {isWebAdmin ? " Usá el botón para vincular el servicio." : " Contactá con un administrador para dar de alta la grúa."}
          </div>
        ) : (
          <>
            {/* Banner de estado */}
            <div className="rounded-2xl border border-neutral-400/20 bg-neutral-950/70 p-4 shadow-inner">
              {carenciaRestante > 0 ? (
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-amber-300/90 font-bold">Activación programada</div>
                    <div className="mt-1 text-2xl sm:text-3xl md:text-4xl font-black text-amber-300">
                      Se activa en <span className="text-3xl sm:text-4xl md:text-5xl">{carenciaRestante}</span> día{carenciaRestante === 1 ? "" : "s"}
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      Inicio de servicio: <b>{fmtDate(servicioActivoDesde)}</b>
                    </div>
                  </div>
                  <div className="flex items-start md:items-center gap-2">
                    <Pill ok={!!operable?.ok} text={operable?.ok ? "Operable ahora" : "Con restricciones"} />
                    {!operable?.ok && operable?.motivo && (
                      <span className="text-xs text-yellow-300 inline-flex items-center gap-1 font-medium bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                        <HiExclamationCircle className="w-4 h-4" /> {operable.motivo}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-emerald-300/90 font-bold">Servicio activo</div>
                    <div className="mt-1 text-2xl sm:text-3xl md:text-4xl font-black text-emerald-300">Operativo para usar</div>
                    <div className="mt-1 text-xs text-neutral-400">Activo desde: <b>{fmtDate(servicioActivoDesde)}</b></div>
                  </div>
                  <div className="flex items-start md:items-center gap-2">
                    <Pill ok={!!operable?.ok} text={operable?.ok ? "Operable ahora" : "Con restricciones"} />
                    {!operable?.ok && operable?.motivo && (
                      <span className="text-xs text-yellow-300 inline-flex items-center gap-1 font-medium bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                        <HiExclamationCircle className="w-4 h-4" /> {operable.motivo}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Datos del plan */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-400/20 bg-neutral-900/60 p-3">
                <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">Plan contratado</div>
                <div className="text-sm font-bold text-neutral-100 uppercase">
                  {adhesion?.plan?.nombre || "—"} · {adhesion?.plan?.km_incluidos ?? 0} km
                </div>
                <div className="mt-1 text-xs text-neutral-400">Km adicional: {adhesion?.plan?.costo_km_adicional != null ? `$${Number(adhesion.plan.costo_km_adicional).toFixed(2)}` : "—"}</div>
                <div className="mt-3 flex gap-4 text-[10px] uppercase font-bold">
                  <div><span className="text-neutral-500">Carencia hasta:</span> <span className="text-neutral-300">{fmtDate(adhesion?.fecha_carencia_fin)}</span></div>
                  <div><span className="text-neutral-500">Rehabilita:</span> <span className="text-neutral-300">{fmtDate(adhesion?.rehabilitar_desde)}</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-400/20 bg-neutral-900/60 p-3">
                <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1">Historial de uso</div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="rounded-lg border border-white/5 bg-black/20 p-2">
                    <div className="text-[9px] text-neutral-500 font-bold uppercase">Total Solicitudes</div>
                    <div className="text-xl font-black text-neutral-100">{stats?.total_solicitudes ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-black/20 p-2">
                    <div className="text-[9px] text-neutral-500 font-bold uppercase">En 12 meses</div>
                    <div className="text-xl font-black text-neutral-100">{stats?.en_12_meses ?? 0}</div>
                  </div>
                </div>
                {stats?.ultima_solicitud && (
                  <div className="mt-2 text-[10px] text-neutral-400 font-medium">
                    Última: <span className="text-primary-300">#{stats.ultima_solicitud.id}</span> · {fmtDate(stats.ultima_solicitud.fecha)}
                  </div>
                )}
              </div>
            </div>

            {/* Contrato */}
            <div className="mt-4 rounded-xl border border-neutral-400/20 bg-neutral-900/70 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-neutral-200/20 border border-neutral-400/20">
                    <HiDocumentText className="w-4 h-4 text-primary-300" />
                  </span>
                  <div className="text-sm font-bold text-neutral-100">Contrato Legal</div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill ok={!!contrato?.firmado} text={contrato?.firmado ? "Registrado" : "Pendiente"} />
                  {isWebAdmin && (
                    <LoadingButton onClick={openContrato} loading={false} icon={HiUpload} className="bg-neutral-100 text-neutral-900 font-bold">
                      Subir archivo
                    </LoadingButton>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-medium border-t border-white/5 pt-2">
                <div className="text-neutral-400">
                  {contrato?.firmado_en ? <>Firma: <b>{fmtDate(contrato.firmado_en)}</b></> : "Documento aún no subido"}
                </div>
                {contrato?.archivo_url ? (
                  <a href={contrato.archivo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-bold">
                    Ver contrato <HiExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : <span className="text-neutral-600">Archivo no disponible</span>}
              </div>
            </div>

            {/* Galería de fotos del servicio */}
            <div className="mt-6 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-neutral-100 uppercase tracking-tight">Fotos de Adhesión</div>
                <div className="text-[10px] font-black uppercase text-neutral-500">
                  PATENTE: <span className={faltanPatente > 0 ? "text-amber-400" : "text-emerald-400"}>{fotosPatente.length} / 4</span>
                </div>
              </div>

              {fotos.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {fotos.map((f) => (
                    <div key={f.id} className="group relative rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg">
                      <div className="aspect-video bg-neutral-950">
                        <img src={f.url} alt={f.tipo} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-1.5 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-white truncate">{f.tipo || "OTRA"}</span>
                        {f.tipo === "PATENTE" && <HiCheckCircle className="text-emerald-400 w-3 h-3" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center rounded-xl bg-black/20 border border-dashed border-white/10">
                   <HiOutlinePhotograph className="text-4xl text-neutral-700 mb-2" />
                   <p className="text-xs text-neutral-500 font-bold uppercase">Sin fotos vinculadas</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Asociar - SOLO ADMIN */}
      {modalMode === "asociar" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in">
          <div className="absolute inset-0" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-gray-900 text-white border border-white/10 shadow-2xl p-6">
            <div className="text-lg font-black uppercase tracking-tighter mb-4 text-emerald-400">Vincular Grúa</div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase text-neutral-500 mb-1 block">Seleccionar Plan</span>
                <select
                  value={planSel}
                  onChange={(e) => setPlanSel(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 ring-emerald-500/50 appearance-none"
                >
                  {(planes || []).map((p) => (
                    <option key={p.id} value={p.id} className="bg-gray-900">{p.nombre} · {p.km_incluidos} KM Incluidos</option>
                  ))}
                </select>
              </label>

              {!planes.length && <div className="text-xs text-amber-300 font-bold">⚠️ No hay planes configurados en el sistema.</div>}

              <p className="text-[10px] text-neutral-500 font-bold leading-relaxed italic">
                * Al asociar, el sistema importará automáticamente las fotos de patente desde la galería de la póliza para cumplir con los requisitos.
              </p>

              <div className="flex gap-3 pt-4">
                <button onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-bold uppercase text-xs transition-all">Cancelar</button>
                <LoadingButton onClick={submitModal} loading={loading} className="flex-1 bg-emerald-600 text-white font-black uppercase text-xs shadow-lg shadow-emerald-900/40 active:scale-95">Asociar</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Subir Contrato - SOLO ADMIN */}
      {contratoOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in">
          <div className="absolute inset-0" onClick={closeContrato} />
          <div className="relative w-full max-w-md rounded-2xl bg-gray-900 text-white border border-white/10 shadow-2xl p-6">
            <div className="text-lg font-black uppercase tracking-tighter mb-4 text-primary-400">Documento Legal</div>
            <div className="space-y-5">
              <div className="text-[10px] text-neutral-400 font-bold leading-relaxed uppercase">Sube el contrato firmado (PDF o Imagen) o ingresa un enlace externo.</div>

              <label className="block group">
                <span className="text-[10px] font-black uppercase text-neutral-500 mb-1.5 block group-hover:text-neutral-300 transition-colors">Seleccionar Archivo</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setContratoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30 transition-all"
                />
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500"><HiLink /></div>
                <input
                  type="url"
                  placeholder="PEGAR URL DEL CONTRATO..."
                  value={contratoURL}
                  onChange={(e) => setContratoURL(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 pl-10 pr-4 py-3 text-xs font-bold text-white outline-none focus:ring-2 ring-primary-500/50 transition-all placeholder:text-neutral-700"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={closeContrato} className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-bold uppercase text-xs transition-all">Cancelar</button>
                <LoadingButton onClick={subirContrato} loading={subiendoContrato} icon={HiUpload} className="flex-1 bg-primary-500 text-neutral-950 font-black uppercase text-xs shadow-lg shadow-primary-900/40 active:scale-95">Guardar</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}