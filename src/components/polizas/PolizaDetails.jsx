// src/components/polizas/PolizaDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaCar, FaEdit, FaTrash, FaExchangeAlt } from "react-icons/fa";
import {
  HiArrowLeft, HiChevronRight, HiOfficeBuilding,
  HiCash, HiDocumentText, HiShieldCheck,
} from "react-icons/hi";
import dayjs from "dayjs";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import { fetchPolizaPorId, deletePoliza, togglePolizaEstado } from "../../store/slices/polizasSlice";
import { PolizasAPI } from "../../api/polizas";
import { getProximaCuota } from "../../utils/cuotas";

import CuotasPanel from "./CuotasPanel";
import VehiculoDocsPanel from "./VehiculoDocsPanel";
import CuponesRoboPanel from "./CuponesRoboPanel";

import PolizaEditModal from "./PolizaEditModal";

import CardDuo from "../ui/CardDuo";
import Badge, { estadoATono } from "../ui/Badge";
import Boton3D from "../ui/Boton3D";
import ModalDuo from "../ui/ModalDuo";

/* ===================== Estados de póliza ===================== */
// ⚠️ Valores EXACTOS del backend (polizas/models.py → ESTADO_CHOICES).
//    Van en MINÚSCULA: el campo tiene choices y rechaza "ACTIVA" en mayúscula.
const ESTADOS_POLIZA = [
  { value: "activa",     label: "Activa",     tono: "verde"    },
  { value: "vencida",    label: "Vencida",    tono: "rojo"     },
  { value: "cancelada",  label: "Cancelada",  tono: "rojo"     },
  { value: "finalizada", label: "Finalizada", tono: "neutro"   },
];

// 🎨 Banner grande de estado (colores semáforo, paleta THAMES duo-*).
//    Devuelve las clases del banner + su etiqueta legible según el estado.
function bannerEstado(estadoRaw) {
  const v = String(estadoRaw ?? "").toLowerCase();
  const map = {
    activa: {
      label: "Activa",
      clases: "bg-duo-verde text-white",
    },
    vencida: {
      label: "Vencida",
      clases: "bg-duo-rojo text-white",
    },
    cancelada: {
      label: "Cancelada",
      clases: "bg-duo-rojo text-white",
    },
    finalizada: {
      label: "Finalizada",
      clases: "bg-suave text-white dark:bg-suave-dark",
    },
  };
  return map[v] || {
    label: estadoRaw ? String(estadoRaw).toUpperCase() : "Sin estado",
    clases: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark",
  };
}

// 🚫 Motivos de baja. Valores EXACTOS del backend (polizas/models.py → Poliza.MotivoBaja).
//    La baja automática (cron de las 9 hs) guarda siempre "INCUMPLIMIENTO_PAGO".
const MOTIVOS_BAJA = [
  { value: "INCUMPLIMIENTO_PAGO", label: "Cuota impaga" },
  { value: "MIGRACION_COMPANIA",  label: "Se pasó a otra compañía" },
  { value: "VENTA_VEHICULO",      label: "Vendió el auto" },
  { value: "SIN_USO",             label: "No lo usa" },
  { value: "OTRO",                label: "Otro" },
];

const fmtFecha = (iso) => (iso ? dayjs(iso).format("DD/MM/YYYY") : "");

// Primer mensaje de error que manda el backend (DRF: { campo: ["mensaje"] }).
function mensajeError(e, fallback) {
  if (typeof e === "string") return e;
  if (!e || typeof e !== "object") return fallback;
  if (e.detail) return String(e.detail);
  if (e.message) return String(e.message);
  const primero = Object.values(e)[0];
  if (Array.isArray(primero) && primero.length) return String(primero[0]);
  if (typeof primero === "string") return primero;
  return fallback;
}

// 🔕 Estados que DEJAN de recibir el recordatorio de cuotas por WhatsApp.
//    (Coincide con el backend: solo 'activa' y 'vencida' reciben mensajes.)
const ESTADOS_SIN_RECORDATORIO = ["cancelada", "finalizada"];

/* ===================== Helpers de presentación ===================== */
function SectionTitle({ Icon, title, right }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-[18px] w-[18px] text-duo-azul" />
      <span className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">{title}</span>
      {right ? <span className="ml-auto text-xs text-suave dark:text-suave-dark">{right}</span> : null}
    </div>
  );
}

function FilaDato({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-linea dark:border-linea-dark py-2.5 last:border-0">
      <span className="text-xs text-suave dark:text-suave-dark">{label}</span>
      <span className={`text-right text-[13px] font-medium text-titulo dark:text-titulo-dark ${mono ? "font-mono uppercase" : ""}`}>{value}</span>
    </div>
  );
}

export default function PolizaDetails() {
  const { id } = useParams();
  const polizaId = Number(id);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();

  const poliza = useSelector(
    (s) => s.polizas?.byId?.[polizaId] || s.polizas?.poliza || null
  );
  const loadStatus = useSelector((s) => s.polizas?.detailStatus || s.polizas?.status || "idle");
  const loadError = useSelector((s) => s.polizas?.detailError || s.polizas?.error || null);

  const [refreshTick, setRefreshTick] = useState(0);
  const [openEdit, setOpenEdit] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);

  // 🆕 Modal para cambiar estado
  const [openEstado, setOpenEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [savingEstado, setSavingEstado] = useState(false);
  // 🆕 Confirmación explícita cuando el nuevo estado deja de recibir recordatorios.
  const [aceptaSinRecordatorio, setAceptaSinRecordatorio] = useState(false);
  // 🚫 Motivo de la baja (cuando se pasa a Cancelada, o para corregirlo).
  const [motivoBaja, setMotivoBaja] = useState("");
  const [notaBaja, setNotaBaja] = useState("");

  const scrollToSection = (key) => {
    if (key === "documentos" || key === "vehiculo_docs") key = "vehiculo";
    const el = document.getElementById(key);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (polizaId && Number.isFinite(polizaId)) {
      dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
    }
  }, [polizaId, dispatch]);

  useEffect(() => {
    const refreshAll = async (targetId, focusTab) => {
      try {
        await PolizasAPI.refreshPack(targetId);
      } catch (e) {
        console.warn("[DBG] refreshPack ERROR", e);
      } finally {
        dispatch(fetchPolizaPorId({ id: targetId, force: true }));
        setRefreshTick((x) => x + 1);
        if (focusTab) scrollToSection(focusTab);
      }
    };

    const onAsociada = (ev) => {
      const d = ev?.detail || {};
      const target = Number(d.poliza_id || d.polizaId || polizaId);
      if (!target || target !== polizaId) return;
      refreshAll(target, d.focusTab || "vehiculo");
    };
    const onMediaImportada = (ev) => {
      const d = ev?.detail || {};
      const target = Number(d.poliza_id || d.polizaId || polizaId);
      if (!target || target !== polizaId) return;
      refreshAll(target, d.focusTab || "vehiculo");
    };
    const onRefrescar = () => {
      dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
      setRefreshTick((x) => x + 1);
    };

    window.addEventListener("solicitud:asociada", onAsociada);
    window.addEventListener("poliza:media_importada", onMediaImportada);
    window.addEventListener("poliza:refrescar", onRefrescar);
    return () => {
      window.removeEventListener("solicitud:asociada", onAsociada);
      window.removeEventListener("poliza:media_importada", onMediaImportada);
      window.removeEventListener("poliza:refrescar", onRefrescar);
    };
  }, [polizaId, dispatch]);

  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const cuotas = useMemo(() => (Array.isArray(poliza?.cuotas) ? poliza.cuotas : []), [poliza?.cuotas]);
  const proxima = useMemo(() => getProximaCuota(cuotas), [cuotas]);
  const cuponesRobo = useMemo(() => (Array.isArray(poliza?.cupones_robo) ? poliza.cupones_robo : []), [poliza?.cupones_robo]);

  const cli = poliza?.cliente || null;
  const clienteId = poliza?.cliente_id ?? cli?.id ?? null;
  const clienteNombre = [cli?.apellido, cli?.nombre].filter(Boolean).join(", ");
  const clienteDni = cli?.dni_cuit_cuil || cli?.dni || "";
  const iniciales = (clienteNombre || "?").split(/[\s,]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  const compania = poliza?.compania_nombre || poliza?.compania || "—";
  const cobertura = poliza?.cobertura || "—";
  const oficina = poliza?.oficina_nombre || user?.perfil?.oficina_nombre || "Local";
  // 🔢 Mostramos solo los ÚLTIMOS 4 caracteres del número de póliza.
  //    Ej: "SN-20260802232257-6981" → "#6981". Si no hay número, usamos el id.
  const numeroFuente = poliza?.numero_poliza || (poliza?.id != null ? String(poliza.id) : "");
  const numero = numeroFuente ? `#${numeroFuente.slice(-4)}` : "#";
  const tipoCarro = [poliza?.tipo, poliza?.carroceria].filter(Boolean).join(" · ");

  const onBack = () => navigate(-1);
  const onPerfilActualizado = () => dispatch(fetchPolizaPorId({ id: polizaId, force: true }));

  const handleConfirmDelete = async () => {
    try {
      await dispatch(deletePoliza(polizaId)).unwrap();
      toast.success("Póliza eliminada con éxito");
      navigate("/polizas", { replace: true });
    } catch (e) {
      toast.error(e?.message || "Error al eliminar");
    } finally {
      setOpenConfirm(false);
    }
  };

  // 🚫 Motivo y nota de la baja que tiene hoy la póliza (la nota automática no se edita).
  const bajaInfo = poliza?.baja_info || null;
  const estadoActual = (poliza?.estado || "").toLowerCase();
  const motivoActual = poliza?.motivo_baja || "";
  const notaActual = bajaInfo?.automatica ? "" : (poliza?.observaciones_baja || "");

  // 🆕 Abrir modal de estado con el estado actual preseleccionado
  const abrirCambioEstado = () => {
    setNuevoEstado(estadoActual);
    setAceptaSinRecordatorio(false); // reset del check al abrir
    setMotivoBaja(motivoActual || "INCUMPLIMIENTO_PAGO");
    setNotaBaja(notaActual);
    setOpenEstado(true);
  };

  // 🆕 ¿El estado elegido deja SIN recordatorio de cuotas? (cancelada / finalizada)
  //    Si ya estaba en ese estado (solo corrige el motivo), no hace falta aceptar de nuevo.
  const requiereConfirmacion = ESTADOS_SIN_RECORDATORIO.includes(nuevoEstado) && nuevoEstado !== estadoActual;
  const esBaja = nuevoEstado === "cancelada";
  const cambioMotivo = esBaja && estadoActual === "cancelada"
    && (motivoBaja !== motivoActual || notaBaja.trim() !== notaActual.trim());
  const faltaNotaOtro = esBaja && motivoBaja === "OTRO" && !notaBaja.trim();

  // 🆕 Guardar el nuevo estado (usa el thunk que ya existe: PATCH /polizas/:id/ { estado })
  const handleGuardarEstado = async () => {
    if (!polizaId || !nuevoEstado) return;
    if (nuevoEstado === estadoActual && !cambioMotivo) {
      setOpenEstado(false);
      return;
    }
    // 🔕 Si pasa a un estado sin recordatorio, exigir que acepte el aviso.
    if (requiereConfirmacion && !aceptaSinRecordatorio) {
      toast.error("Tenés que aceptar el aviso para continuar.");
      return;
    }
    // 🚫 Cancelada → hace falta el motivo ("Otro" → escribir cuál).
    if (esBaja && !motivoBaja) {
      toast.error("Elegí por qué se da de baja.");
      return;
    }
    if (faltaNotaOtro) {
      toast.error("Escribí cuál es el motivo de la baja.");
      return;
    }
    setSavingEstado(true);
    try {
      // El backend pone la fecha de baja (hoy) y, si se reactiva, borra la baja.
      const extra = esBaja ? { motivo_baja: motivoBaja, observaciones_baja: notaBaja.trim() } : undefined;
      await dispatch(togglePolizaEstado({ id: polizaId, estado: nuevoEstado, extra })).unwrap();
      toast.success(nuevoEstado === estadoActual ? "Motivo de la baja actualizado" : "Estado actualizado");
      setOpenEstado(false);
      dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
    } catch (e) {
      toast.error(mensajeError(e, "Error al cambiar estado"));
    } finally {
      setSavingEstado(false);
    }
  };

  if (loadStatus === "loading" || (!poliza && loadStatus !== "failed")) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-1/2 rounded bg-linea dark:bg-linea-dark" />
          <div className="h-20 w-full rounded-xl bg-linea dark:bg-linea-dark" />
          <div className="h-40 w-full rounded-xl bg-linea dark:bg-linea-dark" />
        </div>
      </div>
    );
  }

  if (loadStatus === "failed") {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-3 py-8 text-center sm:px-6">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-titulo dark:text-titulo-dark">Acceso denegado / Error</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-suave dark:text-suave-dark">
          {String(loadError || "No tenés permisos para ver esta póliza o no pertenece a tu sucursal.")}
        </p>
        <Boton3D variant="blanco" className="mt-6" onClick={() => navigate("/polizas")}>
          Volver al listado
        </Boton3D>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6 text-titulo dark:text-titulo-dark">

      <div className="mb-5 flex items-center justify-between">
        <Boton3D variant="blanco" size="sm" onClick={onBack}>
          <HiArrowLeft className="h-4 w-4" /> Volver
        </Boton3D>
      </div>

      {/* 🆕 Banner GRANDE de estado (color semáforo). Para admin, clic = cambiar estado. */}
      {(() => {
        const b = bannerEstado(poliza?.estado);
        return (
          <button
            type="button"
            onClick={isWebAdmin ? abrirCambioEstado : undefined}
            disabled={!isWebAdmin}
            className={`mb-5 flex w-full items-center justify-between gap-4 rounded-2xl px-6 py-5 text-left transition-colors
              ${b.clases}
              ${isWebAdmin ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
          >
            <div className="min-w-0">
              <div className="text-[11px] opacity-80">
                Estado de la póliza
              </div>
              <div className="mt-1 text-3xl font-semibold leading-none sm:text-4xl">
                {b.label}
              </div>
              {/* 🚫 Por qué se dio de baja (automática: "Baja automática por cuota impaga") */}
              {estadoActual === "cancelada" ? (
                <div className="mt-2.5 space-y-0.5 text-[13px] leading-snug">
                  {bajaInfo?.titulo ? (
                    <div className="font-semibold">{bajaInfo.titulo}</div>
                  ) : (
                    <div className="opacity-80">
                      Sin motivo cargado{isWebAdmin ? " · tocá para cargarlo" : ""}
                    </div>
                  )}
                  {bajaInfo?.detalle ? <div className="opacity-90">{bajaInfo.detalle}</div> : null}
                  {bajaInfo?.nota ? <div className="italic opacity-90">“{bajaInfo.nota}”</div> : null}
                  {bajaInfo?.fecha ? (
                    <div className="text-[11px] opacity-80">Dada de baja el {fmtFecha(bajaInfo.fecha)}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {isWebAdmin ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-3.5 py-2 text-xs font-medium">
                <FaExchangeAlt className="h-3.5 w-3.5" /> Cambiar
              </span>
            ) : null}
          </button>
        );
      })()}

      <div className="mb-4 flex items-center gap-4">
        <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
          <div className="grid h-full w-full place-items-center text-duo-azul">
            <FaCar className="text-2xl" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-suave dark:text-suave-dark">Póliza</span>
            <span className="text-base font-semibold text-duo-azul">{numero}</span>
          </div>
          <div className="mt-1 truncate text-[17px] font-semibold text-titulo dark:text-titulo-dark">
            {poliza?.marca} {poliza?.modelo}
          </div>
          <div className="mt-0.5 truncate text-[13px] text-suave dark:text-suave-dark">
            {poliza?.patente ? <span className="font-mono uppercase text-titulo dark:text-titulo-dark">{poliza.patente}</span> : null}
            {poliza?.patente ? " · " : ""}{compania} · Cobertura {cobertura}
          </div>
        </div>
      </div>

      {clienteId ? (
        <Link
          to={`/clientes/${clienteId}`}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-duo-azul/30 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-4 py-3.5 transition-colors hover:border-duo-azul"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-duo-azul text-sm font-semibold text-white">{iniciales}</span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-titulo dark:text-titulo-dark">{clienteNombre || "Sin titular"}</span>
              {clienteDni ? <span className="block text-xs text-duo-azul">DNI {clienteDni}</span> : null}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-duo-azul px-3.5 py-2 text-xs font-medium text-white">Ver cliente <HiChevronRight className="h-4 w-4" /></span>
        </Link>
      ) : null}

      <div className="mb-5 flex gap-2">
        <Boton3D variant="blanco" className="flex-1" onClick={() => setOpenEdit(true)}>
          <FaEdit className="h-3.5 w-3.5" /> Editar
        </Boton3D>
        {/* El cambio de estado ahora se hace desde el banner grande de arriba. */}
        {isWebAdmin ? (
          <Boton3D variant="rojo" onClick={() => setOpenConfirm(true)} aria-label="Eliminar">
            <FaTrash className="h-3.5 w-3.5" />
          </Boton3D>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <CardDuo className="p-3.5">
          <div className="mb-1.5 text-[11px] text-suave dark:text-suave-dark">Compañía</div>
          <div className="text-[15px] font-semibold text-duo-azul">{compania}</div>
          <div className="mt-0.5 text-xs text-suave dark:text-suave-dark">Cobertura {cobertura}</div>
          <div className="mt-3 border-t border-linea dark:border-linea-dark pt-2.5">
            <div className="text-[11px] text-suave dark:text-suave-dark">Oficina</div>
            <div className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-duo-azul">
              <HiOfficeBuilding className="h-4 w-4 shrink-0" /> <span className="truncate">{oficina}</span>
            </div>
          </div>
        </CardDuo>
        <CardDuo className="flex flex-col p-3.5">
          <div className="mb-1.5 text-[11px] text-suave dark:text-suave-dark">Próximo pago</div>
          <div className="flex flex-1 flex-col justify-center">
            {proxima?.fecha_vencimiento ? (
              <>
                <div className="text-2xl font-semibold leading-tight text-duo-amarillo-sombra dark:text-duo-amarillo sm:text-3xl">{dayjs(proxima.fecha_vencimiento).format("DD/MM/YYYY")}</div>
                <div className="mt-1.5 text-sm text-suave dark:text-suave-dark">Cuota {proxima.cuota_nro} de {cuotas.length}</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold leading-tight text-duo-verde-sombra dark:text-duo-verde sm:text-3xl">Al día</div>
                <div className="mt-1.5 text-sm text-suave dark:text-suave-dark">Sin cuotas pendientes</div>
              </>
            )}
          </div>
        </CardDuo>
      </div>

      <section id="vehiculo-datos" className="mb-6 scroll-mt-4">
        <SectionTitle Icon={FaCar} title="Datos del vehículo" />
        <CardDuo className="px-3.5">
          <FilaDato label="Marca / Modelo" value={[poliza?.marca, poliza?.modelo].filter(Boolean).join(" ")} />
          <FilaDato label="Año" value={poliza?.anio} />
          <FilaDato label="Tipo / Carrocería" value={tipoCarro} />
          <FilaDato label="Combustible" value={poliza?.combustible} />
          <FilaDato label="N° Chasis" value={poliza?.numero_chasis} mono />
          <FilaDato label="N° Motor" value={poliza?.numero_motor} mono />
        </CardDuo>
      </section>

      <section id="cuotas" className="mb-6 scroll-mt-4">
        <SectionTitle Icon={HiCash} title="Cuotas" />
        <CuotasPanel poliza={poliza} polizaId={polizaId} />
      </section>

      <section id="vehiculo" className="mb-6 scroll-mt-4">
        <SectionTitle Icon={HiDocumentText} title="Vehículo / papeles" />
        <VehiculoDocsPanel
          key={`veh-${refreshTick}`}
          poliza={poliza}
          polizaId={polizaId}
          focus="fotos"
          onPerfilChange={onPerfilActualizado}
          onRefrescar={() => {
            dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
            setRefreshTick((x) => x + 1);
          }}
        />
      </section>

      {cuponesRobo.length > 0 ? (
        <section id="cuponeras" className="mb-6 scroll-mt-4">
          <SectionTitle Icon={HiShieldCheck} title="Cuponeras" />
          <CuponesRoboPanel polizaId={polizaId} cupones={cuponesRobo} />
        </section>
      ) : null}

      <PolizaEditModal
        isOpen={openEdit}
        poliza={poliza}
        onClose={() => setOpenEdit(false)}
        onSuccess={() => {
          setOpenEdit(false);
          dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
        }}
      />

      {/* 🆕 Modal: Cambiar estado de la póliza */}
      <ModalDuo
        isOpen={openEstado}
        onClose={() => setOpenEstado(false)}
        title="Cambiar estado"
        subtitle={`Póliza ${poliza?.numero_poliza ? `#${poliza.numero_poliza}` : `ID ${poliza?.id}`}`}
        icon={<FaExchangeAlt />}
        iconTono="azul"
        size="sm"
        footer={
          <>
            <Boton3D variant="blanco" onClick={() => setOpenEstado(false)} disabled={savingEstado} full>
              Cancelar
            </Boton3D>
            <Boton3D
              variant="verde"
              onClick={handleGuardarEstado}
              disabled={savingEstado || !nuevoEstado || (requiereConfirmacion && !aceptaSinRecordatorio) || faltaNotaOtro}
              full
            >
              {savingEstado ? "Guardando..." : "Guardar"}
            </Boton3D>
          </>
        }
      >
        <p className="mb-4 text-[13px] text-suave dark:text-suave-dark">
          Estado actual:{" "}
          <Badge tono={estadoATono(poliza?.estado)} size="sm">{poliza?.estado || "—"}</Badge>
        </p>
        <div className="flex flex-col gap-2.5">
          {ESTADOS_POLIZA.map((op) => {
            const activo = nuevoEstado === op.value;
            return (
              <button
                key={op.value}
                type="button"
                onClick={() => {
                  setNuevoEstado(op.value);
                  setAceptaSinRecordatorio(false); // reset del check al cambiar de opción
                }}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors
                  ${activo
                    ? "border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]"
                    : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-azul/50"}`}
              >
                <span className="text-[15px] font-medium text-titulo dark:text-titulo-dark">{op.label}</span>
                <Badge tono={op.tono} size="sm">{op.value.toUpperCase()}</Badge>
              </button>
            );
          })}
        </div>

        {/* 🚫 Motivo de la baja (solo al pasar a Cancelada, o para corregirlo) */}
        {esBaja ? (
          <div className="mt-4 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4">
            <p className="mb-2.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              ¿Por qué se da de baja?
            </p>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS_BAJA.map((m) => {
                const activo = motivoBaja === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMotivoBaja(m.value)}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors
                      ${activo
                        ? "border-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo"
                        : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:border-duo-rojo/50"}`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <label className="mt-3 block text-[11px] text-suave dark:text-suave-dark">
              {motivoBaja === "OTRO" ? "¿Cuál es el motivo? (obligatorio)" : "Detalle (opcional)"}
            </label>
            <textarea
              value={notaBaja}
              onChange={(e) => setNotaBaja(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={motivoBaja === "OTRO" ? "Ej: se mudó a otra provincia" : "Ej: debe 3 cuotas y no contesta"}
              className={`mt-1 w-full resize-none rounded-lg border bg-card dark:bg-card-dark px-3 py-2 text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul
                ${faltaNotaOtro ? "border-duo-rojo" : "border-linea dark:border-linea-dark"}`}
            />
            {motivoBaja === "INCUMPLIMIENTO_PAGO" ? (
              <p className="mt-1.5 text-[11px] text-suave dark:text-suave-dark">
                La app muestra sola qué cuota quedó sin pagar.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 🔕 Aviso: al pasar a cancelada/finalizada, no recibe más recordatorios */}
        {requiereConfirmacion ? (
          <div className="mt-4 rounded-xl border border-duo-amarillo/50 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-4">
            <p className="text-[13px] font-semibold text-duo-amarillo-sombra dark:text-duo-amarillo">
              ⚠️ Este cliente NO recibirá más el recordatorio de cuota por WhatsApp
            </p>
            <p className="mt-1 text-[12px] text-titulo dark:text-titulo-dark leading-relaxed">
              Al dejar la póliza en <span className="uppercase">{nuevoEstado}</span>, el envío
              automático de recordatorios de cuota deja de incluir a esta póliza.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg bg-surface dark:bg-surface-dark p-3">
              <input
                type="checkbox"
                checked={aceptaSinRecordatorio}
                onChange={(e) => setAceptaSinRecordatorio(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-duo-verde"
              />
              <span className="text-[13px] text-titulo dark:text-titulo-dark">
                Entiendo y acepto que no se le enviarán más recordatorios de cuota a este cliente.
              </span>
            </label>
          </div>
        ) : null}
      </ModalDuo>

      <ModalDuo
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        title="Eliminar póliza"
        subtitle="Esta acción no se puede deshacer"
        icon={<FaTrash />}
        iconTono="rojo"
        size="sm"
        footer={
          <>
            <Boton3D variant="blanco" onClick={() => setOpenConfirm(false)} full>
              Cancelar
            </Boton3D>
            <Boton3D variant="rojo" onClick={handleConfirmDelete} full>
              Sí, eliminar
            </Boton3D>
          </>
        }
      >
        <p className="text-[15px] text-titulo dark:text-titulo-dark leading-relaxed">
          ¿Confirmás la eliminación total de la póliza{" "}
          <span className="text-duo-rojo">{poliza?.numero_poliza || "S/N"}</span>?
        </p>
      </ModalDuo>
    </div>
  );
}
