// src/components/whatsapp/InternoChat.jsx
//
// 👥 ¿ESTE CHAT ES CON UN CLIENTE O ES INTERNO? (solo admin)
//   · Las líneas propias, el WhatsApp de cada oficina y los gestores ya son internos solos.
//   · Una compañera, el abogado o una compañía se marcan acá: «Marcar interno».
//   Los internos van a la pestaña «Internos» y NO cuentan en las métricas de atención al cliente.
//
//   <BotonInterno tel="5491167689642" interno={hilo.interno} onCambio={recargar} />
import { useEffect, useState } from "react";
import { HiUserGroup, HiX } from "react-icons/hi";

import { desmarcarInterno, marcarInterno } from "../../services/whatsapp";

const TIPOS = [
  ["COMPANERO", "Compañero/a"], ["ABOGADO", "Abogado"], ["OFICINA", "Oficina"],
  ["GESTOR", "Gestor"], ["COMPANIA", "Compañía de seguros"], ["OTRO", "Otro"],
];
const NOMBRE_TIPO = Object.fromEntries(TIPOS);

export default function BotonInterno({ tel, interno, onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("COMPANERO");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setAbierto(false); setError(""); setNombre(""); }, [tel]);

  const guardar = async () => {
    if (!nombre.trim()) return setError("Poné un nombre (ej: Nico, abogado).");
    setGuardando(true);
    setError("");
    try {
      await marcarInterno(tel, nombre.trim(), tipo);
      setAbierto(false);
      onCambio?.();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    try {
      await desmarcarInterno(tel);
      onCambio?.();
    } catch {
      setError("No se pudo quitar.");
    }
  };

  if (interno) {
    return (
      <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-surface dark:bg-surface-dark px-2.5 text-[12px] font-medium text-titulo dark:text-titulo-dark"
        title={interno.manual ? "Marcado a mano como interno" : "Interno automático (línea, oficina o gestor)"}>
        <HiUserGroup className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Interno · {NOMBRE_TIPO[interno.tipo] || interno.tipo}</span>
        {interno.manual && (
          <button type="button" onClick={quitar} aria-label="Ya no es interno" title="Ya no es interno (vuelve a contar como cliente)"
            className="ml-0.5 text-suave hover:text-duo-rojo">
            <HiX className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
        title="No es un cliente: compañera, abogado, otra oficina…"
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-linea dark:border-linea-dark px-2.5 text-[12px] font-medium text-titulo dark:text-titulo-dark">
        <HiUserGroup className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Es interno</span>
      </button>
      {abierto && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 shadow-lg">
          <p className="mb-2 text-[12px] font-semibold text-titulo dark:text-titulo-dark">
            Este número no es un cliente: va a «Internos» y no cuenta en las métricas.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} placeholder="Nombre (ej: Nico, abogado)"
              className="h-9 flex-1 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul" />
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}
              className="h-9 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2 text-[13px] text-titulo dark:text-titulo-dark">
              {TIPOS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <button type="button" onClick={guardar} disabled={guardando}
              className="h-9 rounded-lg bg-duo-azul px-4 text-[13px] font-semibold text-white disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {error && <p className="mt-1 text-[12px] font-medium text-duo-rojo">{error}</p>}
        </div>
      )}
    </>
  );
}
