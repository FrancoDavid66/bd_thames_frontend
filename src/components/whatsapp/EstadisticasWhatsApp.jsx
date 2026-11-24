// src/components/whatsapp/EstadisticasWhatsApp.jsx
//
// 📊 ESTUDIO DE ATENCIÓN POR WHATSAPP (solo admin) — Franco 24/11/2026
//
// Para el período elegido y las oficinas de las solapas:
//   · tiempo de respuesta EN HORARIO (la noche y el domingo no cuentan),
//   · oficina por oficina: esperas, respondidas, sin respuesta, % en 15 min…,
//   · qué preguntan los clientes (temas, con ejemplos reales),
//   · cuándo escriben (día y hora),
//   · las esperas más lentas y las que quedaron sin respuesta (con «Ver chat»),
//   · las observaciones que anotaste (Bien / Mejorable / Mal).
//
//   <EstadisticasWhatsApp lineas={[2, 3]} onAbrirChat={(linea, tel) => …} />
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiChatAlt2, HiClock, HiExclamation, HiLightningBolt, HiMoon, HiRefresh, HiUserGroup,
} from "react-icons/hi";

import { pedirEstadisticas } from "../../services/whatsapp";

// ── Fechas (hora de Argentina, la del navegador) ──
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sumar = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const lunes = (d) => sumar(d, -((d.getDay() + 6) % 7));

function periodos() {
  const hoy = new Date();
  const l = lunes(hoy);
  const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const iniPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const finPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  return [
    { id: "semana", label: "Esta semana", desde: iso(l), hasta: iso(hoy) },
    { id: "pasada", label: "Semana pasada", desde: iso(sumar(l, -7)), hasta: iso(sumar(l, -1)) },
    { id: "mes", label: "Este mes", desde: iso(ini), hasta: iso(hoy) },
    { id: "mespasado", label: "Mes pasado", desde: iso(iniPasado), hasta: iso(finPasado) },
    { id: "30", label: "Últimos 30 días", desde: iso(sumar(hoy, -29)), hasta: iso(hoy) },
  ];
}

const fechaCorta = (s) => { const [, m, d] = s.split("-"); return `${d}/${m}`; };
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function duracion(min) {
  if (min === null || min === undefined) return "—";
  if (min < 60) return `${min} min`;
  if (min < 24 * 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(min / (24 * 60));
  return `${d} ${d === 1 ? "día" : "días"}`;
}

function telefonoLindo(t = "") {
  const d = String(t).replace(/\D/g, "");
  if (d.startsWith("549") && d.length === 13) {
    const r = d.slice(3);
    return r.startsWith("11") ? `11 ${r.slice(2, 6)}-${r.slice(6)}` : `${r.slice(0, 3)} ${r.slice(3, 6)}-${r.slice(6)}`;
  }
  return d ? `+${d}` : "";
}

// Velocidad (en horario) → estado con palabra + color (nunca color solo)
function ritmo(min) {
  if (min === null || min === undefined) return { label: "Sin datos", cls: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark" };
  if (min <= 10) return { label: "Rápido", cls: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde" };
  if (min <= 30) return { label: "Normal", cls: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-[var(--color-duo-amarillo-sombra)] dark:text-duo-amarillo" };
  return { label: "Lento", cls: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo" };
}

const CALIF = {
  BIEN: { label: "Bien", cls: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde" },
  MEJORABLE: { label: "Mejorable", cls: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-[var(--color-duo-amarillo-sombra)] dark:text-duo-amarillo" },
  MAL: { label: "Mal", cls: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo" },
  SIN: { label: "Nota", cls: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark" },
};

const caja = "rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark";
const titulo = "text-[14px] font-semibold text-titulo dark:text-titulo-dark";
const suave = "text-suave dark:text-suave-dark";

function Tarjeta({ icono: Icono, label, valor, detalle }) {
  return (
    <div className={`${caja} p-4`}>
      <p className={`flex items-center gap-1.5 text-[12px] font-medium ${suave}`}><Icono className="h-4 w-4" /> {label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-titulo dark:text-titulo-dark">{valor}</p>
      {detalle && <p className={`mt-0.5 text-[12px] ${suave}`}>{detalle}</p>}
    </div>
  );
}

// Barra horizontal de un solo color (magnitud): el texto va en tinta, no en el color de la barra.
function Barra({ valor, maximo, titulo: t }) {
  const ancho = maximo ? Math.max(2, Math.round((valor / maximo) * 100)) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-surface dark:bg-surface-dark" title={t}>
      <div className="h-2.5 rounded-full bg-[#25D366]" style={{ width: `${ancho}%` }} />
    </div>
  );
}

function Esperas({ titulo: t, filas, vacio, onAbrirChat, rojo }) {
  return (
    <section className={`${caja} p-4`}>
      <h3 className={`${titulo} mb-3`}>{t}</h3>
      {filas.length === 0 ? <p className={`text-[13px] ${suave}`}>{vacio}</p> : (
        <ul className="flex flex-col gap-2">
          {filas.map((e) => (
            <li key={`${e.linea}-${e.cliente_tel}-${e.desde}`} className="flex flex-col gap-1 rounded-lg bg-surface dark:bg-surface-dark p-2.5 sm:flex-row sm:items-center sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                  {e.cliente_nombre || telefonoLindo(e.cliente_tel)} <span className={`font-normal ${suave}`}>· {e.linea_nombre}</span>
                </p>
                <p className={`truncate text-[12px] ${suave}`}>«{e.texto_cliente || "…"}»</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  title={`En horario: ${duracion(e.min_habiles)} · De reloj: ${duracion(e.min_reales)}${e.fuera_horario ? " · escribió con la oficina cerrada" : ""}`}
                  className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${rojo ? "bg-duo-rojo text-white" : ritmo(e.min_habiles).cls}`}
                >
                  {duracion(e.min_habiles)}
                </span>
                {onAbrirChat && e.linea > 0 && (
                  <button type="button" onClick={() => onAbrirChat(e.linea, e.cliente_tel)}
                    className="h-7 rounded-md border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 text-[12px] font-medium text-titulo dark:text-titulo-dark hover:border-[#25D366]">
                    Ver chat
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function EstadisticasWhatsApp({ lineas = null, onAbrirChat }) {
  const opciones = useMemo(periodos, []);
  const [periodo, setPeriodo] = useState("semana");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abiertoTema, setAbiertoTema] = useState(null);
  const p = opciones.find((o) => o.id === periodo) || opciones[0];
  const claveLineas = lineas && lineas.length ? lineas.join(",") : "";

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await pedirEstadisticas({ desde: p.desde, hasta: p.hasta, lineas: claveLineas ? claveLineas.split(",") : null }));
      setError("");
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudieron cargar las estadísticas.");
    } finally {
      setCargando(false);
    }
  }, [p.desde, p.hasta, claveLineas]);

  useEffect(() => { cargar(); }, [cargar]);

  const t = datos?.total;
  const maxTema = Math.max(1, ...(datos?.temas || []).map((x) => x.mensajes));
  const maxDia = Math.max(1, ...(datos?.dias || []).map((x) => x.entrantes));
  const maxHora = Math.max(1, ...(datos?.horas || []).flat());
  const totalTemas = (datos?.temas || []).reduce((a, x) => a + x.mensajes, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Período */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Período" className="inline-flex flex-wrap rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-0.5">
          {opciones.map((o) => (
            <button key={o.id} type="button" onClick={() => setPeriodo(o.id)} aria-pressed={periodo === o.id}
              className={`h-8 rounded-md px-3 text-[13px] font-medium ${periodo === o.id ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul" : `${suave} hover:text-titulo dark:hover:text-titulo-dark`}`}>
              {o.label}
            </button>
          ))}
        </div>
        <span className={`text-[12px] ${suave}`}>{fechaCorta(p.desde)} al {fechaCorta(p.hasta)}</span>
        <button type="button" onClick={cargar} aria-label="Actualizar" title="Actualizar"
          className={`flex h-8 w-8 items-center justify-center rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark ${suave}`}>
          <HiRefresh className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-4 py-3 text-[13px] font-medium text-duo-rojo">{error}</p>}
      {!datos && cargando && <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-card dark:bg-card-dark" />)}</div>}

      {datos && (
        <>
          {/* Lo principal */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tarjeta icono={HiUserGroup} label="Clientes que escribieron" valor={t.clientes} detalle={`${t.entrantes} mensajes`} />
            <Tarjeta icono={HiLightningBolt} label="Tiempo de respuesta" valor={duracion(t.promedio_min)} detalle={`en horario · la mitad en ${duracion(t.mediana_min)}`} />
            <Tarjeta icono={HiClock} label="Contestadas en 15 min" valor={t.pct_15_min === null ? "—" : `${t.pct_15_min} %`} detalle={`en 1 hora: ${t.pct_1_hora ?? "—"} %`} />
            <Tarjeta icono={HiExclamation} label="Sin respuesta" valor={t.sin_respuesta} detalle={`de ${t.esperas} esperas`} />
            <Tarjeta icono={HiMoon} label="Llegaron con la oficina cerrada" valor={t.llegaron_cerrado} detalle="se mide desde que abre" />
          </div>

          {/* Oficina por oficina */}
          <section className={`${caja} overflow-x-auto`}>
            <h3 className={`${titulo} px-4 pt-4`}>Oficina por oficina</h3>
            <p className={`px-4 pb-2 text-[12px] ${suave}`}>Tiempos contando solo el horario de cada oficina. Primero las más lentas.</p>
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className={`border-y border-linea dark:border-linea-dark text-left text-[11px] uppercase tracking-wide ${suave}`}>
                  {["Oficina", "Clientes", "Esperas", "Promedio", "La mitad en", "9 de cada 10 en", "En 15 min", "Sin respuesta", "Por THAMES", "Observaciones"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.lineas.map((l) => {
                  const r = ritmo(l.promedio_min);
                  return (
                    <tr key={l.id} className="border-b border-linea/60 dark:border-linea-dark/60 last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-titulo dark:text-titulo-dark">{l.nombre}</p>
                        <p className={`text-[11px] ${suave}`}>{l.horario}</p>
                      </td>
                      <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark">{l.clientes}</td>
                      <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark">{l.respondidas}/{l.esperas}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-titulo dark:text-titulo-dark">{duracion(l.promedio_min)}</span>{" "}
                        <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${r.cls}`}>{r.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark">{duracion(l.mediana_min)}</td>
                      <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark">{duracion(l.p90_min)}</td>
                      <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark">{l.pct_15_min === null ? "—" : `${l.pct_15_min} %`}</td>
                      <td className={`px-3 py-2.5 font-semibold ${l.sin_respuesta ? "text-duo-rojo" : "text-titulo dark:text-titulo-dark"}`}>{l.sin_respuesta}</td>
                      <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark" title={`Desde el celu/web: ${l.salientes_celu}`}>{l.salientes_thames}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(l.observaciones || {}).map(([k, n]) => (
                            <span key={k} className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${(CALIF[k] || CALIF.SIN).cls}`}>{(CALIF[k] || CALIF.SIN).label} {n}</span>
                          ))}
                          {!Object.keys(l.observaciones || {}).length && <span className={suave}>—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Qué preguntan */}
            <section className={`${caja} p-4`}>
              <h3 className={titulo}>¿Qué preguntan los clientes?</h3>
              <p className={`mb-3 text-[12px] ${suave}`}>Por palabras clave de cada mensaje. Tocá un tema para ver ejemplos.</p>
              {datos.temas.length === 0 ? <p className={`text-[13px] ${suave}`}>Sin mensajes en este período.</p> : (
                <ul className="flex flex-col gap-2">
                  {datos.temas.map((x) => (
                    <li key={x.tema}>
                      <button type="button" onClick={() => setAbiertoTema(abiertoTema === x.tema ? null : x.tema)} className="w-full text-left">
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                          <span className="font-medium text-titulo dark:text-titulo-dark">{x.etiqueta}</span>
                          <span className={suave}>{x.mensajes} msj · {x.clientes} clientes · {totalTemas ? Math.round((100 * x.mensajes) / totalTemas) : 0} %</span>
                        </div>
                        <Barra valor={x.mensajes} maximo={maxTema} titulo={`${x.etiqueta}: ${x.mensajes} mensajes de ${x.clientes} clientes`} />
                      </button>
                      {abiertoTema === x.tema && (
                        <ul className={`mt-1.5 flex flex-col gap-1 border-l-2 border-[#25D366]/40 pl-3 text-[12px] ${suave}`}>
                          {x.ejemplos.length ? x.ejemplos.map((e, i) => <li key={i}>«{e}»</li>) : <li>Sin ejemplos con texto.</li>}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Cuándo escriben */}
            <section className={`${caja} p-4`}>
              <h3 className={titulo}>¿Cuándo escriben?</h3>
              <p className={`mb-3 text-[12px] ${suave}`}>Mensajes de clientes por día y hora (más oscuro = más mensajes). Pasá el mouse para ver el número.</p>
              <div className="overflow-x-auto">
                <table className="border-separate" style={{ borderSpacing: 2 }}>
                  <thead>
                    <tr>
                      <th />
                      {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
                        <th key={h} className={`w-6 text-center text-[10px] font-normal ${suave}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.horas.map((fila, d) => (
                      <tr key={d}>
                        <td className={`pr-1 text-[11px] ${suave}`}>{DIAS[d]}</td>
                        {fila.slice(7, 23).map((n, i) => (
                          <td key={i} title={`${DIAS[d]} ${i + 7}:00 → ${n} mensajes`}
                            className="h-5 w-6 rounded-[3px]"
                            style={{ background: n ? `rgba(37, 211, 102, ${0.12 + 0.88 * (n / maxHora)})` : "var(--color-surface, rgba(127,127,127,0.08))" }} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4 className="mb-2 mt-4 text-[13px] font-semibold text-titulo dark:text-titulo-dark">Día por día</h4>
              <ul className="flex flex-col gap-1.5">
                {datos.dias.map((d) => (
                  <li key={d.fecha} className="grid grid-cols-[48px_1fr_120px] items-center gap-2 text-[12px]">
                    <span className={suave}>{fechaCorta(d.fecha)}</span>
                    <Barra valor={d.entrantes} maximo={maxDia} titulo={`${d.entrantes} mensajes de clientes`} />
                    <span className="text-right text-titulo dark:text-titulo-dark">{d.entrantes} msj · {duracion(d.promedio_min)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Esperas titulo="Quedaron sin respuesta" filas={datos.sin_respuesta} rojo vacio="✅ Todos tuvieron respuesta." onAbrirChat={onAbrirChat} />
            <Esperas titulo="Las respuestas más lentas (en horario)" filas={datos.mas_lentas} vacio="Sin respuestas en este período." onAbrirChat={onAbrirChat} />
          </div>

          {/* Observaciones */}
          <section className={`${caja} p-4`}>
            <h3 className={`${titulo} mb-1 flex items-center gap-2`}><HiChatAlt2 className="h-4 w-4" /> Tus observaciones</h3>
            <p className={`mb-3 text-[12px] ${suave}`}>Se anotan desde cada chat (botón «Observación»).</p>
            {datos.observaciones.length === 0 ? <p className={`text-[13px] ${suave}`}>Todavía no anotaste ninguna en este período.</p> : (
              <ul className="flex flex-col gap-2">
                {datos.observaciones.map((o) => (
                  <li key={o.id} className="flex items-start gap-2 rounded-lg bg-surface dark:bg-surface-dark p-2.5 text-[13px]">
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${(CALIF[o.calificacion] || CALIF.SIN).cls}`}>{(CALIF[o.calificacion] || CALIF.SIN).label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-titulo dark:text-titulo-dark">{o.texto || "—"}</p>
                      <p className={`text-[11px] ${suave}`}>{o.linea} · {telefonoLindo(o.cliente_tel)} · {new Date(o.en).toLocaleDateString("es-AR")}</p>
                    </div>
                    {onAbrirChat && (
                      <button type="button" onClick={() => onAbrirChat(o.linea_id, o.cliente_tel)} className="h-7 shrink-0 rounded-md border border-linea dark:border-linea-dark px-2 text-[12px] text-titulo dark:text-titulo-dark">
                        Ver chat
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
