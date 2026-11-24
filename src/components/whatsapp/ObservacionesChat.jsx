// src/components/whatsapp/ObservacionesChat.jsx
//
// 📝 OBSERVACIONES DE UN CHAT (solo admin) — para el estudio de atención.
// Franco marca cómo se atendió: Bien / Mejorable / Mal + una nota. Quedan guardadas
// y salen en «Estadísticas» y en el informe de los lunes.
//
//   <BotonObservacion linea={3} tel="5491122334455" />
//   Ej: Mal · «tardó 3 h y no le pasó el precio»
import { useCallback, useEffect, useState } from "react";
import { HiPencilAlt, HiX } from "react-icons/hi";

import { borrarObservacion, crearObservacion, pedirObservaciones } from "../../services/whatsapp";

const OPCIONES = [
  { id: "BIEN", label: "Bien", on: "bg-duo-verde text-white", off: "text-duo-verde border-duo-verde/40" },
  { id: "MEJORABLE", label: "Mejorable", on: "bg-duo-amarillo text-white", off: "text-[var(--color-duo-amarillo-sombra)] dark:text-duo-amarillo border-duo-amarillo/50" },
  { id: "MAL", label: "Mal", on: "bg-duo-rojo text-white", off: "text-duo-rojo border-duo-rojo/40" },
];
const ETIQUETA = { BIEN: "Bien", MEJORABLE: "Mejorable", MAL: "Mal" };
const COLOR = {
  BIEN: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde",
  MEJORABLE: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-[var(--color-duo-amarillo-sombra)] dark:text-duo-amarillo",
  MAL: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
};

export default function BotonObservacion({ linea, tel }) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState([]);
  const [calificacion, setCalificacion] = useState("");
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setLista((await pedirObservaciones(linea, tel)).observaciones || []);
    } catch {
      /* no es grave: se ve vacío */
    }
  }, [linea, tel]);

  useEffect(() => {
    setAbierto(false);
    setCalificacion("");
    setTexto("");
    setError("");
    cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!calificacion && !texto.trim()) return setError("Elegí Bien / Mejorable / Mal o escribí algo.");
    setGuardando(true);
    setError("");
    try {
      const o = await crearObservacion(linea, tel, calificacion, texto.trim());
      setLista((l) => [o, ...l]);
      setCalificacion("");
      setTexto("");
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (id) => {
    try {
      await borrarObservacion(id);
      setLista((l) => l.filter((x) => x.id !== id));
    } catch {
      setError("No se pudo borrar.");
    }
  };

  const ultima = lista[0];
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        title="Anotar cómo se atendió este chat"
        className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[12px] font-medium ${
          abierto ? "border-duo-azul text-duo-azul" : "border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark"}`}
      >
        <HiPencilAlt className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Observación</span>
        {ultima?.calificacion && <span className={`rounded-full px-1.5 text-[10px] font-bold ${COLOR[ultima.calificacion]}`}>{ETIQUETA[ultima.calificacion]}</span>}
        {lista.length > 0 && !ultima?.calificacion && <span className="rounded-full bg-surface dark:bg-surface-dark px-1.5 text-[10px] font-bold">{lista.length}</span>}
      </button>

      {abierto && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 shadow-lg">
          <p className="mb-2 text-[12px] font-semibold text-titulo dark:text-titulo-dark">¿Cómo se atendió este chat?</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {OPCIONES.map((o) => (
              <button key={o.id} type="button" aria-pressed={calificacion === o.id}
                onClick={() => setCalificacion(calificacion === o.id ? "" : o.id)}
                className={`h-8 rounded-lg border px-3 text-[13px] font-semibold ${calificacion === o.id ? `${o.on} border-transparent` : `bg-card dark:bg-card-dark ${o.off}`}`}>
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Ej: tardó mucho y no le pasó el precio · hay que llamarlo"
            className="w-full resize-none rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2 text-[13px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul"
          />
          {error && <p className="mt-1 text-[12px] font-medium text-duo-rojo">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setAbierto(false)} className="h-8 rounded-lg border border-linea dark:border-linea-dark px-3 text-[13px] text-titulo dark:text-titulo-dark">Cerrar</button>
            <button type="button" onClick={guardar} disabled={guardando} className="h-8 rounded-lg bg-duo-azul px-4 text-[13px] font-semibold text-white disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {lista.length > 0 && (
            <ul className="mt-3 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {lista.map((o) => (
                <li key={o.id} className="flex items-start gap-2 rounded-lg bg-surface dark:bg-surface-dark p-2 text-[12px]">
                  {o.calificacion && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${COLOR[o.calificacion]}`}>{ETIQUETA[o.calificacion]}</span>}
                  <span className="min-w-0 flex-1 text-titulo dark:text-titulo-dark">
                    {o.texto || "—"}
                    <span className="block text-[11px] text-suave dark:text-suave-dark">{new Date(o.en).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}{o.autor ? ` · ${o.autor}` : ""}</span>
                  </span>
                  <button type="button" onClick={() => borrar(o.id)} aria-label="Borrar observación" className="text-suave hover:text-duo-rojo">
                    <HiX className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
