// src/components/solicitudes/modalcreate/VerificadorDNIModal.jsx
// Paso 0 del flujo de solicitudes — verifica DNI antes de abrir CreateSolicitudModal
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiSearch, HiX, HiCheckCircle, HiShieldExclamation,
  HiExclamationCircle, HiArrowRight, HiUser,
} from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";

/* ── helpers ── */
function estadoColor(estado) {
  const e = (estado || "").toLowerCase();
  if (e === "activa")    return "bg-emerald-900/40 text-emerald-300 border-emerald-700/50";
  if (e === "vencida")   return "bg-amber-900/40 text-amber-300 border-amber-700/50";
  if (e === "cancelada") return "bg-rose-900/40 text-rose-300 border-rose-700/50";
  return "bg-slate-800 text-slate-400 border-slate-700";
}

/* ── Tarjeta de póliza encontrada ── */
function PolizaCard({ poliza, esPropia }) {
  return (
    <div className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
      esPropia
        ? "bg-indigo-950/30 border-indigo-700/50"
        : "bg-slate-900/60 border-slate-700/50"
    }`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-100">
          {[poliza.marca, poliza.modelo].filter(Boolean).join(" ")}
          {poliza.patente && (
            <span className="ml-2 font-mono text-xs bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
              {poliza.patente}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {poliza.compania_nombre || poliza.compania || ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${estadoColor(poliza.estado)}`}>
          {poliza.estado}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          esPropia
            ? "bg-indigo-900/50 text-indigo-300"
            : "bg-rose-900/50 text-rose-300"
        }`}>
          {esPropia ? "Tu oficina" : poliza.oficina_nombre || "Otra oficina"}
        </span>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export default function VerificadorDNIModal({ open, onCancel, onContinuar }) {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const inputRef    = useRef(null);
  const timer       = useRef(null);

  const miOficinaId = user?.perfil?.oficina?.id ?? user?.perfil?.oficina ?? null;

  const [dni,       setDni]       = useState("");
  const [loading,   setLoading]   = useState(false);
  const [resultado, setResultado] = useState(null); // { cliente, polizasPropias, polizasOtras }
  const [error,     setError]     = useState("");

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setDni("");
      setResultado(null);
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const buscar = useCallback(async (q) => {
    if (!q.trim() || q.length < 6) { setResultado(null); setError(""); return; }
    setLoading(true);
    setError("");
    setResultado(null);
    try {
      // Buscar en TODA la base (allow_all=1 ignora el filtro de oficina)
      const { data } = await api.get(
        `polizas/?search=${encodeURIComponent(q)}&allow_all=1&page_size=15&solo_activas=0`
      );
      const items = data.results || data || [];

      if (!items.length) {
        setResultado({ cliente: null, polizasPropias: [], polizasOtras: [] });
        return;
      }

      // Extraer datos del cliente del primer resultado
      const first = items[0];
      const cli   = first.cliente && typeof first.cliente === "object" ? first.cliente : null;
      const clienteId = cli?.id ?? null;
      const nombreCliente = cli
        ? [cli.apellido, cli.nombre].filter(Boolean).join(", ")
        : "";

      // Separar pólizas propias vs de otra oficina
      const polizasPropias = [];
      const polizasOtras   = [];

      items.forEach(p => {
        const ofiId = p.oficina ?? p.oficina_id ?? null;
        const esProp = String(ofiId) === String(miOficinaId);
        const item = {
          id:           p.id,
          estado:       p.estado || "",
          marca:        p.marca  || "",
          modelo:       p.modelo || "",
          patente:      p.patente || "",
          compania:     p.compania || "",
          compania_nombre: p.compania_nombre || p.compania || "",
          oficina_id:   ofiId,
          oficina_nombre: p.oficina_nombre || "",
        };
        if (esProp) polizasPropias.push(item);
        else        polizasOtras.push(item);
      });

      setResultado({
        cliente: { id: clienteId, nombre: nombreCliente, dni: cli?.dni_cuit_cuil || q },
        polizasPropias,
        polizasOtras,
      });
    } catch {
      setError("No se pudo verificar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [miOficinaId]);

  const onChange = (e) => {
    const v = e.target.value;
    setDni(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => buscar(v), 500);
  };

  // Ir al perfil del cliente
  const irAlPerfil = () => {
    onCancel?.();
    navigate(`/clientes/${resultado.cliente.id}`);
  };

  // Determinar escenario
  const escenario = !resultado ? "buscando"
    : (!resultado.polizasPropias.length && !resultado.polizasOtras.length) ? "libre"
    : (resultado.polizasPropias.length > 0 && resultado.polizasOtras.length === 0) ? "propia"
    : (resultado.polizasOtras.length > 0 && resultado.polizasPropias.length === 0) ? "otra"
    : "mixto"; // tiene en ambas

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-900/50 flex items-center justify-center">
              <HiUser className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-100">Verificar cliente</h2>
              <p className="text-xs text-slate-500">Paso previo a la solicitud</p>
            </div>
          </div>
          <button onClick={onCancel}
            className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
            <HiX className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Input DNI */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              DNI / CUIT del cliente
            </label>
            <div className="relative">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={dni}
                onChange={onChange}
                placeholder="Ej: 30456789"
                autoComplete="off"
                className="w-full h-12 pl-12 pr-12 rounded-2xl bg-slate-800 border border-slate-600 text-slate-100 text-base placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1.5">Escribí al menos 6 dígitos para verificar</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm">
              <HiExclamationCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── ESCENARIO: LIBRE ── */}
          <AnimatePresence mode="wait">
            {resultado && escenario === "libre" && (
              <motion.div key="libre" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-2xl p-4 flex items-start gap-3 mb-4">
                  <HiCheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-300">Sin registros en el sistema</p>
                    <p className="text-xs text-emerald-500/80 mt-0.5">
                      Este DNI no tiene ninguna póliza. Podés continuar con la solicitud normalmente.
                    </p>
                  </div>
                </div>
                <button onClick={() => onContinuar({ dni, clienteId: null })}
                  className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                  Continuar con la solicitud <HiArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── ESCENARIO: PÓLIZA EN ESTA OFICINA ── */}
            {resultado && escenario === "propia" && (
              <motion.div key="propia" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-2xl p-4 flex items-start gap-3">
                  <HiShieldExclamation className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-indigo-300">
                      {resultado.cliente?.nombre || "Este cliente"} ya está en tu oficina
                    </p>
                    <p className="text-xs text-indigo-400/80 mt-0.5">
                      Tiene {resultado.polizasPropias.length} póliza{resultado.polizasPropias.length !== 1 ? "s" : ""} registrada{resultado.polizasPropias.length !== 1 ? "s" : ""} con ustedes.
                      Para asociarle un nuevo seguro, andá a su perfil.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {resultado.polizasPropias.slice(0, 3).map((p, i) => (
                    <PolizaCard key={i} poliza={p} esPropia={true} />
                  ))}
                </div>
                {resultado.cliente?.id && (
                  <button onClick={irAlPerfil}
                    className="w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <HiUser className="w-4 h-4" /> Ir al perfil del cliente
                  </button>
                )}
              </motion.div>
            )}

            {/* ── ESCENARIO: PÓLIZA EN OTRA OFICINA ── */}
            {resultado && escenario === "otra" && (
              <motion.div key="otra" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="bg-rose-950/40 border border-rose-700/50 rounded-2xl p-4 flex items-start gap-3">
                  <HiShieldExclamation className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-rose-300">
                      {resultado.cliente?.nombre || "Este cliente"} está registrado en otra oficina
                    </p>
                    <p className="text-xs text-rose-400/80 mt-0.5">
                      Si viene a pagar o renovar, debe ir a <strong>{resultado.polizasOtras[0]?.oficina_nombre || "la oficina donde fue asegurado"}</strong>.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {resultado.polizasOtras.slice(0, 3).map((p, i) => (
                    <PolizaCard key={i} poliza={p} esPropia={false} />
                  ))}
                </div>
                <button onClick={() => onContinuar({ dni, clienteId: null, esAutoNuevo: true })}
                  className="w-full h-11 rounded-2xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                  Va a asegurar un auto nuevo <HiArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ── ESCENARIO: MIXTO (ambas oficinas) ── */}
            {resultado && escenario === "mixto" && (
              <motion.div key="mixto" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="bg-amber-950/40 border border-amber-700/50 rounded-2xl p-4 flex items-start gap-3">
                  <HiShieldExclamation className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-300">
                      {resultado.cliente?.nombre || "Este cliente"} tiene pólizas en varias oficinas
                    </p>
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      Tiene {resultado.polizasPropias.length} en tu oficina y {resultado.polizasOtras.length} en otra{resultado.polizasOtras.length !== 1 ? "s" : ""}.
                    </p>
                  </div>
                </div>
                {resultado.polizasPropias.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tu oficina</p>
                    {resultado.polizasPropias.slice(0, 2).map((p, i) => (
                      <PolizaCard key={i} poliza={p} esPropia={true} />
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  {resultado.cliente?.id && (
                    <button onClick={irAlPerfil}
                      className="flex-1 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors">
                      Ver perfil
                    </button>
                  )}
                  <button onClick={() => onContinuar({ dni, clienteId: null, esAutoNuevo: true })}
                    className="flex-1 h-11 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition-colors">
                    Auto nuevo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Estado inicial */}
          {!resultado && !loading && !error && (
            <p className="text-center text-sm text-slate-600 py-2">
              Ingresá el DNI para verificar si el cliente ya existe
            </p>
          )}

        </div>
      </motion.div>
    </div>
  );
}