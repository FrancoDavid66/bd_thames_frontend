// src/pages/CuponerasPage.jsx
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  HiRefresh, HiSearch, HiChevronRight, HiChatAlt2,
  HiCheckCircle, HiPhotograph, HiX,
} from "react-icons/hi";
import { Link } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";

import { actualizarEstadoCuponRobo } from "../store/slices/cuponesRoboSlice";
import { uploadToCloudinary } from "../utils/cloudinary";

// 🦉 Design system Duo
import PageContainer from "../components/ui/PageContainer";
import CardDuo from "../components/ui/CardDuo";
import Boton3D from "../components/ui/Boton3D";
import Badge from "../components/ui/Badge";
import ModalDuo from "../components/ui/ModalDuo";

/* ─── http ─────────────────────────────────────────────────── */
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;
const http = axios.create({ baseURL: BASE, withCredentials: true });
http.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  if (token && token !== "undefined" && token !== "null")
    config.headers.Authorization = `Bearer ${token.trim()}`;
  return config;
});

/* ─── helpers ──────────────────────────────────────────────── */
const fmtDate = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");

// Estado visual del cupón. Sin plata: solo importa si pagó o no + urgencia.
function getVisual(c) {
  const est = (c?.estado || "").toUpperCase();
  if (est === "PAGADA") return "PAGADA";
  if (est === "REPORTADO") return "REPORTADO";
  const hoy = dayjs().startOf("day");
  if (!c?.fecha_vencimiento) return "PENDIENTE";
  const vto = dayjs(c.fecha_vencimiento);
  if (!vto.isValid()) return "PENDIENTE";
  const diff = vto.diff(hoy, "day");
  if (diff < 0) return "VENCIDA";
  if (diff <= 7) return "POR_VENCER";
  return "AL_DIA";
}

function getDiasRestantes(c) {
  if (!c?.fecha_vencimiento) return null;
  return dayjs(c.fecha_vencimiento).diff(dayjs().startOf("day"), "day");
}

function digitsOnly(v) { return String(v || "").replace(/\D+/g, ""); }

function normalizePhoneAR(raw) {
  let d = digitsOnly(raw);
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  d = d.replace(/^(\d{2,4})15/, "$1");
  return `54${d}`;
}

function resolvePhone(c) {
  const e164 = String(c?.asegurado_telefono_e164 || "").trim();
  if (e164.startsWith("+")) { const w = digitsOnly(e164); if (w) return w; }
  for (const v of [c?.asegurado_telefono, c?.cliente_telefono, c?.telefono, c?.whatsapp, c?.celular]) {
    const n = normalizePhoneAR(v); if (n) return n;
  }
  return "";
}

function buildWaUrl(phone, c) {
  const nombre = (c?.asegurado_nombre || "").trim() || "¿Cómo estás?";
  const vto = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento) : null;
  const dias = vto ? vto.diff(dayjs().startOf("day"), "day") : null;
  const vtoStr = vto ? vto.format("DD/MM/YYYY") : "—";
  const vehiculo = [c?.poliza_modelo, c?.poliza_patente].filter(Boolean).join(" · ");
  const extra = vehiculo ? `\n${vehiculo}` : "";
  let msg;
  if (dias !== null && dias < 0)
    msg = `Hola ${nombre} 👋\nTu cuponera de robo venció el ${vtoStr}.${extra}\n¿Ya la pagaste? Si podés, pasame el comprobante. ¡Gracias!`;
  else
    msg = `Hola ${nombre} 👋\nTe recordamos que tu cuponera de robo vence el ${vtoStr}.${extra}\nCuando la pagues, pasame el comprobante. ¡Gracias!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// Estado del cupón → tono del Badge Duo.
function badgeDe(visual) {
  const map = {
    PAGADA:     { tono: "verde",    label: "Pagada" },
    REPORTADO:  { tono: "azul",     label: "Reportado" },
    VENCIDA:    { tono: "rojo",     label: "Vencida" },
    POR_VENCER: { tono: "amarillo", label: "Por vencer" },
    AL_DIA:     { tono: "neutro",   label: "Al día" },
    PENDIENTE:  { tono: "neutro",   label: "Pendiente" },
  };
  return map[visual] || map.PENDIENTE;
}

// Texto de urgencia de un cupón (para el modal).
function textoDias(c) {
  const dias = getDiasRestantes(c);
  if (dias === null) return "";
  if (dias < 0) return `${Math.abs(dias)} días vencida`;
  if (dias === 0) return "vence hoy";
  return `vence en ${dias} días`;
}

// Resumen de un cliente para la fila (el estado más urgente + conteo).
function resumenCliente(cupones) {
  const noPagados = cupones.filter((c) => getVisual(c) !== "PAGADA");
  if (noPagados.length === 0) return { tono: "verde", label: "Al día" };
  const vencidas = noPagados.filter((c) => getVisual(c) === "VENCIDA").length;
  if (vencidas > 0) return { tono: "rojo", label: `${vencidas} vencida${vencidas > 1 ? "s" : ""}` };
  const reportadas = noPagados.filter((c) => getVisual(c) === "REPORTADO").length;
  if (reportadas > 0) return { tono: "azul", label: `${reportadas} reportada${reportadas > 1 ? "s" : ""}` };
  const porVencer = noPagados.filter((c) => getVisual(c) === "POR_VENCER").length;
  if (porVencer > 0) return { tono: "amarillo", label: `${porVencer} por vencer` };
  return { tono: "neutro", label: `${noPagados.length} pendiente${noPagados.length > 1 ? "s" : ""}` };
}

const inicialDe = (nombre) => (String(nombre || "?").trim().charAt(0) || "?").toUpperCase();

/* ─── Modal: Marcar pagado + comprobante opcional ──────────── */
function MarcarPagadoModal({ cupon, onClose, onConfirm, procesando }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reportado = (cupon?.estado || "").toUpperCase() === "REPORTADO";

  return (
    <ModalDuo
      isOpen={!!cupon}
      onClose={() => !procesando && onClose()}
      title={reportado ? "Confirmar pago" : "Marcar como pagado"}
      subtitle={`${cupon?.asegurado_nombre || ""} · ${cupon?.poliza_patente || ""}`}
      icon={<HiCheckCircle />}
      iconTono="verde"
      size="sm"
      footer={
        <>
          <Boton3D variant="blanco" size="sm" onClick={onClose} disabled={procesando}>Cancelar</Boton3D>
          <Boton3D variant="verde" size="sm" onClick={() => onConfirm(file)} disabled={procesando}>
            {procesando ? "Guardando..." : "Confirmar pago"}
          </Boton3D>
        </>
      }
    >
      {reportado && (
        <div className="mb-4 rounded-2xl border-2 border-duo-azul/30 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-4 py-3 text-sm font-bold text-duo-azul">
          El cliente avisó que ya pagó esta cuponera.
        </div>
      )}

      <p className="text-[15px] text-suave dark:text-suave-dark leading-relaxed font-bold mb-4">
        Marcá esta cuponera como pagada. Podés adjuntar el comprobante (Pago Fácil / Mercado Pago) — es opcional.
      </p>

      {preview ? (
        <div className="relative rounded-2xl border-2 border-linea dark:border-linea-dark overflow-hidden">
          <img src={preview} alt="Comprobante" className="w-full max-h-64 object-contain bg-surface dark:bg-surface-dark" />
          <button
            type="button"
            onClick={() => { setFile(null); setPreview(""); }}
            disabled={procesando}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark flex items-center justify-center text-suave hover:text-duo-rojo transition-colors"
          >
            <HiX />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark cursor-pointer hover:border-duo-azul transition-colors">
          <HiPhotograph className="text-3xl text-suave dark:text-suave-dark" />
          <span className="text-xs font-black uppercase tracking-wide text-suave dark:text-suave-dark">
            Adjuntar comprobante (opcional)
          </span>
          <input type="file" accept="image/*" onChange={onPickFile} className="hidden" disabled={procesando} />
        </label>
      )}
    </ModalDuo>
  );
}

/* ─── Modal: Cuotas de un cliente ──────────────────────────── */
function CuotasClienteModal({ grupo, onClose, onPagar }) {
  if (!grupo) return null;
  const phone = resolvePhone(grupo.cupones[0]);

  return (
    <ModalDuo
      isOpen={!!grupo}
      onClose={onClose}
      title={grupo.asegurado}
      subtitle={`${grupo.vehiculo} · ${grupo.patente}`}
      icon={<span className="text-xl font-black">{inicialDe(grupo.asegurado)}</span>}
      iconTono="violeta"
      size="sm"
      footer={
        <>
          {grupo.polizaId && (
            <Link
              to={`/polizas/${grupo.polizaId}`}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark text-xs font-black uppercase hover:border-duo-azul transition-colors"
            >
              Ver ficha
            </Link>
          )}
          {phone && (
            <a
              href={buildWaUrl(phone, grupo.cupones[0])}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-duo-verde-sombra dark:text-duo-verde text-xs font-black uppercase hover:border-duo-verde transition-colors"
            >
              <HiChatAlt2 className="w-4 h-4" /> WhatsApp
            </a>
          )}
        </>
      }
    >
      <div className="space-y-2.5">
        {grupo.cupones.map((c) => {
          const visual = getVisual(c);
          const bd = badgeDe(visual);
          const isPagada = visual === "PAGADA";
          const esReportado = visual === "REPORTADO";
          const dias = getDiasRestantes(c);
          return (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3 bg-card dark:bg-card-dark ${
                visual === "VENCIDA" ? "border-duo-rojo/40" : esReportado ? "border-duo-azul/40" : "border-linea dark:border-linea-dark"
              }`}
            >
              <div className="min-w-0">
                <p className="text-[15px] font-black text-titulo dark:text-titulo-dark">Vence {fmtDate(c.fecha_vencimiento)}</p>
                {!isPagada && dias !== null && (
                  <p className={`text-[11px] font-bold ${dias < 0 ? "text-duo-rojo" : "text-suave dark:text-suave-dark"}`}>
                    {textoDias(c)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tono={bd.tono} size="sm">{bd.label}</Badge>
                {!isPagada && (
                  <Boton3D variant="verde" size="sm" onClick={() => onPagar(c)}>
                    {esReportado ? "Confirmar" : "Pagar"}
                  </Boton3D>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ModalDuo>
  );
}

/* ─── CuponerasPage ────────────────────────────────────────── */
export default function CuponerasPage() {
  const dispatch = useDispatch();

  const [cupones, setCupones] = useState([]);
  const [counters, setCounters] = useState({ total: 0, pendientes: 0, por_vencer_7: 0, vencidas: 0, reportados: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("ALL");

  const [clienteModal, setClienteModal] = useState(null); // grupo abierto en el modal de cuotas
  const [pagoModal, setPagoModal] = useState(null);       // cupón a marcar pagado
  const [procesandoPago, setProcesandoPago] = useState(false);

  /* cargar dashboard */
  const loadDashboard = async (term = "") => {
    setLoading(true);
    setError("");
    try {
      const params = { solo_ultimo: 0, page: 1, page_size: 500 };
      if (term.trim()) params.search = term.trim();
      const res = await http.get("polizas/cupones-robo/dashboard/", { params });
      const data = res.data || {};
      setCounters(data.counters_global || { total: 0, pendientes: 0, por_vencer_7: 0, vencidas: 0 });
      setCupones(Array.isArray(data.results) ? data.results : []);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        "No se pudieron cargar las cuponeras.";
      setError(msg);
      toast.error(msg);
      setCupones([]);
    } finally {
      setLoading(false);
    }
  };

  /* debounce search */
  useEffect(() => {
    const id = setTimeout(() => loadDashboard(search), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const refreshAll = () => loadDashboard(search);

  /* Agrupar cupones por póliza (cada cliente = 1 fila) */
  const clientes = useMemo(() => {
    const map = new Map();
    for (const c of cupones) {
      const key = c.poliza ?? `s/p-${c.id}`;
      if (!map.has(key)) {
        map.set(key, {
          polizaId: c.poliza,
          patente: c.poliza_patente || "—",
          asegurado: c.asegurado_nombre || "—",
          vehiculo: c.poliza_modelo || "Vehículo",
          cupones: [],
        });
      }
      map.get(key).cupones.push(c);
    }
    let grupos = Array.from(map.values());
    // ordenar cuotas de cada cliente por vencimiento
    grupos.forEach((g) =>
      g.cupones.sort((a, b) =>
        String(a.fecha_vencimiento || "").localeCompare(String(b.fecha_vencimiento || ""))
      )
    );

    // filtro por scope (KPIs)
    const SCOPE_VISUAL = { PENDIENTE: "PENDIENTE", VENCIDA: "VENCIDA", POR_VENCER_7: "POR_VENCER", REPORTADO: "REPORTADO" };
    if (scope && scope !== "ALL") {
      const v = SCOPE_VISUAL[scope];
      grupos = grupos.filter((g) => g.cupones.some((c) => getVisual(c) === v));
    }

    // ordenar clientes: primero los que tienen vencidas, luego reportadas, etc.
    const peso = { rojo: 0, azul: 1, amarillo: 2, neutro: 3, verde: 4 };
    grupos.sort((a, b) => (peso[resumenCliente(a.cupones).tono] ?? 5) - (peso[resumenCliente(b.cupones).tono] ?? 5));

    return grupos;
  }, [cupones, scope]);

  // Mantener el modal de cuotas sincronizado si se recargan los datos
  const clienteModalVivo = useMemo(() => {
    if (!clienteModal) return null;
    return clientes.find((g) => g.polizaId === clienteModal.polizaId) || clienteModal;
  }, [clientes, clienteModal]);

  /* confirmar pago — marca PAGADA + sube comprobante opcional (sin plata) */
  const handleConfirmPago = async (file) => {
    if (!pagoModal) return;
    setProcesandoPago(true);
    try {
      let comprobante_url = "";
      let comprobante_public_id = "";

      if (file) {
        try {
          const up = await uploadToCloudinary(file);
          comprobante_url = up?.secure_url || up?.url || "";
          comprobante_public_id = up?.public_id || "";
        } catch (e) {
          console.error(e);
          toast.error("No se pudo subir el comprobante. Se marcará pagado igual.");
        }
      }

      await dispatch(
        actualizarEstadoCuponRobo({
          id: pagoModal.id,
          polizaId: pagoModal.poliza,
          estado: "PAGADA",
          comprobante_url,
          comprobante_public_id,
        })
      ).unwrap();

      toast.success("Cuponera marcada como pagada.");
      setPagoModal(null);
      refreshAll();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo confirmar el pago. Intentá de nuevo.");
    } finally {
      setProcesandoPago(false);
    }
  };

  const KPIS = [
    { label: "Total", value: counters.total, sc: "ALL", tono: "neutro" },
    { label: "Reportados", value: counters.reportados, sc: "REPORTADO", tono: "azul" },
    { label: "Pendientes", value: counters.pendientes, sc: "PENDIENTE", tono: "neutro" },
    { label: "Por vencer", value: counters.por_vencer_7, sc: "POR_VENCER_7", tono: "amarillo" },
    { label: "Vencidas", value: counters.vencidas, sc: "VENCIDA", tono: "rojo" },
  ];

  const dotCls = { neutro: "bg-suave dark:bg-suave-dark", azul: "bg-duo-azul", amarillo: "bg-duo-amarillo", rojo: "bg-duo-rojo" };
  const numCls = { neutro: "text-titulo dark:text-titulo-dark", azul: "text-duo-azul", amarillo: "text-duo-amarillo-sombra dark:text-duo-amarillo", rojo: "text-duo-rojo" };

  return (
    <PageContainer width="lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-titulo dark:text-titulo-dark tracking-tight flex items-center gap-3">
            <span className="h-11 w-11 rounded-2xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] flex items-center justify-center text-duo-violeta text-2xl">
              🎟️
            </span>
            Cuponeras de robo
          </h1>
          <p className="text-suave dark:text-suave-dark font-bold mt-1 ml-1 text-sm">
            Buscá al cliente y tocá su tarjeta para ver y confirmar sus cuotas.
          </p>
        </div>
        <Boton3D variant="blanco" size="sm" onClick={refreshAll} disabled={loading}>
          <HiRefresh className={loading ? "animate-spin" : ""} /> {loading ? "..." : "Actualizar"}
        </Boton3D>
      </div>

      {/* KPIs compactos (chips) */}
      <div className="flex gap-3 flex-wrap mb-5">
        {KPIS.map((k) => {
          const isActive = scope === k.sc;
          const activeBorder = isActive ? "border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:border-suave dark:hover:border-suave-dark";
          return (
            <button
              key={k.sc}
              type="button"
              onClick={() => setScope(k.sc)}
              className={`flex-1 min-w-[130px] flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer ${activeBorder}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotCls[k.tono]}`} />
              <span className={`text-2xl font-black leading-none ${numCls[k.tono]}`}>{k.value}</span>
              <span className="text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark text-left leading-tight">{k.label}</span>
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-lg pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nombre o patente..."
          className="w-full h-13 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark text-[15px] font-bold pl-12 pr-4 outline-none focus:border-duo-azul transition-colors placeholder:text-suave dark:placeholder:text-suave-dark placeholder:font-normal"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-2xl border-2 border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-3 text-sm font-bold text-duo-rojo">
          {error}
        </div>
      )}

      {/* Lista de clientes */}
      {!loading && clientes.length === 0 ? (
        <CardDuo className="flex flex-col items-center justify-center py-14 text-center">
          <div className="text-5xl mb-3">🎟️</div>
          <p className="text-[15px] font-black text-titulo dark:text-titulo-dark">
            {error ? "Error al cargar datos." : "No hay clientes con cuponeras para los filtros aplicados."}
          </p>
        </CardDuo>
      ) : (
        <CardDuo className="overflow-hidden">
          <div className="divide-y-2 divide-linea dark:divide-linea-dark">
            {clientes.map((g) => {
              const r = resumenCliente(g.cupones);
              return (
                <button
                  key={g.polizaId}
                  type="button"
                  onClick={() => setClienteModal(g)}
                  className="w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-surface dark:hover:bg-surface-dark transition-colors cursor-pointer"
                >
                  <span className="h-11 w-11 rounded-full bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] flex items-center justify-center text-duo-violeta font-black text-lg shrink-0">
                    {inicialDe(g.asegurado)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-titulo dark:text-titulo-dark truncate">{g.asegurado}</p>
                    <p className="text-xs text-suave dark:text-suave-dark font-bold truncate mt-0.5">{g.vehiculo} · {g.patente}</p>
                  </div>
                  <Badge tono={r.tono} size="sm">{r.label}</Badge>
                  <HiChevronRight className="w-5 h-5 text-suave dark:text-suave-dark shrink-0" />
                </button>
              );
            })}
          </div>
        </CardDuo>
      )}

      {/* Modal: cuotas del cliente */}
      {clienteModalVivo && (
        <CuotasClienteModal
          grupo={clienteModalVivo}
          onClose={() => setClienteModal(null)}
          onPagar={(cupon) => setPagoModal(cupon)}
        />
      )}

      {/* Modal: marcar pagado */}
      {pagoModal && (
        <MarcarPagadoModal
          cupon={pagoModal}
          onClose={() => !procesandoPago && setPagoModal(null)}
          onConfirm={handleConfirmPago}
          procesando={procesandoPago}
        />
      )}
    </PageContainer>
  );
}
