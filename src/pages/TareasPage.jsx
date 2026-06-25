/* src/pages/TareasPage.jsx */
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiPaperAirplane, HiDocumentText, HiUser, HiIdentification, HiCamera, HiCheckCircle, HiCloudUpload,
} from "react-icons/hi";

import { fetchTareasDia, marcarPolizaEnviada } from "../store/slices/tareasSlice";
import TareasHeader from "../components/tareas/TareasHeader";
import TareaCard from "../components/tareas/TareaCard";
import TareaItem from "../components/tareas/TareaItem";
import CompletarDatoClienteModal from "../components/tareas/CompletarDatoClienteModal";
import SubirFotosDniModal from "../components/tareas/SubirFotosDniModal";
import CompletarDatosPolizaModal from "../components/tareas/CompletarDatosPolizaModal";
import SubirFotosVehiculoModal from "../components/tareas/SubirFotosVehiculoModal";
import SubirPolizaSistemaModal from "../components/tareas/SubirPolizaSistemaModal";

const SECCIONES = [
  { key: "subir_poliza", titulo: "Subir póliza a sistema", icon: HiCloudUpload, tipo: "subir-poliza-sistema", accion: "Subir",
    c: { icon: "text-violet-400", chip: "bg-violet-500/15", badge: "bg-violet-500/20 text-violet-300", btn: "border-violet-500/40 text-violet-300 hover:bg-violet-500/10" } },
];

export default function TareasPage() {
  const dispatch = useDispatch();
  const { data, loading, marcando } = useSelector((s) => s.tareas);

  const [baseTotal, setBaseTotal] = useState(0);
  const [abierta, setAbierta] = useState(null); // key de la tarjeta abierta
  const [datoCliente, setDatoCliente] = useState(null);
  const [fotosCliente, setFotosCliente] = useState(null);
  const [datosPoliza, setDatosPoliza] = useState(null);
  const [fotosPoliza, setFotosPoliza] = useState(null);
  const [subirPoliza, setSubirPoliza] = useState(null);

  useEffect(() => { dispatch(fetchTareasDia()); }, [dispatch]);
  useEffect(() => { if (data) setBaseTotal((p) => Math.max(p, total)); }, [data, total]);

  const total = (data?.subir_poliza || []).length;
  const hechas = Math.max(0, baseTotal - total);
  const pct = baseTotal > 0 ? Math.round((hechas / baseTotal) * 100) : 0;

  const onMarcarEnviada = async (polizaId) => {
    const res = await dispatch(marcarPolizaEnviada(polizaId));
    if (marcarPolizaEnviada.fulfilled.match(res)) toast.success("Marcada como enviada ✅");
    else toast.error(res.payload || "No se pudo marcar.");
  };

  const onAccion = (seccion, item) => {
    if (seccion.tipo === "cliente-datos") setDatoCliente(item);
    else if (seccion.tipo === "cliente-fotos") setFotosCliente(item);
    else if (seccion.tipo === "poliza-datos") setDatosPoliza(item);
    else if (seccion.tipo === "poliza-fotos") setFotosPoliza(item);
    else if (seccion.tipo === "subir-poliza-sistema") setSubirPoliza(item);
  };

  const onCompletado = () => {
    setDatoCliente(null); setFotosCliente(null); setDatosPoliza(null); setFotosPoliza(null); setSubirPoliza(null);
    dispatch(fetchTareasDia());
  };

  const celebra = !loading && total === 0 && baseTotal > 0;
  const seccionAbierta = SECCIONES.find((s) => s.key === abierta) || null;
  const itemsAbiertos = seccionAbierta ? (data?.[seccionAbierta.key] || []) : [];
  const IconAbierta = seccionAbierta?.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <TareasHeader total={total} hechas={hechas} pct={pct} oficina={data?.oficina} fecha={data?.fecha}
          loading={loading} onRefresh={() => dispatch(fetchTareasDia())} />

        {loading && !data && <div className="text-center py-16 text-slate-500 text-sm">Cargando tareas…</div>}

        {(celebra || (!loading && total === 0)) && (
          <div className="text-center py-16">
            <HiCheckCircle className="w-16 h-16 mx-auto text-emerald-500 mb-3" />
            <div className="text-xl font-semibold text-slate-100">{celebra ? "¡Completaste todo! 🎉" : "¡Todo al día!"}</div>
            <div className="text-sm text-slate-500 mt-1">{celebra ? "Gran trabajo hoy." : "No hay tareas pendientes por ahora."}</div>
          </div>
        )}

        {data && total > 0 && (
          <>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {SECCIONES.map((sec) => (
                <TareaCard key={sec.key} seccion={sec} count={(data[sec.key] || []).length}
                  activa={abierta === sec.key}
                  onClick={() => setAbierta(abierta === sec.key ? null : sec.key)} />
              ))}
            </div>

            {/* Lista de la tarjeta abierta */}
            <AnimatePresence mode="wait">
              {seccionAbierta && itemsAbiertos.length > 0 && (
                <motion.div key={seccionAbierta.key}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mt-5 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${seccionAbierta.c.chip}`}>
                      {IconAbierta && <IconAbierta className={`w-5 h-5 ${seccionAbierta.c.icon}`} />}
                    </span>
                    <span className="text-sm font-medium text-slate-200">{seccionAbierta.titulo}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${seccionAbierta.c.badge}`}>{itemsAbiertos.length}</span>
                  </div>
                  <div className="divide-y divide-slate-800 max-h-[60vh] overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {itemsAbiertos.map((item) => (
                        <TareaItem key={`${seccionAbierta.key}-${item.poliza_id || item.cliente_id}`} item={item}
                          seccion={seccionAbierta} marcando={marcando}
                          onMarcarEnviada={onMarcarEnviada} onAccion={onAccion} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <CompletarDatoClienteModal isOpen={!!datoCliente} item={datoCliente} onClose={() => setDatoCliente(null)} onSaved={onCompletado} />
      <SubirFotosDniModal isOpen={!!fotosCliente} item={fotosCliente} onClose={() => setFotosCliente(null)} onSaved={onCompletado} />
      <CompletarDatosPolizaModal isOpen={!!datosPoliza} item={datosPoliza} onClose={() => setDatosPoliza(null)} onSaved={onCompletado} />
      <SubirFotosVehiculoModal isOpen={!!fotosPoliza} item={fotosPoliza} onClose={() => setFotosPoliza(null)} onSaved={onCompletado} />
      <SubirPolizaSistemaModal isOpen={!!subirPoliza} item={subirPoliza} onClose={() => setSubirPoliza(null)} onSaved={onCompletado} />
    </div>
  );
}