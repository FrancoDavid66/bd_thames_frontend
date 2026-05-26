// src/components/solicitudes/modalcreate/BuscadorClienteExistente.jsx
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiSearch, HiIdentification, HiTruck, HiCheckCircle, HiExclamation } from "react-icons/hi";
import api from "../../../services/api";

/* ===================== Helpers ===================== */
const onlyDigits = (v) => String(v || "").replace(/\D/g, "");
const normalizePatente = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();

/* ===================== Pequeño input local ===================== */
function Field({ label, icon: Icon, value, onChange, placeholder, onEnter, disabled }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="block text-white/80 font-bold uppercase text-[10px] tracking-widest ml-1 flex items-center gap-1.5">
        {Icon && <Icon className="text-amber-400" />}
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter?.();
          }
        }}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:ring-2 ring-amber-500/40 text-white placeholder:text-white/20 transition-all shadow-inner disabled:opacity-50"
      />
    </label>
  );
}

/* ===================== Componente principal ===================== */
/**
 * Buscador previo que detecta si el cliente o el vehículo ya existen
 * en la base de datos antes de permitir la creación de la solicitud.
 *
 * Props:
 *  - onMatchFound(matchData): se llama cuando encuentra una coincidencia.
 *      matchData = {
 *        tipo: "DNI" | "PATENTE",
 *        cliente: { id, nombre_apellido, dni, oficina },
 *        polizas: [{ poliza_id, compania, patente, modelo, oficina, estado, al_dia, fecha_baja }]
 *      }
 *  - onClear(): se llama si el usuario limpia el buscador (vuelve al modo normal).
 *  - locked: boolean → si está bloqueado por un match previo (solo lectura).
 */
export default function BuscadorClienteExistente({ onMatchFound, onClear, locked = false }) {
  const [dni, setDni] = useState("");
  const [patente, setPatente] = useState("");
  const [searching, setSearching] = useState(false);
  const [noMatchMsg, setNoMatchMsg] = useState("");

  /* ===== Lógica de búsqueda por DNI ===== */
  const buscarPorDni = useCallback(async () => {
    const d = onlyDigits(dni);
    if (!d) {
      toast.error("Escribí un DNI válido.");
      return;
    }
    setSearching(true);
    setNoMatchMsg("");
    try {
      // Intentamos primero el endpoint /clientes/buscar/?q=DNI
      let resp;
      try {
        resp = await api.get("clientes/buscar/", { params: { q: d } });
      } catch {
        // Fallback al endpoint /clientes/?search=DNI
        resp = await api.get("clientes/", { params: { search: d } });
      }
      const data = resp?.data;
      const rawList = Array.isArray(data) ? data : data?.results || data?.cliente ? [data] : [];

      // Si el backend devuelve directamente {cliente, polizas}
      if (data?.cliente && Array.isArray(data?.polizas)) {
        const polizasConEstado = data.polizas.map(estimarEstadoPoliza);
        onMatchFound?.({
          tipo: "DNI",
          cliente: {
            id: data.cliente.id ?? null,
            nombre_apellido: data.cliente.nombre_apellido || `${data.cliente.nombre || ""} ${data.cliente.apellido || ""}`.trim(),
            dni: data.cliente.dni || d,
            oficina: data.cliente.oficina || "",
          },
          polizas: polizasConEstado,
        });
        return;
      }

      // Si vino lista paginada
      const matches = Array.isArray(rawList) ? rawList : [];
      const first = matches.find((c) => onlyDigits(c?.dni_cuit_cuil || c?.dni) === d) || matches[0];

      if (!first) {
        setNoMatchMsg("✓ No encontramos clientes con ese DNI. Podés continuar como NUEVO.");
        return;
      }

      // Pedimos las pólizas del cliente
      let polizas = [];
      try {
        const r2 = await api.get("polizas/", { params: { cliente: first.id, page_size: 50 } });
        const arr = Array.isArray(r2.data) ? r2.data : r2.data?.results || [];
        polizas = arr.map(estimarEstadoPoliza);
      } catch {
        polizas = [];
      }

      onMatchFound?.({
        tipo: "DNI",
        cliente: {
          id: first.id,
          nombre_apellido: `${first.nombre || ""} ${first.apellido || ""}`.trim() || first.nombre_apellido || "Cliente existente",
          dni: first.dni_cuit_cuil || first.dni || d,
          oficina: first.oficina_nombre || first.oficina || "—",
        },
        polizas,
      });
    } catch (err) {
      console.error("[BuscadorCliente] DNI", err);
      const msg = err?.response?.data?.detail;
      if (err?.response?.status === 404 || /no se encontr/i.test(msg || "")) {
        setNoMatchMsg("✓ No encontramos clientes con ese DNI. Podés continuar como NUEVO.");
      } else {
        toast.error("Error al buscar. Probá de nuevo.");
      }
    } finally {
      setSearching(false);
    }
  }, [dni, onMatchFound]);

  /* ===== Lógica de búsqueda por Patente ===== */
  const buscarPorPatente = useCallback(async () => {
    const p = normalizePatente(patente);
    if (!p) {
      toast.error("Escribí una patente válida.");
      return;
    }
    setSearching(true);
    setNoMatchMsg("");
    try {
      const resp = await api.get("polizas/versiones-por-patente/", { params: { patente: p } });
      const data = resp?.data;
      const arr = Array.isArray(data) ? data : data?.results || data?.polizas || [];

      if (!arr.length) {
        setNoMatchMsg("✓ No encontramos vehículos con esa patente. Podés continuar como NUEVO.");
        return;
      }

      const first = arr[0];
      const cli = first?.cliente || {};
      const polizasConEstado = arr.map(estimarEstadoPoliza);

      onMatchFound?.({
        tipo: "PATENTE",
        cliente: {
          id: cli?.id ?? first?.cliente_id ?? null,
          nombre_apellido:
            cli?.nombre_apellido ||
            `${cli?.nombre || ""} ${cli?.apellido || ""}`.trim() ||
            "Cliente existente",
          dni: cli?.dni_cuit_cuil || cli?.dni || "",
          oficina: first?.oficina_nombre || first?.oficina || cli?.oficina || "—",
        },
        polizas: polizasConEstado,
      });
    } catch (err) {
      console.error("[BuscadorCliente] Patente", err);
      if (err?.response?.status === 404) {
        setNoMatchMsg("✓ No encontramos vehículos con esa patente. Podés continuar como NUEVO.");
      } else {
        toast.error("Error al buscar patente.");
      }
    } finally {
      setSearching(false);
    }
  }, [patente, onMatchFound]);

  const limpiar = () => {
    setDni("");
    setPatente("");
    setNoMatchMsg("");
    onClear?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5 p-4 sm:p-5 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
          <HiSearch className="text-xl" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-base leading-tight">Verificar antes de crear</h3>
          <p className="text-[11px] text-amber-200/70 mt-0.5 font-medium">
            Ingresá DNI o Patente para confirmar si el cliente o vehículo ya está en nuestra base de datos.
          </p>
        </div>
      </div>

      {/* Inputs + botones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="DNI / CUIT / CUIL"
              icon={HiIdentification}
              value={dni}
              onChange={setDni}
              placeholder="Ej: 30123456"
              onEnter={buscarPorDni}
              disabled={locked || searching}
            />
          </div>
          <button
            type="button"
            onClick={buscarPorDni}
            disabled={!dni || locked || searching}
            className="h-[42px] px-4 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-900/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <HiSearch /> Buscar
          </button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="Patente del vehículo"
              icon={HiTruck}
              value={patente}
              onChange={(v) => setPatente(v.toUpperCase())}
              placeholder="Ej: AB123CD"
              onEnter={buscarPorPatente}
              disabled={locked || searching}
            />
          </div>
          <button
            type="button"
            onClick={buscarPorPatente}
            disabled={!patente || locked || searching}
            className="h-[42px] px-4 rounded-xl bg-sky-500/90 hover:bg-sky-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-sky-900/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <HiSearch /> Buscar
          </button>
        </div>
      </div>

      {/* Estado */}
      {searching && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-300 animate-pulse">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
          Consultando base de datos...
        </div>
      )}

      {noMatchMsg && !searching && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2"
        >
          <HiCheckCircle className="text-emerald-400 text-lg shrink-0" />
          <span className="text-xs font-bold text-emerald-200">{noMatchMsg}</span>
        </motion.div>
      )}

      {locked && (
        <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HiExclamation className="text-rose-400 text-lg shrink-0" />
            <span className="text-xs font-bold text-rose-200">Coincidencia detectada — el flujo está bloqueado.</span>
          </div>
          <button
            onClick={limpiar}
            className="text-[10px] uppercase tracking-widest font-black text-rose-200 hover:text-white underline-offset-4 hover:underline"
          >
            Reiniciar búsqueda
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ===================== Estimador de "al día" ===================== */
/**
 * Estima si una póliza está al día basándose en su estado/fecha_baja.
 * Si tu backend ya devuelve un campo explícito (ej: 'al_dia' o 'tiene_deuda'),
 * lo respetamos.
 */
function estimarEstadoPoliza(p) {
  const estado = String(p?.estado || "").toUpperCase();
  const fechaBaja = p?.fecha_baja || null;

  let alDia = null; // null = desconocido
  if (typeof p?.al_dia === "boolean") alDia = p.al_dia;
  else if (typeof p?.tiene_deuda === "boolean") alDia = !p.tiene_deuda;
  else if (estado === "FINALIZADA" || estado === "DADA_DE_BAJA" || fechaBaja) alDia = null;
  else if (estado === "MOROSO" || estado === "VENCIDO" || estado === "DEUDOR") alDia = false;
  else if (estado === "VIGENTE" || estado === "ACTIVA" || estado === "AL_DIA") alDia = true;

  return {
    ...p,
    al_dia: alDia,
  };
}