/* src/components/juego/TableroJuego.jsx
 *
 * 🏆 Tablero global del minijuego (Siniestro Cero).
 *
 *   · Jugadores → el mejor puntaje de cada persona, con su oficina.
 *   · Oficinas  → el récord de cada oficina, quién lo hizo, cuántas
 *                 partidas jugaron y cuántas personas (así se ve qué
 *                 oficina es más competitiva).
 *
 * Períodos: Hoy / Semana (arranca el lunes) / Siempre.
 * Recibe los datos armados (GET /api/ranking/juego/); no pide nada solo.
 */
import { useState } from "react";
import { HiUser, HiOfficeBuilding, HiStar } from "react-icons/hi";
import { UI } from "../tareas/tareasUI";

const fmt = (n) => Number(n || 0).toLocaleString("es-AR");

const VISTAS = [
  { clave: "jugadores", texto: "Jugadores", icono: HiUser },
  { clave: "oficinas", texto: "Oficinas", icono: HiOfficeBuilding },
];

const RANGOS = [
  ["hoy", "Hoy"],
  ["semana", "Semana"],
  ["siempre", "Siempre"],
];

// Oro / plata / bronce (mismos tonos que la pantalla de Ranking)
const PODIO = [
  "bg-[#fde68a]/60 text-[#92400e] dark:bg-[#78350f]/50 dark:text-[#fbbf24]",
  "bg-titulo/10 text-titulo dark:bg-white/10 dark:text-titulo-dark",
  "bg-[#fdba74]/40 text-[#9a3412] dark:bg-[#7c2d12]/45 dark:text-[#fb923c]",
];

function Puesto({ n }) {
  const cls = n <= 3 ? PODIO[n - 1] : `bg-transparent ${UI.txtSuave}`;
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${cls}`}>
      {n}
    </span>
  );
}

export default function TableroJuego({ datos, rango = "semana", onRango, cargando = false }) {
  const [vista, setVista] = useState("jugadores");
  const jugadores = datos?.jugadores || [];
  const oficinas = datos?.oficinas || [];
  const record = datos?.record;
  const verMinutos = oficinas.some((o) => o.minutos !== undefined);

  return (
    <div className={`${UI.card} overflow-hidden`} data-testid="juego-tablero">
      {/* Encabezado + pestañas */}
      <div className="flex items-center justify-between gap-2 border-b border-linea px-4 py-3 dark:border-linea-dark">
        <h2 className={`flex items-center gap-2 text-[15px] font-semibold ${UI.txtTitulo}`}>
          <HiStar className="text-tarjeta" /> Tablero
        </h2>
        <div className="flex gap-1 rounded-lg border border-linea bg-surface p-1 dark:border-linea-dark dark:bg-surface-dark">
          {VISTAS.map((v) => {
            const Icono = v.icono;
            return (
              <button
                key={v.clave}
                type="button"
                onClick={() => setVista(v.clave)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  vista === v.clave ? "bg-marca text-white" : UI.txtSuave
                }`}
              >
                <Icono className="text-[13px]" /> {v.texto}
              </button>
            );
          })}
        </div>
      </div>

      {/* Período */}
      <div className="flex gap-1.5 px-4 pt-3">
        {RANGOS.map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => onRango?.(k)}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
              rango === k ? "border-marca bg-marca/10 text-marca" : `border-linea dark:border-linea-dark ${UI.txtSuave}`
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="px-2 pb-2 pt-2">
        {cargando && !datos ? (
          <div className="flex justify-center py-10">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-linea border-t-marca dark:border-linea-dark" />
          </div>
        ) : vista === "jugadores" ? (
          jugadores.length === 0 ? (
            <p className={`px-3 py-8 text-center text-[13px] ${UI.txtSuave}`}>
              Nadie jugó todavía en este período. ¡Estrenalo vos!
            </p>
          ) : (
            <ul>
              {jugadores.map((r, i) => {
                const separado = i > 0 && r.puesto - jugadores[i - 1].puesto > 1;
                return (
                  <li key={r.clave}>
                    {separado && <div className={`py-1 text-center text-[11px] ${UI.txtSuave}`}>···</div>}
                    <div
                      className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                        r.soy_yo ? "bg-duo-azul-soft ring-1 ring-duo-azul/30 dark:bg-[var(--color-duo-azul-soft-dark)]" : ""
                      }`}
                    >
                      <Puesto n={r.puesto} />
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[14px] font-medium ${UI.txtTitulo}`}>
                          {r.nombre}
                          {r.soy_yo && <span className="ml-1.5 text-[11px] font-semibold text-duo-azul">vos</span>}
                        </div>
                        <div className={`truncate text-[11px] ${UI.txtSuave}`}>
                          {r.oficina || "Sin oficina"} · {r.partidas} {r.partidas === 1 ? "partida" : "partidas"}
                        </div>
                      </div>
                      <span className={`font-mono text-[15px] font-semibold tabular-nums ${UI.txtTitulo}`}>{fmt(r.mejor)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <ul>
            {oficinas.map((o) => (
              <li
                key={o.oficina_id}
                className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                  o.es_mia ? "bg-duo-azul-soft ring-1 ring-duo-azul/30 dark:bg-[var(--color-duo-azul-soft-dark)]" : ""
                }`}
              >
                <Puesto n={o.puesto} />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[14px] font-medium ${UI.txtTitulo}`}>
                    {o.nombre}
                    {o.es_mia && <span className="ml-1.5 text-[11px] font-semibold text-duo-azul">tu oficina</span>}
                  </div>
                  <div className={`truncate text-[11px] ${UI.txtSuave}`}>
                    {o.partidas
                      ? `${o.partidas} ${o.partidas === 1 ? "partida" : "partidas"} · ${o.jugadores} ${o.jugadores === 1 ? "jugador" : "jugadores"}${o.record_de ? ` · récord de ${o.record_de}` : ""}`
                      : "Todavía no jugó nadie"}
                    {verMinutos && o.partidas ? ` · ${o.minutos ? `${o.minutos} min` : "menos de 1 min"}` : ""}
                  </div>
                </div>
                <span className={`font-mono text-[15px] font-semibold tabular-nums ${o.mejor ? UI.txtTitulo : UI.txtSuave}`}>
                  {fmt(o.mejor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {record && (
        <div className={`border-t border-linea px-4 py-2.5 text-[12px] dark:border-linea-dark ${UI.txtSuave}`}>
          Récord histórico:{" "}
          <strong className={`font-semibold ${UI.txtTitulo}`}>{fmt(record.puntos)}</strong> · {record.nombre}
          {record.oficina ? ` (${record.oficina})` : ""}
        </div>
      )}
    </div>
  );
}
