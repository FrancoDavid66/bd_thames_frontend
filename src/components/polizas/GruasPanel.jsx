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
  // ----- Debug: de dónde saco el ID -----
  const params = useParams?.() || {};
  const idFromUrlRaw = params.id ?? params.polizaId ?? params.poliza ?? null;
  const idFromUrl = idFromUrlRaw != null ? Number(idFromUrlRaw) : null;

  console.log("[GruasPanel] prop.polizaId =", polizaId, " | idFromUrlRaw =", idFromUrlRaw);

  const polizaNum = Number(polizaId ?? idFromUrl ?? 0);
  console.log("[GruasPanel] polizaNum (resuelto) =", polizaNum);

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
    console.log("[GruasPanel] load() start · polizaNum =", polizaNum);
    if (!polizaNum || Number.isNaN(polizaNum)) {
      setRes(null);
      setLoading(false);
      console.log("[GruasPanel] No hay polizaNum. Skip fetch. loading=false");
      return;
    }
    setLoading(true);
    try {
      const data = await GruasAPI.getPolizaResumen(polizaNum);
      console.log("[GruasPanel] getPolizaResumen OK →", data);
      setRes(data);
    } catch (e) {
      console.error("[GruasPanel] getPolizaResumen ERROR →", e);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polizaNum]);

  async function ensurePlanes() {
    const p = await GruasAPI.getPlanes();
    const activos = Array.isArray(p) ? p.filter((x) => x?.activo !== false) : [];
    setPlanes(activos);
    setPlanSel((prev) => prev || (activos?.[0]?.id || ""));
  }

  async function openModal(mode) {
    if (!polizaNum) {
      toast.error("ID de póliza inválido.");
      return;
    }
    try {
      await ensurePlanes();
      setModalMode(mode); // 'asociar'
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

  // =======================
  // UI
  // =======================
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
              Reutiliza fotos de la galería (no hace falta re-subir).
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

          {/* Único botón para alta */}
          <LoadingButton
            onClick={() => openModal("asociar")}
            loading={false}
            icon={HiLink}
            disabled={!polizaNum}
            className="bg-emerald-600 text-white hover:opacity-90 w-full sm:w-auto"
          >
            Asociar grúa
          </LoadingButton>

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
        {!polizaNum && (
          <div className="mb-3 text-sm text-amber-300">
            No se encontró el ID de póliza en la vista.
          </div>
        )}

        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-neutral-800/60" />
        ) : !adhesion ? (
          <div className="text-sm text-neutral-300">
            No hay adhesión activa/vigente para esta póliza. Usá{" "}
            <b>“Asociar grúa”</b> para vincular el servicio (se intentará auto-importar{" "}
            <b>4 PATENTE</b> desde galería).
          </div>
        ) : (
          <>
            {/* ===== Banner grande de activación / estado ===== */}
            <div className="rounded-2xl border border-neutral-400/20 bg-neutral-950/70 p-4">
              {carenciaRestante > 0 ? (
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-amber-300/90">
                      Activación programada
                    </div>
                    <div className="mt-1 text-2xl sm:text-3xl md:text-4xl font-extrabold text-amber-300">
                      Se activa en{" "}
                      <span className="text-3xl sm:text-4xl md:text-5xl">
                        {carenciaRestante}
                      </span>{" "}
                      día{carenciaRestante === 1 ? "" : "s"}
                    </div>
                    <div className="mt-1 text-sm text-neutral-300">
                      Fecha de inicio de servicio:{" "}
                      <b>{fmtDate(servicioActivoDesde)}</b>
                    </div>
                  </div>
                  <div className="flex items-start md:items-center gap-2">
                    <Pill
                      ok={!!operable?.ok}
                      text={operable?.ok ? "Operable ahora" : "Con restricciones"}
                    />
                    {!operable?.ok && operable?.motivo && (
                      <span className="text-xs text-yellow-300 inline-flex items-center gap-1">
                        <HiExclamationCircle className="w-4 h-4" />{" "}
                        {operable.motivo}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-emerald-300/90">
                      Servicio activo
                    </div>
                    <div className="mt-1 text-2xl sm:text-3xl md:text-4xl font-extrabold text-emerald-300">
                      Operativo para usar
                    </div>
                    <div className="mt-1 text-sm text-neutral-300">
                      Activo desde: <b>{fmtDate(servicioActivoDesde)}</b>
                    </div>
                  </div>
                  <div className="flex items-start md:items-center gap-2">
                    <Pill
                      ok={!!operable?.ok}
                      text={operable?.ok ? "Operable ahora" : "Con restricciones"}
                    />
                    {!operable?.ok && operable?.motivo && (
                      <span className="text-xs text-yellow-300 inline-flex items-center gap-1">
                        <HiExclamationCircle className="w-4 h-4" />{" "}
                        {operable.motivo}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ===== Datos clave compactos ===== */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-400/20 bg-neutral-900/60 p-3">
                <div className="text-xs text-neutral-400">Plan</div>
                <div className="text-sm font-semibold text-neutral-100">
                  {adhesion?.plan?.nombre || "—"} ·{" "}
                  {adhesion?.plan?.km_incluidos ?? 0} km
                </div>
                <div className="mt-1 text-xs text-neutral-400">
                  Costo km adicional:{" "}
                  {adhesion?.plan?.costo_km_adicional != null
                    ? `$${Number(
                        adhesion.plan.costo_km_adicional
                      ).toFixed(2)}`
                    : "—"}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-neutral-300">
                  <div>
                    <div className="text-neutral-400">Carencia hasta</div>
                    <div className="font-medium">
                      {fmtDate(adhesion?.fecha_carencia_fin)}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400">Rehabilita desde</div>
                    <div className="font-medium">
                      {fmtDate(adhesion?.rehabilitar_desde)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-400/20 bg-neutral-900/60 p-3">
                <div className="text-xs text-neutral-400">Uso del servicio</div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded border border-neutral-400/20 bg-neutral-950/60 p-2">
                    <div className="text-[11px] text-neutral-400">
                      Total solicitudes
                    </div>
                    <div className="text-lg font-bold text-neutral-100">
                      {stats?.total_solicitudes ?? 0}
                    </div>
                  </div>
                  <div className="rounded border border-neutral-400/20 bg-neutral-950/60 p-2">
                    <div className="text-[11px] text-neutral-400">
                      Últ. 12 meses
                    </div>
                    <div className="text-lg font-bold text-neutral-100">
                      {stats?.en_12_meses ?? 0}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-neutral-300">
                  {stats?.ultima_solicitud ? (
                    <>
                      Última: #{stats.ultima_solicitud.id} ·{" "}
                      {fmtDate(stats.ultima_solicitud.fecha)}
                    </>
                  ) : (
                    <>Sin solicitudes previas</>
                  )}
                </div>
              </div>
            </div>

            {/* ===== Contrato ===== */}
            <div className="mt-4 rounded-xl border border-neutral-400/20 bg-neutral-900/70 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-neutral-200/20 border border-neutral-400/20">
                    <HiDocumentText className="w-4 h-4 text-primary-300" />
                  </span>
                  <div className="text-sm font-medium text-neutral-100">
                    Contrato de adhesión
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill
                    ok={!!contrato?.firmado}
                    text={contrato?.firmado ? "Firmado" : "Faltante"}
                  />
                  <LoadingButton
                    onClick={openContrato}
                    loading={false}
                    icon={HiUpload}
                    className="bg-neutral-100 text-neutral-900 hover:opacity-90"
                  >
                    Subir contrato
                  </LoadingButton>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs">
                <div className="text-neutral-300">
                  {contrato?.firmado_en ? (
                    <>
                      Firmado el <b>{fmtDate(contrato.firmado_en)}</b>
                    </>
                  ) : (
                    <>Aún no registrado</>
                  )}
                </div>
                {contrato?.archivo_url ? (
                  <a
                    href={contrato.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary-300 hover:underline"
                  >
                    Ver/Descargar{" "}
                    <HiExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-neutral-500">Sin archivo</span>
                )}
              </div>

              {/* Sub-banner dentro del card (no tapa la pantalla) */}
              {contrato?.firmado ? (
                <div className="mt-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-[12px] text-emerald-300">
                  ✅ Contrato subido correctamente.
                </div>
              ) : (
                <div className="mt-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[12px] text-amber-300">
                  ⚠️ Falta registrar el contrato de adhesión.
                </div>
              )}
            </div>

            {/* ===== Fotos ===== */}
            <div className="mt-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-neutral-100">
                  Fotos vinculadas a la adhesión
                </div>
                <div className="text-xs text-neutral-400">
                  PATENTE: <b>{fotosPatente.length}</b> / 4{" "}
                  {faltanPatente > 0 && (
                    <span className="text-amber-300">
                      · faltan {faltanPatente}
                    </span>
                  )}
                </div>
              </div>

              {fotos.length ? (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {fotos.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-xl overflow-hidden border border-neutral-400/20 bg-neutral-900/70"
                    >
                      <div className="aspect-video bg-neutral-900">
                        <img
                          src={f.url}
                          alt={f.tipo}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 text-xs text-neutral-300 flex items-center justify-between">
                        <div className="font-semibold">{f.tipo || "OTRA"}</div>
                        {f.tipo === "PATENTE" ? (
                          <span className="text-emerald-300 inline-flex items-center gap-1">
                            <HiCheckCircle className="w-4 h-4" /> OK
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-neutral-400">
                  Aún no hay fotos vinculadas. Usá{" "}
                  <b>“Importar 4 desde galería”</b>.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Asociar */}
      {modalMode === "asociar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-neutral-900 text-white border border-neutral-800 shadow-2xl p-4">
            <div className="font-semibold mb-3">
              Asociar grúa a la póliza
            </div>
            <div className="space-y-3">
              <label className="text-sm text-neutral-300">
                Plan
                <select
                  value={planSel}
                  onChange={(e) => setPlanSel(e.target.value)}
                  className="mt-1 w-full rounded bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
                >
                  {(planes || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {p.km_incluidos} km
                    </option>
                  ))}
                </select>
              </label>

              {!planes.length && (
                <div className="text-xs text-amber-300">
                  No hay planes disponibles. Creá uno en el panel de planes.
                </div>
              )}

              <p className="text-xs text-neutral-400">
                Se intentará <b>auto-importar 4 fotos de PATENTE</b> desde la
                galería de la póliza.
              </p>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  onClick={closeModal}
                  className="px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-sm w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <LoadingButton
                  onClick={submitModal}
                  loading={loading}
                  className="bg-blue-600 text-white hover:opacity-90 w-full sm:w-auto"
                >
                  Asociar
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Subir Contrato */}
      {contratoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeContrato}
          />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-neutral-900 text-white border border-neutral-800 shadow-2xl p-4">
            <div className="font-semibold mb-3">
              Subir contrato de adhesión
            </div>
            <div className="space-y-3">
              <div className="text-xs text-neutral-400">
                Podés subir un archivo <b>(imagen o PDF)</b> o pegar una URL
                directa al contrato. Si cargás ambas, se prioriza el archivo.
              </div>

              <label className="text-sm text-neutral-300">
                Archivo
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) =>
                    setContratoFile(e.target.files?.[0] || null)
                  }
                  className="mt-1 w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-neutral-600 file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700"
                />
              </label>
              {contratoFile && (
                <div className="text-xs text-neutral-400">
                  Seleccionado: <b>{contratoFile.name}</b>
                </div>
              )}

              <label className="text-sm text-neutral-300">
                o URL del contrato
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={contratoURL}
                    onChange={(e) => setContratoURL(e.target.value)}
                    className="flex-1 rounded bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
                  />
                  <HiExternalLink className="w-4 h-4 text-neutral-500" />
                </div>
              </label>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  onClick={closeContrato}
                  className="px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-sm w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <LoadingButton
                  onClick={subirContrato}
                  loading={subiendoContrato}
                  icon={HiUpload}
                  className="bg-emerald-600 text-white hover:opacity-90 w-full sm:w-auto"
                >
                  Guardar contrato
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
