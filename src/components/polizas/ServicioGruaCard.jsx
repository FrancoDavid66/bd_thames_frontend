// src/components/polizas/ServicioGruaCard.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { GruasAPI } from "../../api/gruas";
import {
  fetchPlanesGrua,
  asociarGrua,
  fetchAdhesionesByPoliza,
} from "../../store/slices/gruasSlice";
import {
  HiTruck,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiInformationCircle,
  HiExternalLink,
  HiPlus,
  HiDocumentText,
  HiLink,
} from "react-icons/hi";

function Pill({ children, tone = "neutral", icon: Icon }) {
  const tones = {
    success: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20",
    danger: "bg-red-500/15 text-red-300 ring-1 ring-red-500/20",
    warn: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/20",
    info: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20",
    neutral: "bg-gray-500/20 text-gray-300 ring-1 ring-gray-500/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tones[tone]}`}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </span>
  );
}

function Row({ label, value, help, action }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-100 text-right">
        {value ?? "—"}
        {help ? (
          <span className="block text-[11px] font-normal text-gray-400">
            {help}
          </span>
        ) : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </span>
    </div>
  );
}

function fmt(d) {
  if (!d) return "—";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt?.getTime?.())) return String(d);
    return dt.toLocaleDateString();
  } catch {
    return String(d);
  }
}

export default function ServicioGruaCard({ polizaId }) {
  const dispatch = useDispatch();
  const { list: planes, loading: planesLoading } = useSelector(
    (s) => s.gruas?.planes || { list: [], loading: false }
  );

  const [data, setData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [assocOpen, setAssocOpen] = useState(false);
  const [planSel, setPlanSel] = useState("");
  const [fechaAct, setFechaAct] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [autoImport, setAutoImport] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bajando, setBajando] = useState(false);

  const reloadResumen = useCallback(async () => {
    if (!polizaId) return;
    setStatus("loading");
    setError("");
    try {
      const res = await GruasAPI.getPolizaResumen(polizaId);
      setData(res || null);
      setStatus("success");
    } catch (e) {
      setError(e?.message || "No se pudo cargar el estado de grúa.");
      setStatus("error");
    }
  }, [polizaId]);

  useEffect(() => {
    reloadResumen();
  }, [reloadResumen]);

  useEffect(() => {
    if (!assocOpen) return;
    if (!planes || planes.length === 0) dispatch(fetchPlanesGrua());
  }, [assocOpen, planes, dispatch]);

  useEffect(() => {
    if (!assocOpen) return;
    if (!planSel && Array.isArray(planes) && planes.length > 0) {
      setPlanSel(String(planes[0].id));
    }
  }, [assocOpen, planes, planSel]);

  const adh = data?.adhesion || null;
  const op = data?.operable || null;
  const stats = data?.stats || null;
  const contrato = adh?.contrato || {
    firmado: false,
    firmado_en: null,
    archivo_url: "",
  };

  const estadoBadge = useMemo(() => {
    if (!adh)
      return {
        text: "SIN ADHESIÓN",
        tone: "neutral",
        icon: HiInformationCircle,
      };
    if (adh.estado === "ACTIVA")
      return { text: "ACTIVA", tone: "success", icon: HiCheckCircle };
    if (adh.estado === "PAUSADA")
      return { text: "PAUSADA", tone: "warn", icon: HiClock };
    if (adh.estado === "CANCELADA")
      return { text: "CANCELADA", tone: "danger", icon: HiXCircle };
    return {
      text: adh.estado || "—",
      tone: "neutral",
      icon: HiInformationCircle,
    };
  }, [adh]);

  const resumenPills = useMemo(() => {
    const today = new Date();
    const pills = [];
    if (adh) {
      pills.push(
        op?.ok
          ? { text: "Operable ahora", tone: "success", icon: HiCheckCircle }
          : { text: "Con restricciones", tone: "warn", icon: HiClock }
      );
      const car = adh.fecha_carencia_fin ? new Date(adh.fecha_carencia_fin) : null;
      if (car && car > today)
        pills.push({
          text: `Carencia hasta ${car.toLocaleDateString()}`,
          tone: "warn",
        });
      const reh = adh.rehabilitar_desde
        ? new Date(adh.rehabilitar_desde)
        : null;
      if (reh && reh > today)
        pills.push({
          text: `Rehabilita ${reh.toLocaleDateString()}`,
          tone: "warn",
        });
      const km = adh?.plan?.km_incluidos ?? 0;
      pills.push({ text: `${km} km incluidos (I+V)`, tone: "info" });
    } else {
      pills.push({
        text: "Activá la asistencia",
        tone: "neutral",
        icon: HiInformationCircle,
      });
    }
    return pills;
  }, [adh, op]);

  const ctaLabel = useMemo(() => {
    if (status === "success") {
      return adh?.estado === "ACTIVA" ? "Gestionar grúa" : "Gestionar / Activar";
    }
    return "Gestionar grúa";
  }, [status, adh]);

  const planKm = adh?.plan?.km_incluidos ?? 0;
  const manageUrl = `/polizas/${polizaId}#gruas`;

  const onAsociar = async () => {
    if (!polizaId) return;
    if (!planSel) {
      toast.error("Elegí un plan.");
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        asociarGrua({
          polizaId,
          data: {
            plan_id: Number(planSel),
            fecha_activacion: fechaAct,
            auto_importar_galeria: !!autoImport,
          },
        })
      ).unwrap();

      toast.success("Grúa asociada a la póliza.");
      setAssocOpen(false);
      dispatch(fetchAdhesionesByPoliza(polizaId));
      await reloadResumen();
    } catch (e) {
      const msg =
        e?.payload?.detail ||
        e?.message ||
        "No se pudo asociar la grúa.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  async function onBaja() {
    if (!adh?.id) return;
    const ok = window.confirm(
      "¿Dar de baja (cancelar) el servicio de grúa para esta póliza?"
    );
    if (!ok) return;
    setBajando(true);
    try {
      await GruasAPI.cancelarAdhesion(
        adh.id,
        "Baja manual desde tarjeta"
      );
      toast.success("Adhesión dada de baja.");
      await reloadResumen();
    } catch (e) {
      toast.error(
        e?.message || "No se pudo dar de baja la adhesión."
      );
    } finally {
      setBajando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-gray-800 p-2 ring-1 ring-gray-700">
            <HiTruck className="h-5 w-5 text-yellow-400" />
          </span>
          <h3 className="text-sm font-semibold text-gray-100">
            Servicio de Grúa
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={estadoBadge.tone} icon={estadoBadge.icon}>
            {estadoBadge.text}
          </Pill>
          {adh && !contrato?.firmado && (
            <Pill tone="warn" icon={HiDocumentText}>
              Contrato faltante
            </Pill>
          )}
        </div>
      </div>

      {/* Contenido */}
      {status === "loading" && (
        <div className="animate-pulse space-y-2">
          <div className="h-4 rounded bg-gray-800" />
          <div className="h-4 w-5/6 rounded bg-gray-800" />
          <div className="h-4 w-4/6 rounded bg-gray-800" />
        </div>
      )}

      {status === "error" && (
        <div className="mb-2 flex items-center gap-2 text-sm text-red-300">
          <HiXCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-3">
          {/* Resumen (píldoras) */}
          <div className="flex flex-wrap items-center gap-2">
            {resumenPills.map((p, i) => (
              <Pill key={i} tone={p.tone} icon={p.icon}>
                {p.text}
              </Pill>
            ))}
          </div>

          {/* Detalle compacto */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <Row
                label="Plan"
                value={
                  adh
                    ? `${adh?.plan?.nombre || "—"} · ${planKm} km`
                    : "—"
                }
                help={
                  adh
                    ? "Kilómetros totales incluidos (ida+vuelta)"
                    : undefined
                }
              />
              <Row
                label="Carencia hasta"
                value={fmt(adh?.fecha_carencia_fin)}
                help={
                  adh?.fecha_carencia_fin
                    ? "Luego de esa fecha, el servicio opera (si no hay mora/suspensión)"
                    : undefined
                }
              />
              <Row
                label="Rehabilita desde"
                value={fmt(adh?.rehabilitar_desde)}
                help={
                  adh?.rehabilitar_desde
                    ? "Aplica si hubo suspensión por mora"
                    : undefined
                }
              />
              <Row
                label="Operable"
                value={adh ? (op?.ok ? "Sí" : "No") : "—"}
                help={op?.motivo}
              />
              <Row
                label="Contrato"
                value={contrato?.firmado ? "Firmado" : "Faltante"}
                help={
                  contrato?.firmado
                    ? `Firmado el ${fmt(contrato.firmado_en)}`
                    : "Subilo desde la sección de grúas"
                }
                action={
                  contrato?.archivo_url ? (
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
                    <Link
                      to={manageUrl}
                      className="inline-flex items-center gap-1 text-primary-300 hover:underline"
                    >
                      Subir ahora{" "}
                      <HiLink className="w-3.5 h-3.5" />
                    </Link>
                  )
                }
              />
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
              <Row
                label="Última solicitud"
                value={
                  stats?.ultima_solicitud
                    ? `#${stats.ultima_solicitud.id} · ${fmt(
                        stats.ultima_solicitud.fecha
                      )}`
                    : "—"
                }
                help={
                  stats?.ultima_solicitud
                    ? [
                        stats.ultima_solicitud.proveedor
                          ? `Prov.: ${stats.ultima_solicitud.proveedor}`
                          : null,
                        stats.ultima_solicitud.km_totales != null
                          ? `Km: ${Number(
                              stats.ultima_solicitud.km_totales
                            ).toFixed(2)}`
                          : null,
                        stats.ultima_solicitud.copago_cliente != null
                          ? `Copago: $${Number(
                              stats.ultima_solicitud.copago_cliente
                            ).toFixed(2)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : undefined
                }
              />
              <Row
                label="Total solicitudes"
                value={stats?.total_solicitudes ?? 0}
              />
              <Row
                label="Últimos 12 meses"
                value={stats?.en_12_meses ?? 0}
              />
              <Row
                label="Km totales acumulados"
                value={Number(stats?.km_totales || 0).toFixed(2)}
              />
            </div>
          </div>

          {/* Ayuda - REGLA NUEVA DE FOTOS (4 LADOS) */}
          <div className="text-[11px] text-gray-400">
            Al pedir el servicio, acordate de cargar las fotos obligatorias del
            vehículo para grúa:{" "}
            <b>FRENTE, LATERAL IZQ, LATERAL DER y TRASERA</b> (4 lados).
          </div>

          {/* Panel de Asociación (visible solo sin adhesión) */}
          {!adh && (
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
              {!assocOpen ? (
                <button
                  onClick={() => setAssocOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <HiPlus className="h-4 w-4" />
                  Asociar grúa ahora
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="flex flex-col text-sm">
                      <span className="mb-1 text-gray-300">Plan</span>
                      <select
                        disabled={planesLoading}
                        value={planSel}
                        onChange={(e) => setPlanSel(e.target.value)}
                        className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                      >
                        {planesLoading && (
                          <option value="">Cargando...</option>
                        )}
                        {!planesLoading && planes.length === 0 && (
                          <option value="">— sin planes —</option>
                        )}
                        {planes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} · $
                            {Number(p.precio_mensual || 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col text-sm">
                      <span className="mb-1 text-gray-300">
                        Fecha de activación
                      </span>
                      <input
                        type="date"
                        value={fechaAct}
                        onChange={(e) => setFechaAct(e.target.value)}
                        className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
                      />
                    </label>

                    <label className="mt-6 flex items-center gap-2 text-sm md:mt-0">
                      <input
                        type="checkbox"
                        checked={autoImport}
                        onChange={(e) =>
                          setAutoImport(e.target.checked)
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-gray-300">
                        Auto-importar fotos de PATENTE (si faltan)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setAssocOpen(false)}
                      disabled={saving}
                      className="rounded-lg bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={onAsociar}
                      disabled={saving || !planSel}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Asociando..." : "Asociar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CTA persistente */}
      {polizaId ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          {adh ? (
            <button
              onClick={onBaja}
              disabled={bajando || adh.estado === "CANCELADA"}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {bajando ? "Dando de baja..." : "Dar de baja"}
            </button>
          ) : (
            <button
              onClick={() => setAssocOpen(true)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Asociar grúa
            </button>
          )}
          <Link
            to={manageUrl}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {ctaLabel}
            <HiExternalLink className="ml-1 -mr-0.5 h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
