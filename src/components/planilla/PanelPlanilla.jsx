// src/components/planilla/PanelPlanilla.jsx
//
// 🗂️ El PANEL DEL COSTADO de la planilla (se abre al tocar el nombre de una fila).
//   Arriba:  el nombre, el COLOR del estado (se toca y se cambia) y «👉 lo que sigue».
//   Pestañas:
//     💬 Novedades → lo que pasó, del más nuevo al más viejo, y un cuadro para anotar
//                    (como el muro de Monday: escribís y apretás Enter).
//     📋 Datos     → los datos importantes, uno abajo del otro.
//     📎 Papeles   → los archivos y fotos (y subir uno nuevo).
//   Abajo:  «Ficha completa» (la pantalla de siempre, con todo).
// En la compu sale al costado; en el celu ocupa toda la pantalla.
import { useEffect, useRef, useState } from "react";
import { HiArrowRight, HiChevronLeft, HiXMark } from "react-icons/hi2";

import { Avatar } from "../gestoria/Piezas";
import { BotonEstado } from "./PiezasPlanilla";
import { TONOS, ddmmhhmm, mensajeDe, nombreAvatar } from "./planillaUtils";

const PALETA = ["#0f766e", "#7c3aed", "#b45309", "#be185d", "#1d4ed8", "#047857", "#9333ea", "#0e7490", "#a16207"];
function colorDeNombre(n = "") {
  let h = 0;
  for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-3" aria-label="Cargando">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-linea/60 dark:bg-linea-dark/60" />
      ))}
    </div>
  );
}

function Novedades({ a, det, onRecargar }) {
  const [texto, setTexto] = useState("");
  const [cliente, setCliente] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const puede = det && a.panel?.puedeAnotar ? a.panel.puedeAnotar(det) : false;
  const lista = det && a.panel?.novedades ? a.panel.novedades(det) || [] : [];

  const anotar = async () => {
    const t = texto.trim();
    if (!t || guardando) return;
    setGuardando(true);
    setError("");
    try {
      await a.panel.anotar(det, t, { cliente });
      setTexto("");
      setCliente(false);
      await onRecargar();
    } catch (e) {
      setError(mensajeDe(e, "No se pudo anotar. Probá de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {puede && (
        <div className="flex flex-col gap-2 rounded-xl border border-linea dark:border-linea-dark bg-surface/60 dark:bg-surface-dark p-2.5">
          <textarea
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Compu: Enter anota, Shift+Enter baja de renglón (como un chat).
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                anotar();
              }
            }}
            placeholder={a.panel.phNovedad || "Escribí una novedad…"}
            aria-label="Escribir una novedad"
            className="w-full resize-y rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2 text-[14px] text-titulo dark:text-titulo-dark outline-none placeholder:text-suave dark:placeholder:text-suave-dark focus:border-[var(--acc)]"
          />
          {error && <p className="text-[13px] font-semibold text-duo-rojo">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {a.panel.opcionCliente ? (
              <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark">
                <input type="checkbox" checked={cliente} onChange={(e) => setCliente(e.target.checked)} className="h-4 w-4 accent-[var(--acc)]" />
                {a.panel.opcionCliente}
              </label>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={anotar}
              disabled={!texto.trim() || guardando}
              className="rounded-lg bg-[var(--acc)] px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-50"
            >
              {guardando ? "Anotando…" : "Anotar"}
            </button>
          </div>
        </div>
      )}
      {lista.length === 0 ? (
        <p className="px-1 py-4 text-center text-[13.5px] text-suave dark:text-suave-dark">Todavía no hay novedades.</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {lista.map((n) => (
            <li key={n.id} className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Avatar nombre={nombreAvatar(n.autor || "THAMES")} size={28} color={colorDeNombre(n.autor || "THAMES")} />
                <b className="min-w-0 flex-1 truncate text-[13.5px] text-titulo dark:text-titulo-dark">{n.autor || "THAMES"}</b>
                <small className="shrink-0 text-[12px] text-suave dark:text-suave-dark">{n.fecha ? ddmmhhmm(n.fecha) : ""}</small>
              </div>
              <p className="mt-1.5 whitespace-pre-line break-words text-[13.5px] leading-snug text-titulo dark:text-titulo-dark">{n.texto}</p>
              {n.chips?.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {n.chips.map((c) => (
                    <span key={c} className="rounded-full bg-surface dark:bg-surface-dark px-2 py-px text-[11px] font-semibold text-suave dark:text-suave-dark">
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Datos({ a, det, it }) {
  const filas = (a.panel?.datos ? a.panel.datos(det || it, it) || [] : []).filter((f) => f && f[1] !== null && f[1] !== undefined && f[1] !== "");
  if (!filas.length) return <p className="py-4 text-center text-[13.5px] text-suave dark:text-suave-dark">Sin datos para mostrar.</p>;
  return (
    <dl className="divide-y divide-linea overflow-hidden rounded-xl border border-linea dark:divide-linea-dark dark:border-linea-dark">
      {filas.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 bg-card px-3.5 py-2.5 dark:bg-card-dark sm:flex-row sm:items-start sm:gap-3">
          <dt className="shrink-0 text-[12.5px] font-semibold text-suave dark:text-suave-dark sm:w-[150px]">{k}</dt>
          <dd className="min-w-0 break-words text-[14px] text-titulo dark:text-titulo-dark">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PanelPlanilla({ a, it, id, det, cargando, error, tab, setTab, esPC, onCerrar, onReintentar, onRecargar, onMenu, menuActivo }) {
  // El de la lista (está al toque) con lo último que mandó el servidor encima.
  const x = det ? { ...(it || {}), ...det } : it;
  const cuerpo = useRef(null);
  useEffect(() => {
    if (cuerpo.current) cuerpo.current.scrollTop = 0;
  }, [id, tab]);

  const tareas = x && a.tareas ? a.tareas(x) || [] : [];
  const sigue = x && a.sigue ? a.sigue(x) : "";
  const nNov = det && a.panel?.novedades ? (a.panel.novedades(det) || []).length : null;
  const tabs = [
    ["nov", `💬 Novedades${nNov != null ? ` (${nNov})` : ""}`],
    ["datos", "📋 Datos"],
    ["pap", "📎 Papeles"],
  ];

  return (
    <aside
      data-planilla="panel"
      role="dialog"
      aria-modal={esPC ? "true" : undefined}
      aria-label={x ? a.nombre(x) : "Cargando"}
      className={`fixed z-[86] flex flex-col bg-card dark:bg-card-dark ${
        esPC ? "inset-y-0 right-0 w-[min(580px,100vw)] border-l border-linea dark:border-linea-dark shadow-[-12px_0_32px_rgba(15,23,42,.16)]" : "inset-0"
      }`}
      style={esPC ? undefined : { paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Cabecera */}
      <div className="flex items-start gap-2 border-b border-linea dark:border-linea-dark px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onCerrar}
          aria-label={esPC ? "Cerrar" : "Volver"}
          className="mt-0.5 rounded-full p-1.5 text-suave hover:bg-surface hover:text-titulo dark:text-suave-dark dark:hover:bg-surface-dark dark:hover:text-titulo-dark"
        >
          {esPC ? <HiXMark className="h-5 w-5" /> : <HiChevronLeft className="h-6 w-6" />}
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-[18px] font-extrabold leading-snug text-titulo dark:text-titulo-dark">{x ? a.nombre(x) : "Cargando…"}</h2>
          {x && <p className="line-clamp-2 text-[13px] text-suave dark:text-suave-dark">{a.panel?.sub ? a.panel.sub(x) : a.sub ? a.sub(x) : ""}</p>}
        </div>
      </div>

      <div ref={cuerpo} className="flex-1 overflow-y-auto overscroll-contain">
        {/* El estado (se toca y se cambia) + lo que sigue */}
        {x && (
          <div className="flex flex-col gap-2.5 px-3 pt-3.5 sm:px-4">
            <div className="max-w-[360px]">
              <BotonEstado a={a} it={x} grande activo={menuActivo} onMenu={onMenu} />
            </div>
            {tareas.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {tareas.map((t) => (
                  <li key={t.txt} className="flex items-start gap-2 text-[13.5px] font-semibold text-titulo dark:text-titulo-dark">
                    <span aria-hidden="true">{TONOS[t.tono]?.ic || "👉"}</span>
                    <span>{t.txt}</span>
                  </li>
                ))}
              </ul>
            ) : sigue ? (
              <p className="text-[13.5px] text-suave dark:text-suave-dark">👉 {sigue}</p>
            ) : null}
            {a.panel?.acciones && det ? <div className="flex flex-wrap gap-2">{a.panel.acciones(det, onRecargar, x)}</div> : null}
          </div>
        )}

        {/* Pestañas */}
        <div role="tablist" aria-label="Partes" className="sticky top-0 z-[1] mt-3 flex gap-1 overflow-x-auto border-b border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 sm:px-3">
          {tabs.map(([k, txt]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`-mb-px shrink-0 border-b-[3px] px-2.5 py-2.5 text-[13.5px] font-bold transition-colors ${
                tab === k ? "border-[var(--acc)] text-titulo dark:text-titulo-dark" : "border-transparent text-suave hover:text-titulo dark:text-suave-dark dark:hover:text-titulo-dark"
              }`}
            >
              {txt}
            </button>
          ))}
        </div>

        <div className="px-3 py-3.5 sm:px-4">
          {error ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-3 text-[14px] text-duo-rojo">
              {error}
              <button type="button" onClick={onReintentar} className="rounded-lg border border-duo-rojo/40 bg-card dark:bg-card-dark px-3 py-1.5 font-semibold">
                Probar de nuevo
              </button>
            </div>
          ) : tab === "datos" ? (
            x ? <Datos a={a} det={det} it={x} /> : <Esqueleto />
          ) : !det || cargando ? (
            <Esqueleto />
          ) : tab === "pap" ? (
            a.panel?.papeles ? a.panel.papeles(det, onRecargar, x) : null
          ) : (
            <Novedades key={id} a={a} det={det} onRecargar={onRecargar} />
          )}
        </div>
      </div>

      {/* Abajo: la ficha completa (y lo que agregue la sección) */}
      {x && (a.panel?.ficha || a.panel?.pie) && (
        <div
          className="flex flex-wrap items-center gap-2 border-t border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2.5 sm:px-4"
          style={esPC ? undefined : { paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
        >
          {a.panel.pie ? a.panel.pie(det, x) : null}
          {a.panel.ficha && (
            <button
              type="button"
              onClick={() => a.panel.ficha.onClick(x, det)}
              className="ml-auto inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-lg border-2 border-[var(--acc)] px-4 py-2 text-[14px] font-bold text-[var(--acc)] hover:bg-[var(--acc)] hover:text-white sm:flex-none"
            >
              {a.panel.ficha.txt || "Ficha completa"} <HiArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
