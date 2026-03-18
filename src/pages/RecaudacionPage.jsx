// src/pages/RecaudacionPage.jsx
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { 
  HiCamera, HiUpload, HiOutlineOfficeBuilding, 
  HiClock, HiCalendar, HiFilter, HiX, HiZoomIn, 
  HiCurrencyDollar, HiPrinter, HiReceiptTax, HiCheckCircle, HiExclamationCircle, HiChevronDoubleUp, HiChevronDoubleDown,
  HiUser // 🚀 Nuevo icono
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO, REDUX Y UTILIDADES
import { useAuth } from "../context/AuthContext";
import { fetchRecaudaciones, uploadRecaudacion, fetchEmpleadosActivos } from "../store/slices/recaudacionSlice";
import { uploadToCloudinary } from "../utils/cloudinary";
import api from "../services/api";

const RecaudacionPage = () => {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-20">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Caja y Recaudación
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-widest">
                Cierre Diario
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {isWebAdmin 
                ? "Panel de auditoría: Verificá los cierres de caja de todas las sucursales." 
                : "Completá los 3 pasos para registrar el cierre de caja física."}
            </p>
          </div>
        </div>

        {isWebAdmin ? <AdminGalleryView /> : <UserUploadView user={user} />}

      </div>
    </div>
  );
};

/* =========================================================
   👩‍💻 VISTA USUARIO NORMAL: TICKET + SUBIR FOTO
========================================================= */
function UserUploadView({ user }) {
  const dispatch = useDispatch();
  const { uploading, empleados, loadingEmpleados } = useSelector((state) => state.recaudacion);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const fileInputRef = useRef(null);

  // ESTADOS TICKET
  const [balanceDia, setBalanceDia] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [horaImpresion, setHoraImpresion] = useState("");

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState("");

  useEffect(() => {
    // 1. Traer Balance
    const fetchBalance = async () => {
      setLoadingBalance(true);
      try {
        const res = await api.get("balance-diario/");
        setBalanceDia(res.data);
        if (res.data?.totales?.saldo_caja_chica) {
          setMontoDeclarado(res.data.totales.saldo_caja_chica.replace("$", "").replace(/\./g, "").replace(",", ".").trim());
        }
      } catch (error) {
        console.error("Error trayendo balance", error);
      } finally {
        setLoadingBalance(false);
      }
    };
    fetchBalance();

    // 2. Traer Empleados desde Redux
    dispatch(fetchEmpleadosActivos());
  }, [dispatch]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
    }
  };

  const handleUpload = async () => {
    if (!empleadoSeleccionado) return toast.error("Por favor, seleccioná quién está rindiendo la caja en el Paso 1.");
    if (!file) return toast.error("Tenés que sacar una foto primero en el Paso 3.");
    
    try {
      const uploadRes = await uploadToCloudinary(file, { folder: "de-thames/recaudacion" });
      
      const payload = {
        foto_url: uploadRes.secure_url,
        foto_public_id: uploadRes.public_id,
        monto_declarado: montoDeclarado ? Number(montoDeclarado) : null,
        empleado: empleadoSeleccionado,
      };

      await dispatch(uploadRecaudacion(payload)).unwrap();
      
      toast.success("¡Foto de recaudación enviada con éxito! 💸");
      setFile(null);
      setPreview(null);
      setEmpleadoSeleccionado("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al enviar la foto.");
    }
  };

  // 🚀 FUNCIÓN DE IMPRESIÓN (TICKET 80MM)
  const handlePrint = () => {
    if (!empleadoSeleccionado) return toast.error("Seleccioná tu nombre (Paso 1) antes de imprimir el ticket.");
    
    const horaActual = dayjs().format("DD/MM/YYYY HH:mm:ss");
    setHoraImpresion(horaActual);

    const empleadoNombre = empleados.find(e => e.id === Number(empleadoSeleccionado))?.nombre || "N/A";
    const totalFisico = new Intl.NumberFormat("es-AR").format(balanceDia.totales.saldo_caja_chica);
    const ingresosEfe = new Intl.NumberFormat("es-AR").format(balanceDia.ingresos.por_forma_pago.find(f => f.forma_pago === "EFECTIVO")?.total || 0);
    const egresosEfe = new Intl.NumberFormat("es-AR").format(balanceDia.egresos.por_forma_pago.find(f => f.forma_pago === "EFECTIVO")?.total || 0);
    const cantOp = balanceDia.totales.ingresos_cantidad + balanceDia.totales.egresos_cantidad;
    const sucursal = balanceDia.scope?.oficina_nombre || "Sucursal";

    const printWindow = window.open("", "_blank", "width=300,height=500");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Cierre</title>
          <style>
            @page { margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              margin: 0;
              padding: 15px 10px;
              color: #000;
              font-size: 12px;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .title { font-size: 18px; margin-bottom: 5px; }
            .total-box { margin: 15px 0; }
            .total-monto { font-size: 28px; font-weight: bold; margin: 5px 0; letter-spacing: -1px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title bold">THAMES SEGUROS</div>
            <div class="bold">${sucursal.toUpperCase()}</div>
            <div style="margin-top: 5px;">FECHA: ${balanceDia.fecha_hum}</div>
            <div>TICKET CIERRE DE CAJA</div>
          </div>

          <div class="line"></div>

          <div class="center total-box">
            <div style="font-size: 10px; text-transform: uppercase;">Total a rendir (Físico)</div>
            <div class="total-monto">$${totalFisico}</div>
            <div style="font-size: 11px; margin-top: 8px;">RESPONSABLE CAJA:</div>
            <div class="bold" style="font-size: 15px;">${empleadoNombre}</div>
          </div>

          <div class="line"></div>

          <div class="flex">
            <span>Ingresos (Evo):</span>
            <span>$${ingresosEfe}</span>
          </div>
          <div class="flex">
            <span>Egresos (Evo):</span>
            <span>-$${egresosEfe}</span>
          </div>
          <div class="flex" style="color: #444; font-size: 10px; margin-top: 8px;">
            <span>Cant. Operaciones:</span>
            <span>${cantOp}</span>
          </div>

          <div class="line"></div>

          <div class="center" style="font-size: 11px;">
            <div style="color: #555;">CTA: ${user?.username.toUpperCase()}</div>
            <div>${horaActual}</div>
            <div class="bold" style="margin-top: 15px;">--- CIERRE VÁLIDO ---</div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <div className="space-y-6">
        
        {/* ================= PASO 1 ================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xl">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Elegir Responsable</h2>
              <p className="text-xs text-slate-400 mt-1">¿Quién cierra la caja hoy?</p>
            </div>
          </div>
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400/50"><HiUser className="text-xl"/></span>
            <select 
              value={empleadoSeleccionado}
              onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white font-bold outline-none focus:border-sky-500 focus:ring-1 ring-sky-500/50 transition-all cursor-pointer appearance-none"
            >
              <option value="" disabled>
                {loadingEmpleados ? "Cargando empleados..." : "Seleccionar Empleado..."}
              </option>
              {empleados.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ================= PASO 2 ================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xl">
              2
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Ticket de Cierre</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">Imprimí y colocá el ticket sobre los billetes</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6 bg-slate-950/50 py-3 px-4 rounded-2xl border border-slate-800">
            <div className="relative w-20 h-16 flex items-center justify-center shrink-0">
              <div className="absolute w-16 h-8 bg-emerald-600/80 rounded border border-emerald-400/50 -rotate-6 shadow-lg flex items-center justify-center">
                <div className="w-6 h-3 border border-emerald-300/30 rounded-full"></div>
              </div>
              <div className="absolute w-16 h-8 bg-emerald-500 rounded border border-emerald-400 shadow-lg flex items-center justify-center">
                <div className="w-6 h-3 border border-emerald-200/50 rounded-full"></div>
              </div>
              <div className="absolute w-7 h-11 bg-slate-50 border border-slate-300 shadow-md rotate-12 flex flex-col gap-[3px] p-1 top-1 right-2">
                <div className="w-full h-[2px] bg-slate-300 rounded-full"></div>
                <div className="w-3/4 h-[2px] bg-slate-300 rounded-full"></div>
                <div className="w-full h-[2px] bg-slate-300 rounded-full"></div>
                <div className="w-1/2 h-[2px] bg-slate-800 mt-auto rounded-full"></div>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-tight max-w-[130px]">
              El ticket impreso tiene que verse <span className="text-white font-bold">claramente</span> en la foto.
            </p>
          </div>

          {loadingBalance ? (
            <div className="h-12 flex items-center justify-center text-amber-400 text-sm font-bold animate-pulse">
              Calculando balance...
            </div>
          ) : balanceDia ? (
            <button 
              onClick={() => {
                if(!empleadoSeleccionado) return toast.error("Elegí un empleado en el Paso 1.");
                setShowTicket(true);
              }}
              className="cursor-pointer w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              <HiPrinter className="text-lg" /> Ver e Imprimir
            </button>
          ) : (
            <div className="text-center text-slate-500 text-sm py-2">No se pudo cargar el balance.</div>
          )}
        </div>
      </div>

      {/* ================= PASO 3 ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xl">
            3
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-none">Subir Foto</h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">Capturá la plata con el ticket arriba</p>
          </div>
        </div>

        {!preview ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer group flex-1 flex flex-col items-center justify-center min-h-[180px] w-full border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl bg-slate-950/50 hover:bg-emerald-500/5 transition-all mb-6"
          >
            <div className="h-14 w-14 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 flex items-center justify-center mb-3 transition-colors">
              <HiCamera className="text-3xl text-slate-400 group-hover:text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-slate-300">Tocar para abrir la cámara</p>
          </div>
        ) : (
          <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-700 bg-black mb-6">
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            <button 
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-3 right-3 h-8 w-8 bg-black/60 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer"
            >
              <HiX />
            </button>
          </div>
        )}

        <input 
          type="file" accept="image/*" capture="environment" className="hidden" 
          ref={fileInputRef} onChange={handleFileChange}
        />

        <div className="mt-auto">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Monto Físico (Se llena solo)</label>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold"><HiCurrencyDollar className="text-lg"/></span>
            <input 
              type="number" 
              value={montoDeclarado}
              onChange={(e) => setMontoDeclarado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white font-bold outline-none focus:border-emerald-500 focus:ring-1 ring-emerald-500/50 transition-all"
            />
          </div>

          <button 
            onClick={handleUpload}
            disabled={!file || !empleadoSeleccionado || uploading}
            className="cursor-pointer w-full h-14 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {uploading ? (
              <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <><HiUpload className="text-xl" /> Enviar Cierre Definitivo</>
            )}
          </button>
        </div>
      </div>

      {/* ================= MODAL DE VISTA PREVIA DEL TICKET EN PANTALLA ================= */}
      <AnimatePresence>
        {showTicket && balanceDia && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setShowTicket(false)}
          >
            <div 
              className="bg-white text-black p-6 shadow-2xl max-w-[320px] w-full mx-auto font-mono text-sm relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowTicket(false)} 
                className="absolute -top-4 -right-4 bg-rose-500 text-white rounded-full p-1.5 shadow-lg cursor-pointer"
              >
                <HiX className="text-xl" />
              </button>

              <div className="text-center mb-4 border-b-2 border-dashed border-gray-400 pb-4">
                <h1 className="text-xl font-black uppercase tracking-widest">THAMES SEGUROS</h1>
                <p className="font-bold uppercase text-xs mt-1">{balanceDia.scope?.oficina_nombre || "Sucursal"}</p>
                <p className="text-[10px] mt-2">FECHA: {balanceDia.fecha_hum}</p>
                <p className="text-[10px]">VISTA PREVIA TICKET</p>
              </div>

              <div className="text-center mb-4 border-b-2 border-dashed border-gray-400 pb-4">
                <p className="text-[10px] font-bold uppercase mb-1">Total a rendir (Físico)</p>
                <p className="text-4xl font-black tracking-tighter">
                  ${new Intl.NumberFormat("es-AR").format(balanceDia.totales.saldo_caja_chica)}
                </p>
                <div className="mt-3">
                  <p className="text-[10px]">RESPONSABLE CAJA:</p>
                  <p className="font-bold text-sm">
                    {empleados.find(e => e.id === Number(empleadoSeleccionado))?.nombre || "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                <div className="flex justify-between">
                  <span>Ingresos (Evo):</span>
                  <span>${new Intl.NumberFormat("es-AR").format(
                    balanceDia.ingresos.por_forma_pago.find(f => f.forma_pago === "EFECTIVO")?.total || 0
                  )}</span>
                </div>
                <div className="flex justify-between">
                  <span>Egresos (Evo):</span>
                  <span>-${new Intl.NumberFormat("es-AR").format(
                    balanceDia.egresos.por_forma_pago.find(f => f.forma_pago === "EFECTIVO")?.total || 0
                  )}</span>
                </div>
              </div>

              <div className="text-center text-[10px]">
                <p className="text-gray-500">CTA: {user?.username.toUpperCase()}</p>
                <p>{horaImpresion || "Pendiente de impresión"}</p>
                <p className="mt-4 font-bold">--- CIERRE VÁLIDO ---</p>
              </div>

              <button 
                onClick={handlePrint}
                className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs cursor-pointer flex justify-center gap-2 items-center transition-colors"
              >
                <HiPrinter className="text-base" /> IMPRIMIR TICKET REAL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =========================================================
   🕵️‍♂️ VISTA ADMIN: GALERÍA Y AUDITORÍA
========================================================= */
function AdminGalleryView() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.recaudacion);
  
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [filtroOficina, setFiltroOficina] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  useEffect(() => {
    dispatch(fetchRecaudaciones({ oficina: filtroOficina, fecha: filtroFecha }));
  }, [dispatch, filtroOficina, filtroFecha]);

  const renderBadgeAuditoria = (estado, diferencia) => {
    if (!estado) return null;
    const diffFormateada = new Intl.NumberFormat("es-AR").format(Math.abs(diferencia || 0));

    switch (estado.toUpperCase()) {
      case "OK":
        return (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20 backdrop-blur-sm">
            <HiCheckCircle className="text-sm" /> BALANCE OK
          </div>
        );
      case "FALTANTE":
        return (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-400/10 px-2 py-1 rounded border border-rose-400/20 backdrop-blur-sm">
            <HiChevronDoubleDown className="text-sm" /> FALTAN ${diffFormateada}
          </div>
        );
      case "SOBRANTE":
        return (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20 backdrop-blur-sm">
            <HiChevronDoubleUp className="text-sm" /> SOBRAN ${diffFormateada}
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-700 backdrop-blur-sm">
            <HiExclamationCircle className="text-sm" /> PENDIENTE
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-xs tracking-widest">
          <HiFilter className="text-lg" /> Filtros
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input 
            type="date" 
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="cursor-pointer bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2 outline-none focus:border-emerald-500 text-sm"
          />
          <select 
            value={filtroOficina}
            onChange={(e) => setFiltroOficina(e.target.value)}
            className="cursor-pointer bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2 outline-none focus:border-emerald-500 text-sm"
          >
            <option value="">Todas las sucursales</option>
            <option value="1">5 Esquinas (1)</option>
            <option value="2">Axion (2)</option>
            <option value="3">Km 39 (3)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
          <HiCamera className="mx-auto text-5xl text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No hay fotos de recaudación para estos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((reg) => (
            <motion.div 
              key={reg.id} 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg group flex flex-col"
            >
              <div 
                className="relative h-48 w-full bg-black cursor-pointer overflow-hidden shrink-0"
                onClick={() => setFotoAmpliada(reg.foto_url)}
              >
                <img src={reg.foto_url} alt="Caja" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <HiZoomIn className="text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                </div>
                
                <div className="absolute top-3 left-3">
                  {renderBadgeAuditoria(reg.estado_auditoria, reg.diferencia)}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Declarado (Físico):</span>
                    <span className="font-bold text-white">
                      ${reg.monto_declarado ? new Intl.NumberFormat("es-AR").format(reg.monto_declarado) : "0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Calculado (Sistema):</span>
                    <span className="font-bold text-slate-300">
                      ${reg.monto_sistema ? new Intl.NumberFormat("es-AR").format(reg.monto_sistema) : "0"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <HiOutlineOfficeBuilding className="text-sky-400" />
                    <span className="font-bold text-sky-400 uppercase">{reg.oficina_nombre || "Sucursal"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <HiCalendar className="text-slate-500" />
                    {dayjs(reg.creado_en).format("DD/MM/YYYY")}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <HiClock className="text-slate-500" />
                    {dayjs(reg.creado_en).format("HH:mm:ss")} hs
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest flex justify-between items-center">
                  <div>
                    Cuenta: <span className="font-bold text-slate-300">{reg.usuario_nombre}</span>
                  </div>
                  {reg.empleado_nombre && (
                    <div className="text-sky-400 flex items-center gap-1 font-bold bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                      <HiUser /> {reg.empleado_nombre}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {fotoAmpliada && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setFotoAmpliada(null)}
          >
            <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur-md cursor-pointer">
              <HiX className="text-3xl" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={fotoAmpliada} 
              alt="Caja ampliada" 
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RecaudacionPage;