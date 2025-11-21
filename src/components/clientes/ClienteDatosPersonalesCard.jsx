import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

export default function ClienteDatosPersonalesCard({ cliente }) {
  const [show, setShow] = useState(false);
  const [url, setUrl] = useState(null);

  if (!cliente) return null;

  const frente = cliente?.archivo_dni_frente || cliente?.archivo_dni || null;
  const dorso = cliente?.archivo_dni_dorso || null;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setShow(false);
    if (show) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const open = (u) => { setUrl(u); setShow(true); };

  return (
    <motion.div
      className="bg-neutral-800 text-neutral-100 p-6 rounded-xl border border-neutral-700 shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-semibold mb-4">🧾 Datos personales</h2>
      <ul className="text-base space-y-2">
        <li><span className="text-yellow-400">🆔 DNI/CUIT:</span> <span className="font-semibold">{cliente.dni_cuit_cuil || "-"}</span></li>
        <li><span className="text-green-300">📞 Teléfono:</span> <span className="font-semibold">{cliente.telefono || "-"}</span></li>
        <li>
          <span className="text-blue-300">📧 Email:</span>{" "}
          {cliente.email ? <span className="font-semibold">{cliente.email}</span> : <span className="bg-red-600 text-white px-2 py-1 rounded">Falta Email</span>}
        </li>
        <li><span className="text-orange-300">📍 Dirección:</span> <span className="font-semibold">{cliente.direccion || "-"}</span></li>
        <li>
          <span className="text-teal-300">🏘️ Localidad:</span>{" "}
          {cliente.localidad ? <span className="font-semibold">{cliente.localidad}</span> : <span className="bg-red-600 text-white px-2 py-1 rounded">Falta Localidad</span>}
        </li>
        <li><span className="text-cyan-300">🎂 Fecha nacimiento:</span> <span className="font-semibold">{fmt(cliente.fecha_nacimiento)}</span></li>
        <li>
          <span className="text-purple-300">📌 Estado:</span>{" "}
          {cliente.estado ? <span className="text-green-400 font-bold">Activo</span> : <span className="text-red-400 font-bold">Inactivo</span>}
        </li>

        {/* Documento */}
        <li className="pt-2">
          <span className="text-primary-400">🖼️ Documento:</span>
          <div className="mt-2 flex items-center gap-4">
            <div>
              <div className="text-xs text-neutral-300 mb-1">Frente</div>
              {frente ? (
                <button onClick={() => open(frente)} className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-400" title="Ver frente">
                  <img src={frente} alt="Frente" className="object-cover w-full h-full" onError={(e)=>{e.currentTarget.style.display="none";}} />
                </button>
              ) : <div className="text-xs text-neutral-400">No cargado</div>}
            </div>
            <div>
              <div className="text-xs text-neutral-300 mb-1">Dorso</div>
              {dorso ? (
                <button onClick={() => open(dorso)} className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-400" title="Ver dorso">
                  <img src={dorso} alt="Dorso" className="object-cover w-full h-full" onError={(e)=>{e.currentTarget.style.display="none";}} />
                </button>
              ) : <div className="text-xs text-neutral-400">No cargado</div>}
            </div>
          </div>
        </li>
      </ul>

      {/* Lightbox */}
      <AnimatePresence>
        {show && url && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow(false)}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full"
            >
              <button
                type="button"
                onClick={() => setShow(false)}
                className="absolute -top-2 -right-2 z-10 px-3 py-1.5 rounded-md bg-neutral-800 text-neutral-100 border border-neutral-700 hover:bg-neutral-700"
              >
                Cerrar
              </button>
              <div className="rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700">
                <img src={url} alt="Documento" className="w-full h-[70vh] object-contain select-none" draggable={false} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
