/* src/pages/PagosPage.jsx — Panel de Cobranza (buscar + cobrar) · diseño Duo */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  HiX,
  HiSparkles,
  HiCog,
  HiEyeOff,
  HiUserGroup,
  HiIdentification,
  HiChevronRight as HiChevronRightMini,
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../context/AuthContext";

import PagosSearch from "../components/pagos/PagosSearch";
import PagosList from "../components/pagos/PagosList";
// 🧾 Medios de cobro unificado (Recordatorios + Panel de envío + Cuentas de cobro)
import RecordatoriosCuotasModal, { CuentasCobroModal } from "../components/pagos/MediosCobro";
// 🚨 Sistema unificado de alertas del cliente (siniestros + póliza + cuotas)
import {
  AlertasClienteBadges,
  AlertasClienteModal,
  AlertasClienteBanner,
} from "../components/pagos/AlertasCliente";

import {
  fetchMediosCobro,
  enviarRecordatoriosCuotas,
} from "../store/slices/pagosSlice";

dayjs.locale("es");

/* ---------- helpers UI ---------- */
const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
};

const safe = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

function normalizeCuotaFlat(item) {
  const it = item && typeof item === "object" ? item : {};
  const cliIn = it.cliente && typeof it.cliente === "object" ? it.cliente : {};
  const polIn = it.poliza && typeof it.poliza === "object" ? it.poliza : {};

  const cliente = {
    id: cliIn?.id ?? cliIn?.cliente_id ?? it?.cliente_id ?? null,
    apellido: String(cliIn?.apellido ?? it?.cliente_apellido ?? "").trim(),
    nombre: String(cliIn?.nombre ?? it?.cliente_nombre ?? "").trim(),
    dni_cuit_cuil: String(cliIn?.dni_cuit_cuil ?? cliIn?.dni ?? it?.cliente_dni_cuit_cuil ?? it?.cliente_dni ?? "").trim(),
    telefono: String(cliIn?.telefono ?? cliIn?.celular ?? cliIn?.whatsapp ?? "").trim(),
  };

  const poliza = {
    id: polIn?.id ?? polIn?.poliza_id ?? it?.poliza_id ?? null,
    numero_poliza: String(polIn?.numero_poliza ?? it?.numero_poliza ?? "").trim(),
    patente: String(polIn?.patente ?? it?.patente ?? "").trim(),
    marca: String(polIn?.marca ?? it?.marca ?? "").trim(),
    modelo: String(polIn?.modelo ?? it?.modelo ?? "").trim(),
    anio: polIn?.anio ?? it?.anio ?? null,
    cobertura: String(polIn?.cobertura ?? polIn?.cobertura_nombre ?? it?.cobertura ?? "").trim(),
    compania_nombre: String(polIn?.compania_nombre ?? polIn?.compania ?? it?.compania_nombre ?? it?.compania ?? "").trim(),
    compania: String(polIn?.compania ?? polIn?.compania_nombre ?? it?.compania ?? "").trim(),
    oficina: String(polIn?.oficina ?? polIn?.oficina_nombre ?? it?.oficina ?? "").trim(),
    oficina_nombre: String(polIn?.oficina_nombre ?? polIn?.oficina ?? "").trim(),
    fecha_emision: polIn?.fecha_emision ?? it?.fecha_emision ?? null,
    fecha_inicio: polIn?.fecha_inicio ?? null,
    fecha_vencimiento: polIn?.fecha_vencimiento ?? null,
    estado: String(polIn?.estado ?? it?.poliza_estado ?? "").trim(),
    cantidad_cuotas: polIn?.cantidad_cuotas ?? it?.cantidad_cuotas ?? it?.total_cuotas ?? null,
    cliente,
    cliente_id: cliente.id ?? null,
    cliente_nombre: cliente.nombre,
    cliente_apellido: cliente.apellido,
    cliente_dni_cuit_cuil: cliente.dni_cuit_cuil,
    cliente_nombre_apellido: `${cliente.apellido} ${cliente.nombre}`.trim(),
    cliente_nombre_completo: `${cliente.apellido}, ${cliente.nombre}`.trim().replace(/^,\s*|\s*,$/g, ""),
  };

  return {
    id: it?.id ?? null,
    cuota_nro: it?.cuota_nro ?? null,
    monto: it?.monto ?? null,
    pagado: Boolean(it?.pagado),
    fecha_vencimiento: it?.fecha_vencimiento ?? null,
    fecha_pago: it?.fecha_pago ?? null,
    forma_pago: String(it?.forma_pago ?? "").trim(),
    pago_registrado_en: it?.pago_registrado_en ?? null,
    pago_hm: String(it?.pago_hm ?? "").trim(),
    pago_hm_full: String(it?.pago_hm_full ?? "").trim(),
    observaciones: String(it?.observaciones ?? "").trim(),
    observaciones_pago: String(it?.observaciones ?? "").trim(),
    ultima_observacion_pago: String(it?.ultima_observacion_pago ?? "").trim(),
    total_cuotas: it?.total_cuotas ?? null,
    cuota_label: String(it?.cuota_label ?? "").trim(),
    cantidad_cuotas: it?.total_cuotas ?? it?.cantidad_cuotas ?? null,
    poliza_id: poliza.id,
    poliza,
    cliente_id: cliente.id,
    cliente,
  };
}

function clienteKeyFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  const id = cli?.id ?? null;
  if (id !== null && id !== undefined && String(id).trim() !== "") return `id:${id}`;
  const dni = String(cli?.dni_cuit_cuil ?? "").trim();
  if (dni) return `dni:${dni}`;
  const nom = `${String(cli?.apellido ?? "").trim()} ${String(cli?.nombre ?? "").trim()}`.trim().toLowerCase();
  return nom ? `nom:${nom}` : "unknown";
}

function clienteLabelFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  const ap = String(cli?.apellido ?? "").trim();
  const nom = String(cli?.nombre ?? "").trim();
  return [ap, nom].filter(Boolean).join(" ").trim() || "Cliente";
}

function dniFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  return String(cli?.dni_cuit_cuil ?? "").trim();
}

function uniquePolizaLabel(pol) {
  const p = pol && typeof pol === "object" ? pol : {};
  const nro = String(p.numero_poliza || "").trim();
  const pat = String(p.patente || "").trim().toUpperCase();
  if (nro && pat) return `${nro} • ${pat}`;
  if (nro) return nro;
  if (pat) return pat;
  return "Póliza";
}

function extractRawOficina(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  return String(
    pol?.oficina_nombre ?? pol?.oficinaName ?? pol?.oficina_id ?? pol?.oficinaId ?? pol?.oficina ??
    it?.oficina_nombre ?? it?.oficina_id ?? it?.oficinaId ?? it?.oficina ?? ""
  ).trim();
}

function getOficinaName(raw) {
  const s = String(raw).toUpperCase();
  if (!s) return "";
  if (s === "1" || s.includes("ESQUINA")) return "5 Esquinas";
  if (s === "2" || s.includes("AXION")) return "Axion";
  if (s === "3" || s.includes("39")) return "Km 39";
  return String(raw);
}

function computeClienteGroups(cuotasList) {
  const list = Array.isArray(cuotasList) ? cuotasList : [];
  const hoy = dayjs().startOf("day");
  const map = new Map();

  for (const c of list) {
    const key = clienteKeyFromCuota(c);
    const label = clienteLabelFromCuota(c);
    const dni = dniFromCuota(c);
    const pol = c?.poliza || {};
    const polId = pol?.id ?? null;
    const polLabel = uniquePolizaLabel(pol);

    const cliObj = c?.cliente || c?.poliza?.cliente || {};
    const clienteId = cliObj?.id ?? cliObj?.cliente_id ?? c?.cliente_id ?? null;

    const hit =
      map.get(key) ||
      {
        key, label, dni,
        cliente_id: clienteId,
        cuotas: [], polizasSet: new Set(), polizasLabels: new Map(),
        oficinasSet: new Set(),
        total: 0, pagadas: 0, pendientes: 0, vencidas: 0, venceHoy: 0, porVencer: 0,
        totalMontoPendiente: 0, proximoVto: null,
      };

    if (!hit.cliente_id && clienteId) hit.cliente_id = clienteId;

    hit.cuotas.push(c);
    hit.total += 1;

    const rawOfi = extractRawOficina(c);
    if (rawOfi) hit.oficinasSet.add(getOficinaName(rawOfi));

    if (polId !== null && polId !== undefined) {
      const pid = String(polId);
      hit.polizasSet.add(pid);
      if (!hit.polizasLabels.has(pid)) hit.polizasLabels.set(pid, polLabel);
    } else {
      const pseudo = `x:${polLabel}`;
      hit.polizasSet.add(pseudo);
      if (!hit.polizasLabels.has(pseudo)) hit.polizasLabels.set(pseudo, polLabel);
    }

    if (c?.pagado) {
      hit.pagadas += 1;
    } else {
      hit.pendientes += 1;
      const m = Number(c?.monto ?? 0);
      if (Number.isFinite(m)) hit.totalMontoPendiente += m;

      const fv = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento).startOf("day") : null;
      if (fv && fv.isValid()) {
        if (fv.isBefore(hoy)) hit.vencidas += 1;
        else if (fv.isSame(hoy)) hit.venceHoy += 1;
        else hit.porVencer += 1;

        if (!hit.proximoVto || fv.isBefore(hit.proximoVto)) hit.proximoVto = fv;
      } else {
        hit.porVencer += 1;
      }
    }
    map.set(key, hit);
  }

  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    const ap = a.pendientes > 0 ? 1 : 0;
    const bp = b.pendientes > 0 ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (a.vencidas !== b.vencidas) return b.vencidas - a.vencidas;
    const av = a.proximoVto ? a.proximoVto.valueOf() : Number.POSITIVE_INFINITY;
    const bv = b.proximoVto ? b.proximoVto.valueOf() : Number.POSITIVE_INFINITY;
    if (av !== bv) return av - bv;
    return String(a.label).localeCompare(String(b.label));
  });

  return arr.map((g) => ({
    ...g,
    polizasCount: g.polizasSet.size,
    polizas: Array.from(g.polizasLabels.values()).slice(0, 6),
    oficinasLabel: Array.from(g.oficinasSet).join(" y "),
    proximoVtoStr: g.proximoVto ? g.proximoVto.format("DD/MM/YYYY") : "—",
  }));
}

/* ================== PAGE ================== */
const PagosPage = () => {
  const dispatch = useDispatch();

  // 🚀 Obtenemos los datos del usuario para el Escudo de Sucursal
  const { user } = useAuth();

  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.id || user?.perfil?.oficina || "";

  const [showCuentasModal, setShowCuentasModal] = useState(false);
  const [showRecordatoriosModal, setShowRecordatoriosModal] = useState(false);

  // 🚨 Aviso de alertas: el usuario debe confirmar "Entendido" para poder cobrar.
  const [avisoAlertasConfirmado, setAvisoAlertasConfirmado] = useState(false);

  const [cuotas, setCuotas] = useState([]);
  const [ocultarPagadas, setOcultarPagadas] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [sendingRecordatorios, setSendingRecordatorios] = useState(false);

  const {
    mediosCobro = [],
    mpCuentas = [],
    billeteras = [],
  } = useSelector((state) => state.pagos || {});

  useEffect(() => {
    dispatch(fetchMediosCobro({ activo: true }));
  }, [dispatch]);

  const handleBuscarPolizas = useCallback((cuotasFlat) => {
    const lista = Array.isArray(cuotasFlat) ? cuotasFlat : [];
    const normalized = lista.map(normalizeCuotaFlat);
    setCuotas(normalized);
    setClienteSeleccionado(null);
  }, []);

  const handleActualizarCuotas = useCallback((actualizadas = []) => {
    if (!Array.isArray(actualizadas) || actualizadas.length === 0) return;
    setCuotas((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const map = new Map();
      actualizadas.forEach((item) => {
        const obj =
          item?.cuotaActualizada && typeof item.cuotaActualizada === "object"
            ? item.cuotaActualizada
            : item;
        if (obj?.id) map.set(obj.id, obj);
      });
      if (map.size === 0) return prevList;
      return prevList.map((c) => {
        const upd = map.get(c.id);
        return upd ? { ...c, ...upd } : c;
      });
    });
  }, []);

  const handleEnviarRecordatorios = useCallback(
    async (medioCobroId, oficina) => {
      setSendingRecordatorios(true);
      try {
        const medio = mediosCobro.find((m) => m.id === medioCobroId) || null;
        const alias = medio ? medio.etiqueta || medio.valor : undefined;
        const result = await dispatch(
          enviarRecordatoriosCuotas({
            medio_cobro_id: medioCobroId || undefined,
            alias,
            oficina,
          })
        ).unwrap();
        return result;
      } catch (err) {
        console.error("[PagosPage] Error enviando recordatorios:", err);
        const data = err?.data || err?.response?.data || err?.payload || null;
        const msg =
          (typeof data === "string" && data) ||
          data?.detail ||
          data?.error ||
          err?.message ||
          "No se pudieron enviar los recordatorios.";
        const errores = Array.isArray(data?.errores) ? data.errores : Array.isArray(data) ? data : [];
        return { ok: false, error: msg, errores, raw: data || err };
      } finally {
        setSendingRecordatorios(false);
      }
    },
    [dispatch, mediosCobro]
  );

  const clienteGroups = useMemo(() => computeClienteGroups(cuotas), [cuotas]);
  const visibleCuotasEnModal = useMemo(() => {
    if (!clienteSeleccionado) return [];
    const key = clienteSeleccionado?.key;
    return (Array.isArray(cuotas) ? cuotas : []).filter((c) => clienteKeyFromCuota(c) === key);
  }, [cuotas, clienteSeleccionado]);

  const abrirCliente = useCallback((g) => {
    setAvisoAlertasConfirmado(false);
    setClienteSeleccionado(g);
  }, []);
  const cerrarClienteModal = useCallback(() => {
    setClienteSeleccionado(null);
    setAvisoAlertasConfirmado(false);
  }, []);

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-10 2xl:px-12 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] flex items-center justify-center text-2xl shrink-0">💰</div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 flex-wrap">
                <span>Cobranza</span>
                <span className="inline-flex items-center rounded-full bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul text-xs font-black px-2 py-0.5">
                  <HiSparkles className="mr-1" />
                  <span>Panel operativo</span>
                </span>
              </h1>
              <p className="text-suave dark:text-suave-dark text-sm sm:text-base mt-1 font-bold">
                Buscá al cliente, revisá sus cuotas y cobrá.
                {!isWebAdmin && <span className="text-duo-verde ml-2 font-black tracking-wide text-xs uppercase">({user?.perfil?.oficina_nombre || "Tu Sucursal"})</span>}
              </p>
            </div>
          </div>

          {/* 🚀 ESCUDO ADMIN: Solo el admin ve el botón de medios de cobro */}
          {isWebAdmin && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setShowCuentasModal(true)}
                className="inline-flex flex-1 justify-center sm:flex-none items-center gap-2 rounded-2xl bg-duo-azul text-white px-4 h-11 text-sm font-black shadow-[0_4px_0_var(--color-duo-azul-sombra)] active:shadow-[0_0_0_var(--color-duo-azul-sombra)] active:translate-y-0.5 transition-all cursor-pointer"
              >
                <HiCog className="text-lg" />
                <span>Medios de cobro</span>
              </button>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 sm:space-y-4"
        >
          <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 sm:p-6 space-y-3">
            <PagosSearch onBuscar={handleBuscarPolizas} />
            <button
              type="button"
              onClick={() => setOcultarPagadas((v) => !v)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark cursor-pointer"
            >
              <span
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  ocultarPagadas ? "bg-duo-azul border-duo-azul" : "border-linea dark:border-linea-dark"
                }`}
              >
                {ocultarPagadas && <span className="w-2 h-2 rounded-sm bg-white" />}
              </span>
              <HiEyeOff className="w-4 h-4 opacity-70" />
              <span>Ocultar cuotas pagadas</span>
            </button>
          </div>

          <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul">
                  <HiUserGroup className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-sm font-black text-titulo dark:text-titulo-dark">Resultados por cliente</div>
                  <div className="text-xs text-suave dark:text-suave-dark font-bold">Elegí un cliente para ver todas sus cuotas.</div>
                </div>
              </div>
              {clienteSeleccionado && (
                <button
                  type="button"
                  onClick={() => setClienteSeleccionado(null)}
                  className="h-9 px-3 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-duo-azul cursor-pointer text-xs font-black"
                >
                  Volver
                </button>
              )}
            </div>

            {clienteGroups.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-8 text-center text-suave dark:text-suave-dark font-bold">
                Buscá por cliente, patente o póliza para ver resultados.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                {clienteGroups.map((g) => {
                  const hasPend = g.pendientes > 0;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => abrirCliente(g)}
                      className={`text-left rounded-2xl border-2 px-3 py-3 sm:px-4 sm:py-4 transition-colors cursor-pointer bg-surface dark:bg-surface-dark ${
                        hasPend ? "hover:border-duo-rojo" : "hover:border-duo-azul"
                      } border-linea dark:border-linea-dark`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark">
                              <HiIdentification className="w-5 h-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm sm:text-base font-black text-titulo dark:text-titulo-dark truncate flex items-center gap-2 flex-wrap">
                                {g.label}
                                {g.cliente_id && (
                                  <AlertasClienteBadges clienteId={g.cliente_id} cuotas={g.cuotas} max={4} />
                                )}
                                {isWebAdmin && g.oficinasLabel && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde whitespace-nowrap">
                                    {g.oficinasLabel}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-suave dark:text-suave-dark truncate font-bold">
                                DNI: <span className="text-titulo dark:text-titulo-dark">{safe(g.dni, "—")}</span> • Cuotas:{" "}
                                <span className="text-titulo dark:text-titulo-dark">{g.total}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-black ${
                                g.vencidas > 0
                                  ? "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo"
                                  : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark"
                              }`}
                            >
                              Vencidas: <span className="ml-1">{g.vencidas}</span>
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-black ${
                                g.pendientes > 0
                                  ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
                                  : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark"
                              }`}
                            >
                              Pendientes: <span className="ml-1">{g.pendientes}</span>
                            </span>
                            <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-black bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde">
                              Cobrar: <span className="ml-1">{fmtMoney(g.totalMontoPendiente)}</span>
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark">
                          <HiChevronRightMini className="w-5 h-5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <AnimatePresence>
            {!!clienteSeleccionado && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
              >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cerrarClienteModal} />

                <motion.div
                  initial={{ y: 22, opacity: 0, scale: 0.98 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 22, opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="relative z-[81] w-full h-[95dvh] sm:h-auto sm:w-[min(980px,92vw)] sm:max-h-[90vh] flex flex-col bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="px-4 sm:px-6 py-4 border-b-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base sm:text-lg font-black text-titulo dark:text-titulo-dark truncate flex items-center gap-2 flex-wrap">
                          {clienteSeleccionado?.label || "Cliente"}
                          {isWebAdmin && clienteSeleccionado?.oficinasLabel && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde whitespace-nowrap">
                              🏢 {clienteSeleccionado.oficinasLabel}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs sm:text-sm text-suave dark:text-suave-dark font-bold flex flex-wrap gap-x-3 gap-y-1">
                          <span>DNI: <span className="text-titulo dark:text-titulo-dark font-black">{safe(clienteSeleccionado?.dni, "—")}</span></span>
                          <span>• Cuotas: <span className="text-titulo dark:text-titulo-dark font-black">{clienteSeleccionado?.total ?? 0}</span></span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={cerrarClienteModal}
                        className="h-10 px-3 rounded-2xl bg-surface dark:bg-surface-dark hover:brightness-95 border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark inline-flex items-center gap-2 cursor-pointer font-black"
                      >
                        <HiX className="w-5 h-5" />
                        <span className="hidden sm:inline">Cerrar</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                    {/* 🚨 BANNER INLINE UNIFICADO — recordatorio mientras cobra */}
                    {clienteSeleccionado?.cliente_id && avisoAlertasConfirmado && (
                      <div className="px-4 sm:px-6 pt-4">
                        <AlertasClienteBanner
                          clienteId={clienteSeleccionado.cliente_id}
                          cuotas={visibleCuotasEnModal}
                        />
                      </div>
                    )}

                    <PagosList
                      cuotas={visibleCuotasEnModal}
                      actualizarCuotas={handleActualizarCuotas}
                      ocultarPagadas={ocultarPagadas}
                      cuentasMercadoPago={mpCuentas}
                      billeterasVirtuales={billeteras}
                      mediosCobro={mediosCobro}
                      preferFast={true}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🚨 MODAL UNIFICADO DE ALERTAS — el usuario debe apretar "Entendido" para cobrar */}
          <AlertasClienteModal
            isOpen={!!clienteSeleccionado && !avisoAlertasConfirmado}
            clienteId={clienteSeleccionado?.cliente_id}
            clienteNombre={clienteSeleccionado?.label}
            cuotas={visibleCuotasEnModal}
            onConfirm={() => setAvisoAlertasConfirmado(true)}
          />
        </motion.div>
      </div>

      <CuentasCobroModal open={showCuentasModal} onClose={() => setShowCuentasModal(false)} mpCuentas={mpCuentas} billeteras={billeteras} mediosCobro={mediosCobro} />
      <RecordatoriosCuotasModal isOpen={showRecordatoriosModal} onClose={() => setShowRecordatoriosModal(false)} mediosCobro={mediosCobro} sending={sendingRecordatorios} onEnviar={handleEnviarRecordatorios} isWebAdmin={isWebAdmin} userOficina={userOficina} />
    </div>
  );
};

export default PagosPage;
