// src/components/layout/Noticias.jsx
//
// 📣 «NOTICIAS» EN EL HEADER (Franco 23/11/2026): un botón con megáfono y el numerito
//    rojo de lo que todavía no leíste. Al tocarlo se abre el panel con lo nuevo de la app
//    (estilo «Novedades» de Notion / Mercado Pago): fecha, qué cambió en palabras simples
//    y un botón para ir directo a probarlo.
//
//    Las noticias salen de src/data/novedades.js (se agregan ahí, arriba de todo).
//    Lo leído se recuerda por usuario en este navegador (localStorage).
//
//    <Noticias usuario="sofi" rol="OFICINA" onAbrir={() => cerrarOtrosMenus()} />
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HiChevronRight, HiSpeakerphone, HiX } from "react-icons/hi";

import { NOVEDADES } from "../../data/novedades";

// Igual que los otros menús del header: de borde a borde en el celu, colgando del botón en la compu.
const MENU_CELU = "fixed inset-x-2 top-[calc(var(--alto-header,4rem)+0.5rem)]";
const MENU_COMPU = "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2";
const BTN =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-duo-azul/50";

const clave = (usuario) => `thames.noticias.leidas:${usuario || "-"}`;

function leerLeidas(usuario) {
  try {
    const v = JSON.parse(window.localStorage.getItem(clave(usuario)) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function fechaCorta(ymd) {
  const [a, m, d] = String(ymd || "").split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return d && m ? `${Number(d)} ${meses[Number(m) - 1] || ""}${a && a !== String(new Date().getFullYear()) ? ` ${a}` : ""}` : "";
}

export default function Noticias({ usuario = "", rol = "", onAbrir }) {
  const [abierto, setAbierto] = useState(false);
  const [leidas, setLeidas] = useState(() => leerLeidas(usuario));
  const [nuevasAlAbrir, setNuevasAlAbrir] = useState([]);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setLeidas(leerLeidas(usuario)), [usuario]);

  const visibles = useMemo(() => NOVEDADES.filter((n) => !n.roles || n.roles.includes(rol)), [rol]);
  const sinLeer = visibles.filter((n) => !leidas.includes(n.id)).length;

  const cerrar = useCallback(() => setAbierto(false), []);

  // Tocar afuera, Escape o cambiar de pantalla → se cierra.
  useEffect(() => {
    if (!abierto) return undefined;
    const alTocar = (e) => ref.current && !ref.current.contains(e.target) && cerrar();
    const alTeclear = (e) => e.key === "Escape" && cerrar();
    document.addEventListener("pointerdown", alTocar);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alTocar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, cerrar]);
  useEffect(() => cerrar(), [pathname, cerrar]);

  const abrir = () => {
    if (abierto) {
      cerrar();
      return;
    }
    onAbrir?.();
    // Las que eran nuevas al abrir siguen diciendo «NUEVO» mientras el panel está abierto.
    setNuevasAlAbrir(visibles.filter((n) => !leidas.includes(n.id)).map((n) => n.id));
    const todas = Array.from(new Set([...leidas, ...visibles.map((n) => n.id)]));
    setLeidas(todas);
    try {
      window.localStorage.setItem(clave(usuario), JSON.stringify(todas));
    } catch {
      /* sin localStorage: vuelve a marcar el número la próxima vez */
    }
    setAbierto(true);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={abrir}
        aria-label={sinLeer > 0 ? `Noticias: ${sinLeer} sin leer` : "Noticias"}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        title="Noticias: lo nuevo de la app"
        className={`${BTN} relative w-10 md:w-auto md:px-2.5 ${
          abierto
            ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
            : "text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
        }`}
      >
        <HiSpeakerphone className={`text-[20px] md:text-lg ${sinLeer > 0 ? "text-duo-azul" : ""}`} />
        <span className="hidden text-[13px] font-medium md:inline">Noticias</span>
        {sinLeer > 0 && (
          <span className="absolute left-[19px] top-[3px] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-duo-rojo px-[3px] text-[9px] font-semibold leading-none text-white dark:border-card-dark md:left-auto md:right-0.5 md:top-0.5">
            {sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Noticias de la app"
          className={`${MENU_CELU} ${MENU_COMPU} z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-2xl sm:w-[400px]`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-linea dark:border-linea-dark px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul">
                <HiSpeakerphone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Noticias</p>
                <p className="text-[12px] text-suave dark:text-suave-dark">Lo nuevo de la app</p>
              </div>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar noticias"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark"
            >
              <HiX className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {visibles.length === 0 ? (
              <p className="px-2 py-6 text-center text-[13px] text-suave dark:text-suave-dark">Por ahora no hay noticias.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {visibles.map((n) => {
                  const nueva = nuevasAlAbrir.includes(n.id);
                  return (
                    <li
                      key={n.id}
                      className={`rounded-xl border p-3.5 ${
                        nueva
                          ? "border-duo-azul/40 bg-duo-azul-soft/50 dark:bg-[var(--color-duo-azul-soft-dark)]"
                          : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card dark:bg-card-dark text-[20px]" aria-hidden="true">
                          {n.emoji || "📣"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px] text-suave dark:text-suave-dark">
                            <span>{fechaCorta(n.fecha)}</span>
                            {nueva && (
                              <span className="rounded-full bg-duo-azul px-1.5 py-[2px] text-[9px] font-bold tracking-wide text-white">NUEVO</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[14px] font-semibold leading-snug text-titulo dark:text-titulo-dark">{n.titulo}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-suave dark:text-suave-dark">{n.texto}</p>
                          {n.link?.to && (
                            <Link
                              to={n.link.to}
                              onClick={cerrar}
                              className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-duo-azul hover:underline"
                            >
                              {n.link.texto || "Ver"} <HiChevronRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="border-t border-linea dark:border-linea-dark px-4 py-2.5 text-center text-[11px] text-suave dark:text-suave-dark">
            Cada vez que haya algo nuevo en la app, aparece acá.
          </p>
        </div>
      )}
    </div>
  );
}
