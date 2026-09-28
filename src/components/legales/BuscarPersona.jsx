// src/components/legales/BuscarPersona.jsx
//
// 🔎 "¿Quién es el cliente?": se busca por DNI (o nombre). Si es cliente de
// THAMES, los datos salen solos (y se ven sus autos asegurados). Si no, se
// cargan nombre, apellido y WhatsApp. Si ya tiene un caso abierto, avisa (así
// no se carga dos veces lo mismo).
//
// `valor` (lo guarda la pantalla que lo usa):
//   { q, buscado, cliente: {cliente, nombre, apellido, dni, telefono, polizas, casos} | null,
//     nombre, apellido, telefono, telOk: true | false | null, casosSinCliente: [] }
import { useState } from "react";
import { HiCheck, HiInformationCircle, HiSearch } from "react-icons/hi";

import { buscarClientes, mensajeError } from "../../services/legales";
import { Chip } from "./PiezasLegales";
import { PERSONA_VACIA } from "./persona";

const inputCls =
  "w-full min-w-0 h-12 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600 [color-scheme:light] dark:[color-scheme:dark]";

export default function BuscarPersona({ valor, onChange, onVerCaso, mostrarCasos = true }) {
  const [resultados, setResultados] = useState(null); // clientes encontrados (si hay más de uno, se elige)
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [porNombre, setPorNombre] = useState(false);
  const p = valor || PERSONA_VACIA;
  const set = (cambios) => onChange?.({ ...p, ...cambios });

  const buscar = async () => {
    const q = p.q.trim();
    if (q.replace(/\D/g, "").length < 5 && q.length < 3) {
      setError(porNombre ? "Escribí el nombre o el apellido." : "Escribí el DNI completo.");
      return;
    }
    setBuscando(true);
    setError("");
    try {
      const r = await buscarClientes(q);
      const clientes = r?.clientes || [];
      setResultados(clientes.length > 1 ? clientes : null);
      const digitos = q.replace(/\D/g, "");
      set({
        buscado: true,
        cliente: clientes.length === 1 ? clientes[0] : null,
        telOk: null,
        casosSinCliente: r?.casos || [],
        // Si no es cliente, el DNI que buscó queda cargado.
        dni: digitos.length >= 6 ? digitos : p.dni || "",
      });
    } catch (e) {
      setError(mensajeError(e, "No se pudo buscar. Probá de nuevo."));
    } finally {
      setBuscando(false);
    }
  };

  const c = p.cliente;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="buscar-persona" className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">
          {porNombre ? "Nombre o apellido" : "DNI"}
        </label>
        <div className="flex gap-2">
          <input
            id="buscar-persona"
            type="text"
            inputMode={porNombre ? "text" : "numeric"}
            autoComplete="off"
            value={p.q}
            onChange={(e) => set({ q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscar();
              }
            }}
            placeholder={porNombre ? "Ej: Giménez" : "Ej: 33456789"}
            className={`${inputCls} text-[20px] font-bold tracking-wide`}
          />
          <button
            type="button"
            onClick={buscar}
            disabled={buscando}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 px-5 text-[16px] font-bold text-white dark:text-slate-900 disabled:opacity-60"
          >
            <HiSearch className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline">{buscando ? "Buscando…" : "Buscar"}</span>
            <span className="sm:hidden">{buscando ? "…" : "Buscar"}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setPorNombre((x) => !x)}
          className="self-start text-[13px] font-semibold text-sky-700 dark:text-sky-400 hover:underline"
        >
          {porNombre ? "Buscar por DNI" : "¿No sabe el DNI? Buscá por nombre"}
        </button>
        {error && <p className="text-[13px] font-semibold text-duo-rojo">{error}</p>}
      </div>

      {resultados && !c && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-titulo dark:text-titulo-dark">Encontramos varios. ¿Cuál es?</p>
          {resultados.map((r) => (
            <button
              key={r.cliente}
              type="button"
              onClick={() => set({ cliente: r, telOk: null })}
              className="flex flex-col items-start rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3 text-left hover:border-sky-600"
            >
              <strong className="text-[15px] text-titulo dark:text-titulo-dark">{r.nombre_completo}</strong>
              <span className="text-[12px] text-suave dark:text-suave-dark">
                DNI {r.dni || "—"} · {r.oficina_nombre || "sin oficina"}
                {r.polizas?.length ? ` · ${r.polizas[0]}` : ""}
              </span>
            </button>
          ))}
          {/* Si no es ninguno: se cierra la lista y aparecen los datos para cargar. */}
          <button type="button" onClick={() => setResultados(null)} className="self-start text-[13px] font-semibold text-suave dark:text-suave-dark underline">
            No es ninguno de estos
          </button>
        </div>
      )}

      {c && (
        <div className="flex flex-col gap-2.5 rounded-xl border-2 border-green-600/70 bg-card dark:bg-card-dark p-4">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-green-700 dark:text-green-400">
            <HiCheck className="w-4 h-4" /> LO ENCONTRAMOS
          </span>
          <strong className="text-[19px] leading-tight text-titulo dark:text-titulo-dark">{c.nombre_completo}</strong>
          <span className="text-[14px] text-titulo dark:text-titulo-dark">
            DNI {c.dni || "—"} · WhatsApp {c.telefono || "—"}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {(c.polizas || []).length ? (
              c.polizas.map((x, i) => (
                <Chip key={`${i}-${x}`} tono="azul">
                  Cliente de THAMES · {x}
                </Chip>
              ))
            ) : (
              <Chip tono="azul">Cliente de THAMES</Chip>
            )}
          </span>
          {mostrarCasos &&
            (c.casos?.length ? (
              <CasosAbiertos casos={c.casos} onVerCaso={onVerCaso} />
            ) : (
              <span className="text-[13px] text-green-700 dark:text-green-400">No tiene otros casos en Legales.</span>
            ))}
          <div className="flex flex-wrap items-center gap-2 border-t border-linea dark:border-linea-dark pt-3">
            <span className="flex-1 min-w-[140px] text-[14px] text-titulo dark:text-titulo-dark">¿El WhatsApp está bien?</span>
            <button
              type="button"
              aria-pressed={p.telOk === true}
              onClick={() => set({ telOk: true })}
              className={`min-h-[44px] rounded-xl px-5 text-[15px] font-bold border ${
                p.telOk === true ? "bg-sky-700 border-sky-700 text-white" : "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark"
              }`}
            >
              Sí
            </button>
            <button
              type="button"
              aria-pressed={p.telOk === false}
              onClick={() => set({ telOk: false, telefono: p.telefono || c.telefono || "" })}
              className={`min-h-[44px] rounded-xl px-4 text-[15px] font-bold border ${
                p.telOk === false ? "bg-sky-700 border-sky-700 text-white" : "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark"
              }`}
            >
              Cambiarlo
            </button>
          </div>
          {p.telOk === false && (
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
              WhatsApp nuevo
              <input
                type="tel"
                inputMode="tel"
                value={p.telefono}
                onChange={(e) => set({ telefono: e.target.value })}
                placeholder="Ej: 11 5678-1234"
                className={inputCls}
              />
            </label>
          )}
          <button type="button" onClick={() => set({ cliente: null, telOk: null })} className="self-start text-[13px] font-semibold text-suave dark:text-suave-dark underline">
            No es esta persona
          </button>
        </div>
      )}

      {p.buscado && !c && !resultados && (
        <div className="flex flex-col gap-3 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
          <p className="text-[14px] text-titulo dark:text-titulo-dark">
            <b>No es cliente de THAMES</b> (o no lo encontramos). Cargá sus datos y seguí:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark min-w-0">
              Nombre
              <input value={p.nombre} onChange={(e) => set({ nombre: e.target.value })} className={inputCls} autoComplete="off" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark min-w-0">
              Apellido
              <input value={p.apellido} onChange={(e) => set({ apellido: e.target.value })} className={inputCls} autoComplete="off" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
            WhatsApp
            <input
              type="tel"
              inputMode="tel"
              value={p.telefono}
              onChange={(e) => set({ telefono: e.target.value })}
              placeholder="Ej: 11 5678-1234"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
            DNI
            <input inputMode="numeric" value={p.dni || ""} onChange={(e) => set({ dni: e.target.value })} className={inputCls} autoComplete="off" />
          </label>
          {!p.telefono.trim() && (
            <p className="text-[12px] text-suave dark:text-suave-dark">Sin WhatsApp no le vas a poder mandar el link de su caso ni el turno.</p>
          )}
        </div>
      )}

      {mostrarCasos && p.buscado && !c && (p.casosSinCliente || []).length > 0 && (
        <CasosAbiertos casos={p.casosSinCliente} onVerCaso={onVerCaso} titulo="Ojo: ya hay un caso abierto con esos datos" />
      )}

      {!p.buscado && (
        <p className="flex items-start gap-2 text-[13px] text-suave dark:text-suave-dark">
          <HiInformationCircle className="w-5 h-5 shrink-0" />
          ¿No aparece? No pasa nada: cargás nombre, apellido y WhatsApp, y seguís.
        </p>
      )}
    </div>
  );
}

function CasosAbiertos({ casos, onVerCaso, titulo = "" }) {
  const n = casos.length;
  return (
    <div className="rounded-lg border border-duo-amarillo/50 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-2.5 text-[13px] text-amber-900 dark:text-amber-200">
      <b>{titulo || `Ya tiene ${n} caso${n > 1 ? "s" : ""} abierto${n > 1 ? "s" : ""}`}:</b>
      <ul className="mt-1 flex flex-col gap-1">
        {casos.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-x-2">
            <span>
              {k.numero} · {k.titulo} ({k.estado_nombre}){k.persona_nombre && titulo ? ` · ${k.persona_nombre}` : ""}
            </span>
            {onVerCaso && (
              <button type="button" onClick={() => onVerCaso(k.id)} className="font-bold underline">
                Ver
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1">Si es por lo mismo, anotalo en ese caso. Si es otra cosa, seguí.</p>
    </div>
  );
}
