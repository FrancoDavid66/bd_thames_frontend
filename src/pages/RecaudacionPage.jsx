// src/pages/RecaudacionPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  HiCamera, HiUpload, HiOfficeBuilding,
  HiClock, HiCalendar, HiX, HiZoomIn,
  HiCurrencyDollar, HiPrinter, HiCheckCircle,
  HiExclamationCircle, HiChevronDoubleUp, HiChevronDoubleDown,
  HiUser, HiRefresh, HiChevronLeft, HiChevronRight,
} from "react-icons/hi";

import { useAuth } from "../context/AuthContext";
import {
  fetchRecaudaciones,
  uploadRecaudacion,
  fetchEmpleadosActivos,
} from "../store/slices/recaudacionSlice";
import { uploadToCloudinary } from "../utils/cloudinary";
import api from "../services/api";

// 🚀 Ranking de cumplimiento de cierres por oficina
import RankingCierres from "../components/recaudacion/RankingCierres";
// 🚀 NUEVO: panel de quién cerró / no cerró en un día
import EstadoCierresDia from "../components/recaudacion/EstadoCierresDia";
import AdminHorariosCierre from "../components/admin/AdminHorariosCierre";

import EjemploDineroImg from "../assets/ejemplo_dinero.jpg";

/* ─── helpers ───────────────────────────────────────────────── */
const fmtNum  = (n) => new Intl.NumberFormat("es-AR").format(Number(n || 0));
const fmtDate = (v) => dayjs(v).format("DD/MM/YYYY");
const fmtTime = (v) => dayjs(v).format("HH:mm");

/* ─── badge auditoría ───────────────────────────────────────── */
function BadgeAuditoria({ estado, diferencia }) {
  const diff = fmtNum(Math.abs(diferencia || 0));
  if (estado === "OK")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono border border-emerald-800 bg-emerald-950/50 text-emerald-400 rounded px-2 py-0.5">
        <HiCheckCircle className="w-3 h-3" /> OK
      </span>
    );
  if (estado === "FALTANTE")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono border border-rose-800 bg-rose-950/50 text-rose-400 rounded px-2 py-0.5">
        <HiChevronDoubleDown className="w-3 h-3" /> -{diff}
      </span>
    );
  if (estado === "SOBRANTE")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono border border-amber-800 bg-amber-950/30 text-amber-400 rounded px-2 py-0.5">
        <HiChevronDoubleUp className="w-3 h-3" /> +{diff}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono border border-slate-700 bg-slate-800 text-slate-400 rounded px-2 py-0.5">
      <HiExclamationCircle className="w-3 h-3" /> Pendiente
    </span>
  );
}

/* ─── RecaudacionPage ───────────────────────────────────────── */
export default function RecaudacionPage() {
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
          Caja y Recaudación
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {isAdmin
            ? "Panel de auditoría — cierres de todas las sucursales"
            : "Registrá el cierre de caja diario en 3 pasos"}
        </p>
      </div>

      {isAdmin ? <AdminView /> : <UserView user={user} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VISTA EMPLEADO
═══════════════════════════════════════════════════════════════ */
function UserView({ user }) {
  const dispatch = useDispatch();
  const { uploading, empleados, loadingEmpleados, items } = useSelector((s) => s.recaudacion);

  const fileInputRef = useRef(null);
  const [file, setFile]                   = useState(null);
  const [preview, setPreview]             = useState(null);
  const [monto, setMonto]                 = useState("");
  const [empleado, setEmpleado]           = useState("");
  const [balanceDia, setBalanceDia]       = useState(null);
  const [loadingBal, setLoadingBal]       = useState(false);
  const [showTicket, setShowTicket]       = useState(false);
  const [showEjemplo, setShowEjemplo]     = useState(false);

  // Historial del empleado actual (sus últimos 5 cierres)
  const misCierres = items
    .filter((r) => String(r.usuario_nombre || "").toLowerCase() === String(user?.username || "").toLowerCase())
    .slice(0, 5);

  useEffect(() => {
    dispatch(fetchEmpleadosActivos());
    dispatch(fetchRecaudaciones());
    const fetchBalance = async () => {
      setLoadingBal(true);
      try {
        const res = await api.get("balance-diario/");
        setBalanceDia(res.data);
      } catch { /* silencioso */ }
      finally { setLoadingBal(false); }
    };
    fetchBalance();
  }, [dispatch]);

  const fmtInput = (v) => {
    const clean = v.replace(/\D/g, "");
    return clean ? fmtNum(clean) : "";
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!empleado)   return toast.error("Elegí el responsable en el Paso 1.");
    if (!monto)      return toast.error("Ingresá el monto contado en el Paso 3.");
    if (!file)       return toast.error("Sacá la foto en el Paso 3.");
    try {
      const up = await uploadToCloudinary(file, { folder: "de-thames/recaudacion" });
      await dispatch(uploadRecaudacion({
        foto_url:       up.secure_url,
        foto_public_id: up.public_id,
        monto_declarado: Number(monto.replace(/\D/g, "")),
        empleado,
      })).unwrap();
      toast.success("Cierre enviado correctamente.");
      setFile(null); setPreview(null); setMonto(""); setEmpleado("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      dispatch(fetchRecaudaciones());
    } catch {
      toast.error("Error al enviar el cierre. Intentá de nuevo.");
    }
  };

  // Impresión con iframe (más robusto que window.open)
  const iframeRef = useRef(null);
  const handlePrint = useCallback(() => {
    if (!empleado)   return toast.error("Elegí el responsable en el Paso 1.");
    if (!balanceDia) return toast.error("No se pudo cargar el balance.");

    const empleadoNombre = empleados.find((e) => e.id === Number(empleado))?.nombre || "N/A";
    const total      = fmtNum(balanceDia.totales?.saldo_caja_chica || 0);
    const ingEfe     = fmtNum(balanceDia.ingresos?.por_forma_pago?.find((f) => f.forma_pago === "EFECTIVO")?.total || 0);
    const egEfe      = fmtNum(balanceDia.egresos?.por_forma_pago?.find((f)  => f.forma_pago === "EFECTIVO")?.total  || 0);
    const cantOp     = (balanceDia.totales?.ingresos_cantidad || 0) + (balanceDia.totales?.egresos_cantidad || 0);
    const sucursal   = balanceDia.scope?.oficina_nombre || "Sucursal";
    const ahora      = dayjs().format("DD/MM/YYYY HH:mm:ss");

    // 🚀 Detalle de ingresos EN EFECTIVO (nombre, monto, hora) para el ticket
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const detalleEfe = Array.isArray(balanceDia.ingresos?.detalle_efectivo)
      ? balanceDia.ingresos.detalle_efectivo
      : [];
    const MAX_NOMBRE = 22;
    const filasEfe = detalleEfe.map((it) => {
      const hora = it?.hora || "--:--";
      let nombre = (it?.pagado_por || "—").toUpperCase();
      if (nombre.length > MAX_NOMBRE) nombre = nombre.slice(0, MAX_NOMBRE - 1) + "…";
      const monto = fmtNum(it?.monto || 0);
      return `<div style="margin-top:7px">
        <div style="font-size:12px">${esc(hora)} ${esc(nombre)}</div>
        <div style="text-align:right;font-weight:bold;font-size:13px">$ ${monto}</div>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Ticket Cierre</title>
    <style>
      @page{margin:0}
      body{font-family:'Courier New',monospace;width:80mm;margin:0;padding:12px 8px;color:#000;font-size:14px}
      .c{text-align:center}.b{font-weight:bold}
      .hr{border-bottom:2px dashed #000;margin:12px 0}
      .row{display:flex;justify-content:space-between;margin-bottom:5px}
      .big{font-size:36px;font-weight:bold;letter-spacing:-1px}
    </style></head><body>
    <div class="c b" style="font-size:20px">THAMES SEGUROS</div>
    <div class="c b">${sucursal.toUpperCase()}</div>
    <div class="c" style="margin-top:6px">${balanceDia.fecha_hum || ahora.slice(0,10)}</div>
    <div class="c b" style="font-size:16px;margin-top:4px">TICKET CIERRE DE CAJA</div>
    <div class="hr"></div>
    <div class="c"><div style="font-size:12px;text-transform:uppercase">Total a rendir (Fisico)</div>
    <div class="big">$${total}</div>
    <div style="font-size:12px;margin-top:10px">RESPONSABLE:</div>
    <div class="b" style="font-size:18px;margin-top:4px">${empleadoNombre}</div></div>
    <div class="hr"></div>
    <div class="c b" style="font-size:13px">INGRESOS EN EFECTIVO</div>
    <div style="border-bottom:1px solid #000;margin:8px 0"></div>
    ${filasEfe || '<div class="c" style="font-size:12px">Sin ingresos en efectivo</div>'}
    <div style="border-bottom:1px solid #000;margin:8px 0"></div>
    <div class="hr"></div>
    <div class="row b"><span>Ingresos Efe:</span><span>$${ingEfe}</span></div>
    <div class="row b"><span>Egresos Efe:</span><span>-$${egEfe}</span></div>
    <div class="row" style="font-size:12px;margin-top:8px"><span>Operaciones:</span><span>${cantOp}</span></div>
    <div class="hr"></div>
    <div style="margin-top:4px">
      <div style="display:flex;align-items:center;gap:10px;justify-content:center">
        <span style="display:inline-block;width:26px;height:26px;border:2px solid #000"></span>
        <span class="b" style="font-size:13px">CONTADO Y CONTROLADO</span>
      </div>
      <div style="margin-top:24px;font-size:12px">Contó: <span style="display:inline-block;border-bottom:1px solid #000;width:165px"></span></div>
      <div style="margin-top:20px;font-size:12px">Firma: <span style="display:inline-block;border-bottom:1px solid #000;width:165px"></span></div>
    </div>
    <div class="hr"></div>
    <div class="c" style="font-size:12px">
      <div>CTA: ${(user?.username || "").toUpperCase()}</div>
      <div>${ahora}</div>
      <div class="b" style="margin-top:16px;font-size:16px">--- CIERRE VALIDO ---</div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
    iframeRef.current = iframe;
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => { try { iframe.remove(); } catch {} }, 60000);
    };
  }, [empleado, balanceDia, empleados, user]);

  const canSubmit = !!empleado && !!monto && !!file && !uploading;

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── Paso 1: Responsable ─────────────────────────────── */}
      <StepCard number={1} title="Elegir responsable" desc="¿Quién cierra la caja hoy?">
        <div className="relative">
          <HiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            value={empleado}
            onChange={(e) => setEmpleado(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-700 bg-slate-950 text-sm text-slate-100 focus:outline-none focus:border-slate-500 appearance-none transition-colors"
          >
            <option value="" disabled>
              {loadingEmpleados ? "Cargando..." : "Seleccioná el responsable..."}
            </option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
      </StepCard>

      {/* ── Paso 2: Ticket ──────────────────────────────────── */}
      <StepCard number={2} title="Imprimir ticket de cierre" desc="Imprimí y colocalo sobre los billetes">
        {/* Ejemplo colapsable */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowEjemplo((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Ver ejemplo de cómo sacar la foto</span>
            <span className="text-slate-600">{showEjemplo ? "▲" : "▼"}</span>
          </button>
          {showEjemplo && (
            <div className="px-3 pb-3 flex items-start gap-3">
              <img
                src={EjemploDineroImg}
                alt="Ejemplo"
                className="w-28 h-20 object-cover rounded-lg border border-slate-700 shrink-0 cursor-pointer"
                onClick={() => setShowTicket(false)}
              />
              <p className="text-xs text-slate-400 leading-relaxed">
                El ticket impreso tiene que estar <strong className="text-slate-200">arriba</strong> de los billetes y verse <strong className="text-slate-200">claramente</strong> en la foto.
              </p>
            </div>
          )}
        </div>

        {loadingBal ? (
          <p className="text-xs text-slate-500 text-center py-2 animate-pulse">Calculando balance...</p>
        ) : balanceDia ? (
          <button
            onClick={() => {
              if (!empleado) return toast.error("Elegí el responsable primero.");
              setShowTicket(true);
            }}
            className="w-full h-10 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
          >
            <HiPrinter className="w-4 h-4" /> Ver e imprimir ticket
          </button>
        ) : (
          <p className="text-xs text-slate-600 text-center py-2">No se pudo cargar el balance del día.</p>
        )}
      </StepCard>

      {/* ── Paso 3: Foto + monto ────────────────────────────── */}
      <StepCard number={3} title="Foto y monto" desc="Sacá la foto con el ticket visible y anotá el monto">
        <div className="space-y-3">
          {/* Zona de foto */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-36 rounded-lg border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-950 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <HiCamera className="w-7 h-7 text-slate-600" />
              <p className="text-sm text-slate-500">Tocar para abrir la cámara</p>
            </div>
          ) : (
            <div className="relative h-36 rounded-lg overflow-hidden border border-slate-700 bg-black">
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
              >
                <HiX className="w-4 h-4" />
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

          {/* Monto */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
              Monto físico contado
            </label>
            <div className="relative">
              <HiCurrencyDollar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 100.000"
                value={fmtInput(monto)}
                onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-700 bg-slate-950 text-sm font-mono text-slate-100 focus:outline-none focus:border-slate-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Ingresá exactamente lo que contaste a mano.
            </p>
          </div>

          {/* Botón enviar */}
          <button
            onClick={handleUpload}
            disabled={!canSubmit}
            className="w-full h-10 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" /> Enviando...</>
            ) : (
              <><HiUpload className="w-4 h-4" /> Enviar cierre definitivo</>
            )}
          </button>
        </div>
      </StepCard>

      {/* ── Mis cierres recientes ───────────────────────────── */}
      {misCierres.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50">
          <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Mis últimos cierres</h3>
          </div>
          <div className="divide-y divide-slate-800">
            {misCierres.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={r.foto_url}
                    alt="cierre"
                    className="w-10 h-10 rounded-md object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-300 font-mono">{fmtDate(r.creado_en)} · {fmtTime(r.creado_en)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{r.empleado_nombre || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-slate-300">
                    ${fmtNum(r.monto_declarado)}
                  </span>
                  <BadgeAuditoria estado={r.estado_auditoria} diferencia={r.diferencia} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal ticket ────────────────────────────────────── */}
      <AnimatePresence>
        {showTicket && balanceDia && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowTicket(false)}
          >
            <div
              className="bg-white text-black p-5 shadow-2xl max-w-[300px] w-full font-mono text-sm relative rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTicket(false)}
                className="absolute -top-3 -right-3 h-7 w-7 bg-slate-800 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <HiX className="w-4 h-4" />
              </button>

              <div className="text-center mb-3 pb-3 border-b-2 border-dashed border-gray-400">
                <p className="text-lg font-black uppercase tracking-widest">THAMES SEGUROS</p>
                <p className="font-bold uppercase text-xs mt-1">{balanceDia.scope?.oficina_nombre || "Sucursal"}</p>
                <p className="text-[10px] mt-2">{balanceDia.fecha_hum}</p>
                <p className="text-[10px] font-bold uppercase mt-1">Ticket Cierre de Caja</p>
              </div>

              <div className="text-center mb-3 pb-3 border-b-2 border-dashed border-gray-400">
                <p className="text-[10px] font-bold uppercase mb-1">Total a rendir (Físico)</p>
                <p className="text-4xl font-black tracking-tighter">
                  ${fmtNum(balanceDia.totales?.saldo_caja_chica)}
                </p>
                <p className="text-[10px] mt-2 uppercase">Responsable</p>
                <p className="font-black text-base mt-0.5">
                  {empleados.find((e) => e.id === Number(empleado))?.nombre || "—"}
                </p>
              </div>

              <div className="space-y-1 text-xs mb-3 pb-3 border-b-2 border-dashed border-gray-400">
                <div className="flex justify-between font-bold">
                  <span>Ingresos Efe:</span>
                  <span>${fmtNum(balanceDia.ingresos?.por_forma_pago?.find((f) => f.forma_pago === "EFECTIVO")?.total)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Egresos Efe:</span>
                  <span>-${fmtNum(balanceDia.egresos?.por_forma_pago?.find((f) => f.forma_pago === "EFECTIVO")?.total)}</span>
                </div>
              </div>

              <div className="text-center text-[10px]">
                <p>{(user?.username || "").toUpperCase()}</p>
                <p>{dayjs().format("DD/MM/YYYY HH:mm:ss")}</p>
                <p className="font-black mt-2 text-xs">--- CIERRE VÁLIDO ---</p>
              </div>

              <button
                onClick={handlePrint}
                className="mt-4 w-full h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <HiPrinter className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── StepCard helper ────────────────────────────────────────── */
function StepCard({ number, title, desc, children }) {
  const colors = ["bg-sky-900/30 text-sky-400 border-sky-800", "bg-amber-900/20 text-amber-400 border-amber-800", "bg-emerald-900/20 text-emerald-400 border-emerald-800"];
  const cls = colors[(number - 1) % colors.length];
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className={`h-8 w-8 shrink-0 rounded-lg border text-sm font-mono font-semibold flex items-center justify-center ${cls}`}>
          {number}
        </span>
        <div>
          <p className="text-sm font-medium text-slate-100 leading-none">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VISTA ADMIN
═══════════════════════════════════════════════════════════════ */
function AdminView() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((s) => s.recaudacion);

  const [filtroFecha,   setFiltroFecha]   = useState(dayjs().format("YYYY-MM-DD"));
  const [filtroOficina, setFiltroOficina] = useState("");
  const [oficinas,      setOficinas]      = useState([]);
  const [fotoAmpliada,  setFotoAmpliada]  = useState(null);
  const [page,          setPage]          = useState(1);
  const PAGE_SIZE = 12;

  // 🆕 Efectivo esperado de cierre por sucursal (lo trae el balance diario)
  const [esperado,        setEsperado]        = useState(null);
  const [loadingEsperado, setLoadingEsperado] = useState(false);

  // Cargar oficinas dinámicamente
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const base  = (import.meta.env.VITE_API_URL || "/api/").replace(/\/+$/, "");
    fetch(`${base}/usuarios/oficinas/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setOficinas(Array.isArray(d) ? d : d?.results || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (filtroFecha)   params.fecha   = filtroFecha;
    if (filtroOficina) params.oficina = filtroOficina;
    dispatch(fetchRecaudaciones(params));
    setPage(1);
  }, [dispatch, filtroFecha, filtroOficina]);

  // 🆕 Trae el efectivo esperado por sucursal (balance del día = efectivo entrado − salido).
  // Pedimos SIEMPRE todas las sucursales (sin filtro de oficina) para verlas de un vistazo.
  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoadingEsperado(true);
      try {
        const res = await api.get("balance-diario/", { params: { fecha: filtroFecha } });
        if (!cancel) setEsperado(res.data);
      } catch {
        if (!cancel) setEsperado(null);
      } finally {
        if (!cancel) setLoadingEsperado(false);
      }
    };
    load();
    return () => { cancel = true; };
  }, [filtroFecha]);

  const refresh = () => {
    const params = {};
    if (filtroFecha)   params.fecha   = filtroFecha;
    if (filtroOficina) params.oficina = filtroOficina;
    dispatch(fetchRecaudaciones(params));
  };

  // Paginación local
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginados  = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* ⏰ Panel para configurar los horarios de cierre (mediodía/noche) por oficina */}
      <details className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <summary className="cursor-pointer text-sm sm:text-base font-bold text-slate-100">
          ⏰ Horarios de cierre de caja (por oficina)
        </summary>
        <div className="mt-3">
          <AdminHorariosCierre />
        </div>
      </details>

      {/* 🚀 Quién cerró / no cerró en un día */}
      <EstadoCierresDia />

      {/* 🚀 Ranking de cumplimiento por sucursal (histórico mensual) */}
      <RankingCierres isAdmin={true} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="flex gap-2 flex-wrap flex-1">
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-sm px-3 focus:outline-none focus:border-slate-500 transition-colors"
          />
          <select
            value={filtroOficina}
            onChange={(e) => setFiltroOficina(e.target.value)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 text-sm px-3 focus:outline-none focus:border-slate-500 transition-colors"
          >
            <option value="">Todas las sucursales</option>
            {oficinas.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {/* 🆕 Efectivo esperado para el cierre, por sucursal */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center gap-2 mb-1">
          <HiCurrencyDollar className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Efectivo esperado para el cierre
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          Efectivo que entró menos el que salió el {fmtDate(filtroFecha)}. No incluye el saldo arrastrado de días anteriores.
        </p>

        {loadingEsperado ? (
          <div className="text-xs text-slate-500">Calculando…</div>
        ) : (esperado?.por_oficina?.length || esperado?.sin_oficina) ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(esperado?.por_oficina || []).map((o) => (
              <div
                key={o.scope?.oficina ?? o.scope?.oficina_nombre}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="text-[11px] text-slate-400 truncate" title={o.scope?.oficina_nombre}>
                  {o.scope?.oficina_nombre || "—"}
                </div>
                <div className="text-lg font-bold text-emerald-400">
                  $ {fmtNum(o.totales?.saldo_caja_chica || 0)}
                </div>
              </div>
            ))}
            {esperado?.sin_oficina && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[11px] text-slate-400 truncate">Sin sucursal</div>
                <div className="text-lg font-bold text-slate-400">
                  $ {fmtNum(esperado.sin_oficina.totales?.saldo_caja_chica || 0)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Sin movimientos de efectivo para esa fecha.</div>
        )}
      </div>

      {/* Conteo */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {items.length} cierre{items.length !== 1 ? "s" : ""} encontrado{items.length !== 1 ? "s" : ""}
        </span>
        {totalPages > 1 && (
          <span className="text-xs text-slate-600 font-mono">
            Página {page} de {totalPages}
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900 h-64 animate-pulse" />
          ))}
        </div>
      ) : paginados.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 py-16 text-center">
          <HiCamera className="mx-auto w-8 h-8 text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">No hay cierres para estos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginados.map((reg) => (
            <div key={reg.id} className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
              {/* Foto */}
              <div
                className="relative h-44 bg-black cursor-pointer group shrink-0"
                onClick={() => setFotoAmpliada(reg.foto_url)}
              >
                <img
                  src={reg.foto_url}
                  alt="Cierre"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <HiZoomIn className="text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute top-2 left-2">
                  <BadgeAuditoria estado={reg.estado_auditoria} diferencia={reg.diferencia} />
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex-1 space-y-2.5">
                {/* Montos */}
                <div className="rounded-md border border-slate-800 bg-slate-950 divide-y divide-slate-800">
                  <div className="flex justify-between px-3 py-1.5 text-xs">
                    <span className="text-slate-500">Declarado</span>
                    <span className="font-mono text-slate-200">${fmtNum(reg.monto_declarado)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1.5 text-xs">
                    <span className="text-slate-500">Sistema</span>
                    <span className="font-mono text-slate-400">${fmtNum(reg.monto_sistema)}</span>
                  </div>
                </div>

                {/* Meta */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <HiOfficeBuilding className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="text-sky-400 font-medium truncate">{reg.oficina_nombre || "Sucursal"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <HiCalendar className="w-3.5 h-3.5 shrink-0" />
                    {fmtDate(reg.creado_en)}
                    <HiClock className="w-3.5 h-3.5 ml-1 shrink-0" />
                    {fmtTime(reg.creado_en)}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-mono truncate">
                    {reg.usuario_nombre}
                  </span>
                  {reg.empleado_nombre && (
                    <span className="text-[10px] font-mono border border-sky-800 bg-sky-950/30 text-sky-400 rounded px-1.5 py-0.5 truncate max-w-[80px]">
                      {reg.empleado_nombre}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors inline-flex items-center justify-center"
          >
            <HiChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 font-mono px-2">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors inline-flex items-center justify-center"
          >
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Foto ampliada */}
      <AnimatePresence>
        {fotoAmpliada && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setFotoAmpliada(null)}
          >
            <button className="absolute top-5 right-5 h-9 w-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors">
              <HiX className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={fotoAmpliada}
              alt="Cierre ampliado"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}