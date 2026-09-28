// src/components/legales/ElegirHorario.jsx
//
// 🗓️ Elegir un turno con el abogado: "En la oficina" o "Que lo llame", y los
// horarios LIBRES de su agenda (el servidor ya saca los tomados, los días que
// no atiende y los que ya pasaron). Se usa en "Cargar una denuncia" (paso 6),
// en "Pedir turno" y en la ficha ("Darle turno").
//
// Ejemplo: el Dr. Sosa atiende lun y mié de 10 a 13 en 5 Esquinas → se ven
// "Mié 30/09 · acá en 5 Esquinas: 10:00 · 10:30 · 12:00 …". Tocás uno y abajo
// queda escrito: "Miércoles 30/09 a las 10:30, acá en 5 Esquinas, con el Dr. Sosa."
import { useEffect, useState } from "react";
import { HiCheckCircle, HiOfficeBuilding, HiPhone } from "react-icons/hi";

import { horariosLibres, mensajeError } from "../../services/legales";
import { diaCorto, hoyYmd, textoTurnoElegido } from "./legalesUtils";

const PASOS_DIAS = [14, 28, 60];

export default function ElegirHorario({ abogado, value, onChange, miOficina = null }) {
  const [modalidad, setModalidad] = useState(value?.modalidad || "OFICINA");
  const [dias, setDias] = useState(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [rango, setRango] = useState(0); // índice en PASOS_DIAS
  const [verTodos, setVerTodos] = useState(false);
  const abogadoId = abogado?.id;

  useEffect(() => {
    if (!abogadoId) return undefined;
    let vivo = true;
    setDias(null);
    setError("");
    horariosLibres(abogadoId, { modalidad, dias: PASOS_DIAS[rango] })
      .then((r) => {
        if (!vivo) return;
        setInfo(r);
        setDias(r.dias || []);
      })
      .catch((e) => vivo && setError(mensajeError(e, "No se pudieron traer los horarios.")));
    return () => {
      vivo = false;
    };
  }, [abogadoId, modalidad, rango]);

  const cambiarModalidad = (m) => {
    if (m === modalidad) return;
    setModalidad(m);
    setVerTodos(false);
    onChange?.(null);
  };

  const visibles = dias ? (verTodos ? dias : dias.slice(0, 3)) : [];
  const hayMas = dias && (dias.length > visibles.length || rango < PASOS_DIAS.length - 1);

  const verMas = () => {
    if (dias && dias.length > visibles.length) setVerTodos(true);
    else if (rango < PASOS_DIAS.length - 1) {
      setRango((x) => x + 1);
      setVerTodos(true);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark p-1" role="group" aria-label="¿Cómo quiere hablar?">
        {[
          { m: "OFICINA", txt: "En la oficina", icono: HiOfficeBuilding },
          { m: "TELEFONO", txt: "Que lo llame", icono: HiPhone },
        ].map((op) => {
          const { m, txt } = op;
          const Icono = op.icono;
          const on = modalidad === m;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => cambiarModalidad(m)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg min-h-[44px] text-[14px] font-semibold transition-colors ${
                on ? "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark shadow-sm" : "text-suave dark:text-suave-dark"
              }`}
            >
              <Icono className="w-4 h-4" /> {txt}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 flex flex-col gap-3">
        <strong className="text-[14px] text-titulo dark:text-titulo-dark">Elegí un horario libre</strong>
        {error && <p className="text-[13px] font-semibold text-duo-rojo">{error}</p>}
        {!error && dias === null && <p className="text-[13px] text-suave dark:text-suave-dark">Buscando horarios…</p>}
        {!error && dias !== null && info?.sin_agenda && (
          <p className="text-[13px] text-suave dark:text-suave-dark">
            {abogado?.nombre || "Este abogado"} todavía no tiene días de turnos cargados. Pedile al admin que los cargue en
            «Abogados» (o anotá el caso sin turno y se lo das después).
          </p>
        )}
        {!error && dias !== null && !info?.sin_agenda && !dias.length && (
          <p className="text-[13px] text-suave dark:text-suave-dark">
            No tiene horarios libres {modalidad === "TELEFONO" ? "para llamar" : "en la oficina"} en los próximos {PASOS_DIAS[rango]} días.
            {modalidad === "OFICINA" ? " Probá con «Que lo llame»." : ""}
          </p>
        )}
        {visibles.map((d, i) => (
          <DiaSlots key={d.fecha} d={d} primero={i === 0} value={value} onChange={onChange} modalidad={modalidad} miOficina={miOficina} />
        ))}
        {hayMas && dias && !info?.sin_agenda && (
          <button type="button" onClick={verMas} className="self-start px-1 py-1 text-[14px] font-semibold text-sky-700 dark:text-sky-400 hover:underline">
            Ver más días
          </button>
        )}
      </div>

      {value && (
        <p className="flex items-start gap-2 rounded-xl border border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3.5 py-3 text-[14px] text-duo-verde-sombra dark:text-duo-verde">
          <HiCheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="font-semibold">{textoTurnoElegido(value, abogado?.nombre, miOficina)}</span>
        </p>
      )}
    </div>
  );
}

function DiaSlots({ d, primero, value, onChange, modalidad, miOficina }) {
  // Si ese día atiende en 2 oficinas, se agrupa por oficina.
  const grupos = [];
  d.slots.forEach((s) => {
    const clave = modalidad === "OFICINA" ? String(s.oficina || "") : "tel";
    let g = grupos.find((x) => x.clave === clave);
    if (!g) {
      g = { clave, oficina: s.oficina, nombre: s.oficina_nombre, slots: [] };
      grupos.push(g);
    }
    g.slots.push(s);
  });
  const esHoy = d.fecha === hoyYmd();
  const dia = diaCorto(d.fecha);
  const Dia = esHoy ? `Hoy, ${dia}` : `${dia.charAt(0).toUpperCase()}${dia.slice(1)}`;
  return (
    <div className={`flex flex-col gap-2 ${primero ? "" : "border-t border-linea dark:border-linea-dark pt-3"}`}>
      {grupos.map((g) => {
        const aca = g.oficina && miOficina && Number(g.oficina) === Number(miOficina);
        return (
          <div key={g.clave} className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              {Dia}
              <span className="font-medium text-suave dark:text-suave-dark">
                {modalidad === "TELEFONO" ? " · por teléfono" : g.nombre ? ` · ${aca ? "acá " : ""}en ${g.nombre}` : ""}
              </span>
            </span>
            <div className="grid grid-cols-4 gap-2">
              {g.slots.map((s) => {
                const on = value && value.inicio === s.inicio && value.modalidad === modalidad;
                return (
                  <button
                    key={s.inicio}
                    type="button"
                    aria-pressed={!!on}
                    onClick={() => onChange?.(on ? null : { ...s, fecha: d.fecha, modalidad })}
                    className={`min-h-[44px] rounded-lg border text-[14px] font-semibold transition-colors ${
                      on
                        ? "bg-sky-700 border-sky-700 text-white"
                        : "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-sky-600"
                    }`}
                  >
                    {s.hora}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
