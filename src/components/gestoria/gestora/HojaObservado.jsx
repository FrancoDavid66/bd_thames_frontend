// src/components/gestoria/gestora/HojaObservado.jsx
//
// ⚠️ "El registro lo observó" (app de la gestora, 30/09): la hoja que sube desde abajo.
// En vez de escribir todo, toca lo que pidió el registro (los papeles de ESE trámite
// y lo más común) y, si hace falta, agrega algo más. Se arma el texto solo:
//   [Firma del titular] [DNI del titular] + "el 08 tiene una tachadura"
//   → "Firma del titular, DNI del titular. El 08 tiene una tachadura"
// Lo ve la oficina en el tablero (y el cliente en su link, si queda tildado).
import { useEffect, useMemo, useState } from "react";
import { HiOutlineCheck, HiOutlineExclamationTriangle } from "react-icons/hi2";

import ModalDuo from "../../ui/ModalDuo";
import { mensajeError } from "../../../services/gestoria";
import { norm } from "../gestoriaUtils";
import { Boton } from "./piezas";
import { esDePersona, foco, suave } from "./gestoraUtils";

const MAX = 255; // lo que entra en "falta" en el servidor

// Lo que más se pide, además de los papeles del trámite.
const COMUNES_AUTO = ["Firma del titular", "Certificar una firma", "Pagar aranceles", "Corregir un formulario"];
const COMUNES_PERSONA = ["Otro turno", "Pagar aranceles", "Corregir un formulario"];

/** "Firma del titular, DNI del titular. El 08 tiene una tachadura" */
function armarTexto(elegidas, otra) {
  const extra = otra.trim().replace(/\s+/g, " ");
  const base = elegidas.join(", ");
  if (!extra) return base;
  const conMayus = extra.charAt(0).toUpperCase() + extra.slice(1);
  return base ? `${base}. ${conMayus}` : conMayus;
}

export default function HojaObservado({ t, abierto, onCerrar, onGuardar }) {
  const [elegidas, setElegidas] = useState([]);
  const [otra, setOtra] = useState("");
  const [vis, setVis] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Las opciones: los papeles de este trámite y lo más común (sin repetir).
  const opciones = useMemo(() => {
    const vistos = new Set();
    const out = [];
    const papeles = (Array.isArray(t?.papeles) ? t.papeles : []).map((p) => String(p?.nombre || "").trim());
    [...papeles, ...(esDePersona(t) ? COMUNES_PERSONA : COMUNES_AUTO)].forEach((x) => {
      const k = norm(x);
      if (x && k && !vistos.has(k)) {
        vistos.add(k);
        out.push(x);
      }
    });
    return out.slice(0, 12);
  }, [t]);

  useEffect(() => {
    if (abierto) {
      setElegidas([]);
      setOtra("");
      setVis(true);
      setError("");
    }
  }, [abierto]);

  const texto = armarTexto(elegidas, otra);
  const tocar = (x) => {
    setError("");
    setElegidas((l) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]));
  };

  const guardar = async () => {
    if (guardando) return;
    if (!texto) return setError("Tocá lo que pidió el registro (o escribilo abajo).");
    if (texto.length > MAX) return setError(`Es muy largo: resumilo un poco (hasta ${MAX} letras).`);
    setGuardando(true);
    setError("");
    try {
      await onGuardar({ estado: "OBSERVADO", falta: texto, visible_cliente: vis });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineExclamationTriangle />}
      iconTono="amarillo"
      title={esDePersona(t) ? "¿Qué te pidieron?" : "¿Qué pidió el registro?"}
      footer={
        <>
          <Boton tono="blanco" chico onClick={onCerrar} className="sm:w-auto">
            Volver
          </Boton>
          <Boton tono="ambar" chico onClick={guardar} disabled={guardando} className="sm:w-auto">
            {guardando ? "Guardando…" : "Marcar como observado"}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-rojo dark:text-red-300"
          >
            {error}
          </p>
        ) : null}
        <p className={`text-[15px] ${suave}`}>Tocá lo que falta. Se lo avisamos a la oficina.</p>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Lo que falta">
          {opciones.map((x) => {
            const on = elegidas.includes(x);
            return (
              <button
                key={x}
                type="button"
                aria-pressed={on}
                onClick={() => tocar(x)}
                className={`inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-full px-3.5 text-left text-[15px] leading-tight transition-colors ${
                  on
                    ? "border-[1.5px] border-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] font-extrabold text-[#78350f] dark:text-amber-200"
                    : "border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark font-semibold text-titulo dark:text-titulo-dark"
                } ${foco}`}
              >
                {on ? <HiOutlineCheck className="h-[17px] w-[17px] shrink-0" strokeWidth={3} aria-hidden="true" /> : null}
                <span className="break-words">{x}</span>
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-1.5 text-[14.5px] font-extrabold text-titulo dark:text-titulo-dark">
          <span>
            ¿Algo más? {opciones.length ? <span className={`font-semibold ${suave}`}>(opcional)</span> : null}
          </span>
          <textarea
            rows={2}
            value={otra}
            maxLength={MAX}
            onChange={(e) => {
              setError("");
              setOtra(e.target.value);
            }}
            placeholder="Ej: el 08 tiene una tachadura"
            className="w-full resize-none rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark px-3 py-2.5 text-[16px] font-normal text-titulo dark:text-titulo-dark outline-none placeholder:text-suave dark:placeholder:text-suave-dark focus:border-duo-violeta"
          />
        </label>

        {texto ? (
          <p className="rounded-xl bg-surface dark:bg-surface-dark px-3 py-2 text-[14px] text-titulo dark:text-titulo-dark">
            <span className={suave}>Va a decir: </span>
            {texto}
          </p>
        ) : null}

        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[15px] font-semibold text-titulo dark:text-titulo-dark">
          <input type="checkbox" checked={vis} onChange={(e) => setVis(e.target.checked)} className="h-[22px] w-[22px] shrink-0 accent-duo-violeta" />
          Que el cliente lo vea en su link
        </label>
      </div>
    </ModalDuo>
  );
}
