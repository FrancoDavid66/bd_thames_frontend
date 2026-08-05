// src/pages/RecaudacionPage.jsx  (diseño Duo · responsive)
//
// 📱 RESPONSIVE (esta pasada):
//   - VISTA EMPLEADO: la barra de 3 pasos (StepsBar) queda más compacta en
//     mobile sin aplastarse; inputs/botones ya a 44-48px.
//   - VISTA ADMIN: toolbar de filtros (fecha/oficina/actualizar) se apila a lo
//     ancho en mobile; KPIs y grilla 1 col en celu (2-4 en desktop, como antes);
//     paginación con botones ≥44px; modal ticket y foto ampliada full-width.
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  HiCamera, HiUpload, HiOfficeBuilding,
  HiClock, HiCalendar, HiX, HiZoomIn,
  HiCurrencyDollar, HiPrinter, HiCheckCircle,
  HiExclamationCircle, HiChevronDoubleUp, HiChevronDoubleDown,
  HiUser, HiRefresh, HiChevronLeft, HiChevronRight,
  HiCheck,
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
// 🚀 NUEVO: panel de quién cerró / no cerró en un día
import EstadoCierresDia from "../components/recaudacion/EstadoCierresDia";
import AdminHorariosCierre from "../components/admin/AdminHorariosCierre";

import EjemploDineroImg from "../assets/ejemplo_dinero.jpg";

/* ─── helpers ───────────────────────────────────────────────── */
const fmtNum  = (n) => new Intl.NumberFormat("es-AR").format(Number(n || 0));
const fmtDate = (v) => dayjs(v).format("DD/MM/YYYY");
const fmtTime = (v) => dayjs(v).format("HH:mm");

/* ─── compresión de imagen (client-side) ─────────────────────────
   Redimensiona a máx 1280px (lado largo) y exporta JPEG calidad 0.8.
   Si algo falla, devuelve el archivo original (no bloquea el cierre).
   🛡️ Blindada contra "colgado eterno": tiene TIMEOUT (si toBlob no responde
   en 15s, sube el original) y un try/catch DENTRO de onload (si el canvas
   falla — HEIC, imagen enorme en un celu viejo — también cae al original). */
const comprimirImagen = (file) =>
  new Promise((resolve) => {
    let listo = false;
    const terminar = (resultado) => {
      if (listo) return;      // resolvemos UNA sola vez
      listo = true;
      resolve(resultado);
    };
    // Red de seguridad: pase lo que pase, en 15s devolvemos el original.
    const timer = setTimeout(() => terminar(file), 15000);
    const cerrar = (resultado) => { clearTimeout(timer); terminar(resultado); };

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const MAX = 1280;
          let { width, height } = img;
          if (width > height && width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
          else if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { URL.revokeObjectURL(url); return cerrar(file); }
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          canvas.toBlob(
            (blob) => cerrar(blob ? new File([blob], file.name || "cierre.jpg", { type: "image/jpeg" }) : file),
            "image/jpeg",
            0.8
          );
        } catch {
          URL.revokeObjectURL(url);
          cerrar(file);   // el canvas falló (HEIC, memoria) → subimos el original
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); cerrar(file); };
      img.src = url;
    } catch { cerrar(file); }
  });

/* ─── badge auditoría (diseño Duo) ──────────────────────────────
   OK → ingreso (verde) · FALTANTE → egreso (rojo) · SOBRANTE → tarjeta (ámbar) · Pendiente → suave (gris) */
const BadgeAuditoria = memo(function BadgeAuditoria({ estado, diferencia }) {
  const diff = fmtNum(Math.abs(diferencia || 0));
  if (estado === "OK")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black border-2 border-ingreso/40 bg-ingreso/10 text-ingreso dark:text-ingreso-claro rounded-lg px-2 py-0.5">
        <HiCheckCircle className="w-3 h-3" /> OK
      </span>
    );
  if (estado === "FALTANTE")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black border-2 border-egreso/40 bg-egreso/10 text-egreso dark:text-egreso-claro rounded-lg px-2 py-0.5">
        <HiChevronDoubleDown className="w-3 h-3" /> -{diff}
      </span>
    );
  if (estado === "SOBRANTE")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black border-2 border-tarjeta/40 bg-tarjeta/10 text-tarjeta dark:text-tarjeta-claro rounded-lg px-2 py-0.5">
        <HiChevronDoubleUp className="w-3 h-3" /> +{diff}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark rounded-lg px-2 py-0.5">
      <HiExclamationCircle className="w-3 h-3" /> Pendiente
    </span>
  );
});

/* ─── RecaudacionPage ───────────────────────────────────────── */
export default function RecaudacionPage() {
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-oficina/15 flex items-center justify-center text-2xl shrink-0">💵</div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-titulo dark:text-titulo-dark tracking-tight">
            Caja y Recaudación
          </h1>
          <p className="text-sm font-bold text-suave dark:text-suave-dark mt-0.5">
            {isAdmin
              ? "Panel de auditoría — cierres de todas las sucursales"
              : "Registrá el cierre de caja diario en 3 pasos"}
          </p>
        </div>
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
  // 🆕 Estado de éxito: tras enviar, mostramos un bloque de confirmación.
  const [enviado, setEnviado]             = useState(null);
  // 🛡️ Bloqueo local del botón durante TODA la subida (compresión + Cloudinary + POST).
  const [enviando, setEnviando]           = useState(false);

  // Historial del empleado actual (sus últimos 5 cierres). Comparamos por id.
  const miId = user?.id ?? user?.perfil?.id ?? user?.pk;
  const misCierres = items
    .filter((r) => r.usuario === miId)
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

  // Limpia el object URL del preview al desmontar (evita fuga de memoria).
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const fmtInput = (v) => {
    const clean = v.replace(/\D/g, "");
    return clean ? fmtNum(clean) : "";
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      return toast.error("Tiene que ser una foto.");
    }
    // 🛡️ Rechazamos HEIC/HEIF (fotos de iPhone de la galería).
    const nombre = (f.name || "").toLowerCase();
    if (/hei[cf]/.test(f.type.toLowerCase()) || nombre.endsWith(".heic") || nombre.endsWith(".heif")) {
      return toast.error("Esa foto es HEIC (de iPhone). Sacala directo con la cámara, no la elijas de la galería.");
    }
    if (f.size > 10 * 1024 * 1024) {
      return toast.error("La foto es muy pesada (máx 10MB). Sacala de nuevo con menos calidad.");
    }
    // Revocamos el preview anterior antes de crear el nuevo (evita fuga).
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // Limpia la foto y libera el preview (botón X y tras enviar).
  const limpiarFoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const handleUpload = async () => {
    if (enviando)    return;   // ya se está enviando: ignoramos toques repetidos
    if (!empleado)   return toast.error("Elegí el responsable en el Paso 1.");
    if (!monto)      return toast.error("Ingresá el monto contado en el Paso 3.");
    if (!file)       return toast.error("Sacá la foto en el Paso 3.");
    setEnviando(true);   // bloquea el botón desde YA (antes de comprimir)
    try {
      // Comprimimos la foto antes de subir. Si falla, subimos el original.
      let fileComprimido = file;
      try {
        fileComprimido = await comprimirImagen(file);
      } catch { fileComprimido = file; }

      const up = await uploadToCloudinary(fileComprimido, { folder: "de-thames/recaudacion" });
      await dispatch(uploadRecaudacion({
        foto_url:       up.secure_url,
        foto_public_id: up.public_id,
        monto_declarado: Number(monto.replace(/\D/g, "")),
        empleado,
      })).unwrap();
      toast.success("Cierre enviado correctamente.");
      setEnviado(fmtNum(monto.replace(/\D/g, "")));
      limpiarFoto();
      setMonto(""); setEmpleado("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      dispatch(fetchRecaudaciones());
    } catch {
      toast.error("Error al enviar el cierre. Intentá de nuevo.");
    } finally {
      setEnviando(false);   // pase lo que pase, se rehabilita
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

  const canSubmit = !!empleado && !!monto && !!file && !uploading && !enviando;

  // 🆕 Progreso de los 3 pasos.
  const step1Done = !!empleado;
  const step2Done = step1Done;                 // paso 2 es opcional; se ilumina con el 1
  const step3Done = !!file && !!monto;

  // 🆕 Texto guía: qué falta para poder enviar.
  const faltantes = [];
  if (!empleado) faltantes.push("elegir responsable");
  if (!file)     faltantes.push("sacar la foto");
  if (!monto)    faltantes.push("ingresar el monto");
  const faltanTexto =
    faltantes.length === 0 ? "" :
    faltantes.length === 1 ? `Falta: ${faltantes[0]}` :
    `Falta: ${faltantes.slice(0, -1).join(", ")} y ${faltantes[faltantes.length - 1]}`;

  // 🆕 Bloque de éxito: reemplaza el formulario tras un envío correcto.
  if (enviado) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="rounded-2xl border-2 border-ingreso/40 bg-ingreso/10 p-8 text-center flex flex-col items-center gap-3">
          <span className="h-16 w-16 rounded-full bg-ingreso text-white flex items-center justify-center">
            <HiCheck className="w-9 h-9" />
          </span>
          <div>
            <p className="text-lg font-black text-titulo dark:text-titulo-dark">Cierre enviado</p>
            <p className="text-sm font-bold text-suave dark:text-suave-dark mt-1">Se registró correctamente el cierre de caja.</p>
          </div>
          <div className="mt-1 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-6 py-3">
            <p className="text-[11px] uppercase tracking-wide font-black text-suave dark:text-suave-dark">Monto declarado</p>
            <p className="text-2xl font-black font-mono text-ingreso dark:text-ingreso-claro mt-0.5">${enviado}</p>
          </div>
          <button
            onClick={() => setEnviado(null)}
            className="mt-3 h-11 px-5 rounded-2xl bg-oficina text-white text-sm font-black shadow-[0_4px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all inline-flex items-center justify-center gap-2"
          >
            <HiRefresh className="w-4 h-4" /> Cargar otro cierre
          </button>
        </div>

        {/* ── Mis cierres recientes ───────────────────────────── */}
        <MisCierres misCierres={misCierres} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── Barra de pasos ──────────────────────────────────── */}
      <StepsBar
        steps={[
          { label: "Responsable", done: step1Done },
          { label: "Ticket",      done: step2Done },
          { label: "Foto + Monto", done: step3Done },
        ]}
      />

      {/* ── Paso 1: Responsable ─────────────────────────────── */}
      <StepCard number={1} title="Elegir responsable" desc="¿Quién cierra la caja hoy?" tone="oficina" done={step1Done}>
        <div className="relative">
          <HiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-suave dark:text-suave-dark z-10" />
          <select
            value={empleado}
            onChange={(e) => setEmpleado(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-sm font-bold text-titulo dark:text-titulo-dark focus:outline-none focus:border-oficina transition-colors dark:[color-scheme:dark] cursor-pointer"
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
      <StepCard number={2} title="Imprimir ticket de cierre" desc="Imprimí y colocalo sobre los billetes" tone="tarjeta" done={step2Done}>
        {/* Ejemplo colapsable */}
        <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark overflow-hidden">
          <button
            type="button"
            onClick={() => setShowEjemplo((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors"
          >
            <span>Ver ejemplo de cómo sacar la foto</span>
            <span>{showEjemplo ? "▲" : "▼"}</span>
          </button>
          {showEjemplo && (
            <div className="px-3 pb-3 flex items-start gap-3">
              <img
                src={EjemploDineroImg}
                alt="Ejemplo"
                className="w-28 h-20 object-cover rounded-xl border-2 border-linea dark:border-linea-dark shrink-0 cursor-pointer"
                onClick={() => setShowTicket(false)}
              />
              <p className="text-xs font-bold text-suave dark:text-suave-dark leading-relaxed">
                El ticket impreso tiene que estar <strong className="text-titulo dark:text-titulo-dark">arriba</strong> de los billetes y verse <strong className="text-titulo dark:text-titulo-dark">claramente</strong> en la foto.
              </p>
            </div>
          )}
        </div>

        {loadingBal ? (
          <p className="text-xs font-bold text-suave dark:text-suave-dark text-center py-2 animate-pulse">Calculando balance...</p>
        ) : balanceDia ? (
          <button
            onClick={() => {
              if (!empleado) return toast.error("Elegí el responsable primero.");
              setShowTicket(true);
            }}
            className="w-full h-11 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-tarjeta text-titulo dark:text-titulo-dark text-sm font-black transition-colors inline-flex items-center justify-center gap-2"
          >
            <HiPrinter className="w-4 h-4" /> Ver e imprimir ticket
          </button>
        ) : (
          <p className="text-xs font-bold text-suave dark:text-suave-dark text-center py-2">No se pudo cargar el balance del día.</p>
        )}
      </StepCard>

      {/* ── Paso 3: Foto + monto ────────────────────────────── */}
      <StepCard number={3} title="Foto y monto" desc="Sacá la foto con el ticket visible y anotá el monto" tone="ingreso" done={step3Done}>
        <div className="space-y-3">
          {/* Zona de foto */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-36 rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark hover:border-oficina bg-surface dark:bg-surface-dark flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <HiCamera className="w-7 h-7 text-suave dark:text-suave-dark" />
              <p className="text-sm font-bold text-suave dark:text-suave-dark">Tocar para abrir la cámara</p>
            </div>
          ) : (
            <div className="relative h-36 rounded-2xl overflow-hidden border-2 border-linea dark:border-linea-dark bg-black">
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              <button
                onClick={limpiarFoto}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 hover:bg-egreso text-white flex items-center justify-center transition-colors"
              >
                <HiX className="w-4 h-4" />
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

          {/* Monto — el dato más importante: input grande y protagonista */}
          <div>
            <label className="block text-[11px] uppercase tracking-wide font-black text-suave dark:text-suave-dark mb-1.5">
              Monto físico contado
            </label>
            <div className="flex items-center gap-2 w-full rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark focus-within:border-ingreso px-3 h-14 transition-colors">
              <HiCurrencyDollar className="w-5 h-5 text-ingreso dark:text-ingreso-claro shrink-0" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 100.000"
                value={fmtInput(monto)}
                onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))}
                className="flex-1 min-w-0 bg-transparent text-xl font-mono font-black text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none"
              />
            </div>
            <p className="text-[11px] font-bold text-suave dark:text-suave-dark mt-1">
              Ingresá exactamente lo que contaste a mano.
            </p>
          </div>

          {/* Botón enviar */}
          <button
            onClick={handleUpload}
            disabled={!canSubmit}
            className="w-full h-12 rounded-2xl bg-ingreso text-white text-sm font-black shadow-[0_5px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all inline-flex items-center justify-center gap-2"
          >
            {(uploading || enviando) ? (
              <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" /> Enviando...</>
            ) : (
              <><HiUpload className="w-4 h-4" /> Enviar cierre definitivo</>
            )}
          </button>

          {/* 🆕 Guía: qué falta / todo listo */}
          {!canSubmit && !uploading && faltanTexto ? (
            <p className="text-suave dark:text-suave-dark text-xs font-bold text-center">{faltanTexto}</p>
          ) : canSubmit ? (
            <p className="text-ingreso dark:text-ingreso-claro text-xs font-black text-center inline-flex items-center justify-center gap-1 w-full">
              <HiCheck className="w-3.5 h-3.5" /> Todo listo para enviar
            </p>
          ) : null}
        </div>
      </StepCard>

      {/* ── Mis cierres recientes ───────────────────────────── */}
      <MisCierres misCierres={misCierres} />

      {/* ── Modal ticket ────────────────────────────────────── */}
      {showTicket && balanceDia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity"
          onClick={() => setShowTicket(false)}
        >
          <div
            className="bg-white text-black p-5 shadow-2xl max-w-[300px] w-full font-mono text-sm relative rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTicket(false)}
              className="absolute -top-3 -right-3 h-8 w-8 bg-titulo dark:bg-card-dark hover:bg-egreso text-white rounded-full flex items-center justify-center transition-colors"
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
              className="mt-4 w-full h-10 rounded-xl bg-oficina hover:bg-oficina-fuerte text-white text-xs font-black transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <HiPrinter className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mis cierres recientes (reutilizado en form y en éxito) ──── */
function MisCierres({ misCierres }) {
  if (!misCierres.length) return null;
  return (
    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
      <div className="px-4 py-3 border-b-2 border-linea dark:border-linea-dark">
        <h3 className="text-xs font-black text-suave dark:text-suave-dark uppercase tracking-wide">Mis últimos cierres</h3>
      </div>
      <div className="divide-y-2 divide-linea dark:divide-linea-dark">
        {misCierres.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={r.foto_url}
                alt="cierre"
                className="w-10 h-10 rounded-lg object-cover border-2 border-linea dark:border-linea-dark shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs text-titulo dark:text-titulo-dark font-mono font-bold">{fmtDate(r.creado_en)} · {fmtTime(r.creado_en)}</p>
                <p className="text-[11px] font-bold text-suave dark:text-suave-dark mt-0.5">{r.empleado_nombre || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-bold text-titulo dark:text-titulo-dark">
                ${fmtNum(r.monto_declarado)}
              </span>
              <BadgeAuditoria estado={r.estado_auditoria} diferencia={r.diferencia} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── StepsBar helper (diseño Duo) ───────────────────────────── */
function StepsBar({ steps }) {
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5 shrink-0 w-16 sm:w-auto">
            <span
              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-colors ${
                s.done
                  ? "bg-ingreso border-ingreso text-white"
                  : "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark"
              }`}
            >
              {s.done ? <HiCheck className="w-5 h-5" /> : i + 1}
            </span>
            <span className={`text-[10px] sm:text-[11px] text-center leading-tight font-black ${s.done ? "text-ingreso dark:text-ingreso-claro" : "text-suave dark:text-suave-dark"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span className={`h-1 flex-1 mx-2 -mt-5 rounded-full transition-colors ${s.done ? "bg-ingreso" : "bg-linea dark:bg-linea-dark"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── StepCard helper (diseño Duo) ───────────────────────────── */
const StepCard = memo(function StepCard({ number, title, desc, children, tone = "oficina", done = false }) {
  const tones = {
    oficina: "bg-oficina/10 text-oficina dark:text-oficina-claro border-oficina/40",
    tarjeta: "bg-tarjeta/10 text-tarjeta dark:text-tarjeta-claro border-tarjeta/40",
    ingreso: "bg-ingreso/10 text-ingreso dark:text-ingreso-claro border-ingreso/40",
  };
  const cls = done
    ? "bg-ingreso border-ingreso text-white"
    : (tones[tone] || tones.oficina);
  return (
    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className={`h-9 w-9 shrink-0 rounded-xl border-2 text-sm font-mono font-black flex items-center justify-center transition-colors ${cls}`}>
          {done ? <HiCheck className="w-5 h-5" /> : number}
        </span>
        <div>
          <p className="text-sm font-black text-titulo dark:text-titulo-dark leading-none">{title}</p>
          <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════
   VISTA ADMIN
═══════════════════════════════════════════════════════════════ */
function AdminView() {
  const dispatch = useDispatch();
  // 🆕 count viene del backend (paginación real). items YA es la página actual.
  const { items, count, loading, error } = useSelector((s) => s.recaudacion);

  const [filtroFecha,   setFiltroFecha]   = useState(dayjs().format("YYYY-MM-DD"));
  const [filtroOficina, setFiltroOficina] = useState("");
  const [oficinas,      setOficinas]      = useState([]);
  const [fotoAmpliada,  setFotoAmpliada]  = useState(null);
  const [page,          setPage]          = useState(1);
  // El panel de horarios se monta SOLO cuando se abre el <details>.
  const [horariosOpen,  setHorariosOpen]  = useState(false);
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

  // 🆕 PAGINACIÓN REAL: un ÚNICO effect que fetchea con la página actual.
  useEffect(() => {
    const params = { page, page_size: PAGE_SIZE };
    if (filtroFecha)   params.fecha   = filtroFecha;
    if (filtroOficina) params.oficina = filtroOficina;
    dispatch(fetchRecaudaciones(params));
  }, [dispatch, filtroFecha, filtroOficina, page]);

  // 🆕 Trae el efectivo esperado por sucursal (balance del día).
  // Pedimos SIEMPRE todas las sucursales (sin filtro de oficina).
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

  // Handlers de filtros: cambian el valor Y resetean page a 1.
  const onChangeFecha = (e) => {
    setFiltroFecha(e.target.value);
    setPage(1);
  };
  const onChangeOficina = (e) => {
    setFiltroOficina(e.target.value);
    setPage(1);
  };

  // Refrescar: vuelve a pedir la página actual con los filtros vigentes.
  const refresh = () => {
    const params = { page, page_size: PAGE_SIZE };
    if (filtroFecha)   params.fecha   = filtroFecha;
    if (filtroOficina) params.oficina = filtroOficina;
    dispatch(fetchRecaudaciones(params));
  };

  // 🆕 Paginación REAL: totalPages sale del count del backend.
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // 🆕 KPI: efectivo esperado total = suma de saldo_caja_chica de todas las sucursales.
  const efectivoEsperadoTotal =
    (esperado?.por_oficina || []).reduce((acc, o) => acc + Number(o.totales?.saldo_caja_chica || 0), 0) +
    Number(esperado?.sin_oficina?.totales?.saldo_caja_chica || 0);

  return (
    <div className="space-y-4">
      {/* 🆕 RESUMEN: KPIs grandes del día filtrado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-oficina/30 bg-gradient-to-br from-oficina/15 to-transparent p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-black text-suave dark:text-suave-dark">
            <HiCamera className="w-4 h-4 text-oficina dark:text-oficina-claro" />
            Cierres encontrados
          </div>
          <p className="text-3xl font-black text-titulo dark:text-titulo-dark mt-1.5">{count}</p>
          <p className="text-[11px] font-bold text-suave dark:text-suave-dark mt-0.5">del {fmtDate(filtroFecha)}{filtroOficina ? " · sucursal filtrada" : ""}</p>
        </div>
        <div className="rounded-2xl border-2 border-ingreso/30 bg-gradient-to-br from-ingreso/15 to-transparent p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-black text-suave dark:text-suave-dark">
            <HiCurrencyDollar className="w-4 h-4 text-ingreso dark:text-ingreso-claro" />
            Efectivo esperado total
          </div>
          <p className="text-3xl font-black text-ingreso dark:text-ingreso-claro mt-1.5 font-mono">
            {loadingEsperado ? "…" : `$ ${fmtNum(efectivoEsperadoTotal)}`}
          </p>
          <p className="text-[11px] font-bold text-suave dark:text-suave-dark mt-0.5">todas las sucursales · sin arrastre</p>
        </div>
      </div>

      {/* ⏰ Panel para configurar el horario de cierre por oficina. */}
      <details
        className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4"
        onToggle={(e) => setHorariosOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm sm:text-base font-black text-titulo dark:text-titulo-dark">
          ⏰ Horarios de cierre de caja (por oficina)
        </summary>
        <div className="mt-3">
          {horariosOpen && <AdminHorariosCierre />}
        </div>
      </details>

      {/* 🚀 Quién cerró / no cerró en un día */}
      <div>
        <h3 className="text-xs font-black text-suave dark:text-suave-dark uppercase tracking-wide mb-2">
          Estado de cierres del día
        </h3>
        <EstadoCierresDia />
      </div>

      {/* Toolbar — 📱 apilada a lo ancho en mobile */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex flex-col sm:flex-row gap-2 sm:flex-wrap flex-1">
          <input
            type="date"
            value={filtroFecha}
            onChange={onChangeFecha}
            className="h-11 w-full sm:w-auto rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark text-base sm:text-sm font-bold px-3 focus:outline-none focus:border-oficina transition-colors dark:[color-scheme:dark]"
          />
          <select
            value={filtroOficina}
            onChange={onChangeOficina}
            className="h-11 w-full sm:w-auto rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark text-base sm:text-sm font-bold px-3 focus:outline-none focus:border-oficina transition-colors dark:[color-scheme:dark] cursor-pointer"
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
          className="h-11 w-full sm:w-auto px-4 rounded-xl bg-oficina text-white text-sm font-black shadow-[0_4px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
        >
          <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {/* 🆕 Efectivo esperado para el cierre, por sucursal */}
      <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
        <div className="flex items-center gap-2 mb-1">
          <HiCurrencyDollar className="w-5 h-5 text-ingreso dark:text-ingreso-claro" />
          <h3 className="text-sm font-black text-titulo dark:text-titulo-dark">
            Efectivo esperado para el cierre
          </h3>
        </div>
        {filtroOficina && (
          <p className="text-suave dark:text-suave-dark text-[11px] font-bold mb-1">
            (muestra todas las sucursales, no solo la filtrada)
          </p>
        )}
        <p className="text-[11px] font-bold text-suave dark:text-suave-dark mb-3">
          Efectivo que entró menos el que salió el {fmtDate(filtroFecha)}. No incluye el saldo arrastrado de días anteriores.
        </p>

        {loadingEsperado ? (
          <div className="text-xs font-bold text-suave dark:text-suave-dark">Calculando…</div>
        ) : (esperado?.por_oficina?.length || esperado?.sin_oficina) ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(esperado?.por_oficina || []).map((o) => (
              <div
                key={o.scope?.oficina ?? o.scope?.oficina_nombre}
                className="rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3"
              >
                <div className="text-[11px] font-bold text-suave dark:text-suave-dark truncate" title={o.scope?.oficina_nombre}>
                  {o.scope?.oficina_nombre || "—"}
                </div>
                <div className="text-lg font-black text-ingreso dark:text-ingreso-claro font-mono">
                  $ {fmtNum(o.totales?.saldo_caja_chica || 0)}
                </div>
              </div>
            ))}
            {esperado?.sin_oficina && (
              <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3">
                <div className="text-[11px] font-bold text-suave dark:text-suave-dark truncate">Sin sucursal</div>
                <div className="text-lg font-black text-suave dark:text-suave-dark font-mono">
                  $ {fmtNum(esperado.sin_oficina.totales?.saldo_caja_chica || 0)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs font-bold text-suave dark:text-suave-dark">Sin movimientos de efectivo para esa fecha.</div>
        )}
      </div>

      {/* Conteo */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-suave dark:text-suave-dark">
          {count} cierre{count !== 1 ? "s" : ""} encontrado{count !== 1 ? "s" : ""}
        </span>
        {totalPages > 1 && (
          <span className="text-xs font-mono font-bold text-suave dark:text-suave-dark">
            Página {page} de {totalPages}
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark h-64 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border-2 border-dashed border-egreso/40 bg-egreso/10 py-16 text-center">
          <HiExclamationCircle className="mx-auto w-8 h-8 text-egreso dark:text-egreso-claro mb-3" />
          <p className="text-sm font-black text-egreso dark:text-egreso-claro">No se pudieron cargar los cierres.</p>
          <button
            onClick={refresh}
            className="mt-4 h-10 px-4 rounded-xl border-2 border-egreso/40 bg-egreso/10 hover:bg-egreso/20 text-egreso dark:text-egreso-claro text-sm font-black transition-colors inline-flex items-center gap-2"
          >
            <HiRefresh className="w-4 h-4" /> Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark bg-card dark:bg-card-dark py-16 text-center">
          <HiCamera className="mx-auto w-8 h-8 text-suave dark:text-suave-dark mb-3" />
          <p className="text-sm font-bold text-suave dark:text-suave-dark">No hay cierres para estos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((reg) => {
            // Color del borde/acento según el estado de auditoría del cierre.
            const acento =
              reg.estado_auditoria === "OK"       ? "border-ingreso/40" :
              reg.estado_auditoria === "FALTANTE" ? "border-egreso/40"  :
              reg.estado_auditoria === "SOBRANTE" ? "border-tarjeta/40" :
              "border-linea dark:border-linea-dark";
            return (
            <div key={reg.id} className={`rounded-2xl border-2 ${acento} bg-card dark:bg-card-dark overflow-hidden flex flex-col`}>
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
                <div className="rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark divide-y-2 divide-linea dark:divide-linea-dark">
                  <div className="flex justify-between px-3 py-1.5 text-xs">
                    <span className="font-bold text-suave dark:text-suave-dark">Declarado</span>
                    <span className="font-mono font-bold text-titulo dark:text-titulo-dark">${fmtNum(reg.monto_declarado)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1.5 text-xs">
                    <span className="font-bold text-suave dark:text-suave-dark">Sistema</span>
                    <span className="font-mono font-bold text-suave dark:text-suave-dark">${fmtNum(reg.monto_sistema)}</span>
                  </div>
                </div>

                {/* Meta */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-suave dark:text-suave-dark">
                    <HiOfficeBuilding className="w-3.5 h-3.5 text-oficina dark:text-oficina-claro shrink-0" />
                    <span className="text-oficina dark:text-oficina-claro font-black truncate">{reg.oficina_nombre || "Sucursal"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-suave dark:text-suave-dark">
                    <HiCalendar className="w-3.5 h-3.5 shrink-0" />
                    {fmtDate(reg.creado_en)}
                    <HiClock className="w-3.5 h-3.5 ml-1 shrink-0" />
                    {fmtTime(reg.creado_en)}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 border-t-2 border-linea dark:border-linea-dark flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-suave dark:text-suave-dark truncate">
                    {reg.usuario_nombre}
                  </span>
                  {reg.empleado_nombre && (
                    <span className="text-[10px] font-mono font-black border-2 border-oficina/40 bg-oficina/10 text-oficina dark:text-oficina-claro rounded-lg px-1.5 py-0.5 truncate max-w-[80px]">
                      {reg.empleado_nombre}
                    </span>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Página anterior"
            className="h-11 w-11 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-oficina text-titulo dark:text-titulo-dark disabled:opacity-40 transition-colors inline-flex items-center justify-center"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-mono font-bold text-suave dark:text-suave-dark px-2 min-w-[60px] text-center">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Página siguiente"
            className="h-11 w-11 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-oficina text-titulo dark:text-titulo-dark disabled:opacity-40 transition-colors inline-flex items-center justify-center"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Foto ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-opacity"
          onClick={() => setFotoAmpliada(null)}
        >
          <button className="absolute top-5 right-5 h-10 w-10 rounded-full bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark text-titulo dark:text-titulo-dark flex items-center justify-center transition-colors">
            <HiX className="w-5 h-5" />
          </button>
          <img
            src={fotoAmpliada}
            alt="Cierre ampliado"
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
