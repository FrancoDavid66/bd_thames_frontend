/* src/components/juego/TableroJuego.jsx
 *
 * 🏆 HIGH SCORES del minijuego (Siniestro Cero), estilo fichín.
 *
 *   · Jugadores → el mejor puntaje de cada persona (con su bichito pixel y
 *                 su oficina). El 1° lleva corona.
 *   · Oficinas  → el récord de cada oficina con su barra de "energía", quién
 *                 lo hizo (MVP), cuántas partidas y cuántas personas jugaron
 *                 (así se ve qué oficina es más competitiva).
 *
 * Períodos: Hoy / Semana (arranca el lunes) / Siempre.
 * Recibe los datos armados (GET /api/ranking/juego/); no pide nada solo.
 */
import { useState } from "react";
import { AvatarPixel, Pixel } from "./ArcadeUI";
import { puntaje6 } from "./arcade";

const VISTAS = [
  { clave: "jugadores", texto: "Jugadores" },
  { clave: "oficinas", texto: "Oficinas" },
];

const RANGOS = [
  ["hoy", "Hoy"],
  ["semana", "Semana"],
  ["siempre", "Siempre"],
];

const podio = (n) => (n >= 1 && n <= 3 ? ` arcade-podio-${n}` : "");
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export default function TableroJuego({ datos, rango = "semana", onRango, cargando = false, error = false, onReintentar }) {
  const [vista, setVista] = useState("jugadores");
  const jugadores = datos?.jugadores || [];
  const oficinas = datos?.oficinas || [];
  const record = datos?.record;
  const verMinutos = oficinas.some((o) => o.minutos !== undefined);
  const maxOficina = oficinas.reduce((m, o) => Math.max(m, o.mejor || 0), 0);

  return (
    <div className="arcade-marco p-4" data-testid="juego-tablero">
      <h2 className="arcade-titulo-scores flex items-center justify-center gap-3 text-[15px] leading-none">
        <Pixel sprite="trofeo" tam={3} /> HIGH SCORES <Pixel sprite="trofeo" tam={3} />
      </h2>

      {/* Jugadores / Oficinas */}
      <div className="mt-4 flex gap-2">
        {VISTAS.map((v) => (
          <button
            key={v.clave}
            type="button"
            onClick={() => setVista(v.clave)}
            aria-pressed={vista === v.clave}
            className="arcade-tab"
          >
            {v.texto}
          </button>
        ))}
      </div>

      {/* Período */}
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {RANGOS.map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => onRango?.(k)} aria-pressed={rango === k} className="arcade-rango">
            {lbl}
          </button>
        ))}
      </div>

      <div className="mt-3 min-h-[180px]">
        {cargando && !datos ? (
          <div className="f-pixel t-cian arcade-titilar py-14 text-center text-[11px]">CARGANDO...</div>
        ) : error && !datos ? (
          <div className="py-10 text-center">
            <div className="f-pixel t-rojo text-[11px]">SIN CONEXION</div>
            <p className="f-crt t-suave mt-2 text-[19px]">No se pudo cargar el tablero. Revisá la conexión.</p>
            {onReintentar && (
              <button type="button" onClick={onReintentar} className="arcade-btn arcade-btn--cian mt-4 px-4 text-[9px]">
                Reintentar
              </button>
            )}
          </div>
        ) : vista === "jugadores" ? (
          jugadores.length === 0 ? (
            <div className="py-10 text-center">
              <p className="f-crt t-suave text-[20px]">Nadie jugó todavía en este período.</p>
              <p className="f-pixel t-amarillo arcade-titilar mt-3 text-[10px]">¡ESTRENALO VOS!</p>
            </div>
          ) : (
            <>
              <div className="arcade-cabecera">
                <span className="w-[30px]">POS</span>
                <span className="flex-1 pl-[31px]">JUGADOR</span>
                <span>PUNTOS</span>
              </div>
              <ul className="grid gap-1">
                {jugadores.map((r, i) => {
                  const separado = i > 0 && r.puesto - jugadores[i - 1].puesto > 1;
                  return (
                    <li key={r.clave}>
                      {separado && <div className="f-pixel t-tenue py-1 text-center text-[8px]">. . .</div>}
                      <div className={`arcade-fila${podio(r.puesto)}${r.soy_yo ? " arcade-fila--yo" : ""}`}>
                        <span className="arcade-puesto">{r.puesto}°</span>
                        <span className="relative flex shrink-0">
                          {r.puesto === 1 && (
                            <Pixel sprite="corona" tam={2} className="absolute -top-[11px] left-1/2 -translate-x-1/2" />
                          )}
                          <AvatarPixel semilla={r.clave} tam={3} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="arcade-nombre">{r.nombre}</div>
                          <div className="arcade-sub">
                            {r.oficina || "Sin oficina"} · {plural(r.partidas, "partida", "partidas")}
                          </div>
                        </div>
                        {r.soy_yo && <span className="arcade-vos">vos</span>}
                        <span className="arcade-score">{puntaje6(r.mejor)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )
        ) : (
          <ul className="grid gap-1">
            {oficinas.map((o) => (
              <li key={o.oficina_id} className={`arcade-fila${podio(o.mejor ? o.puesto : 0)}${o.es_mia ? " arcade-fila--yo" : ""}`}>
                <span className="arcade-puesto">{o.puesto}°</span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="arcade-nombre">{o.nombre}</span>
                    {o.es_mia && <span className="arcade-vos">tu oficina</span>}
                  </div>
                  <div className="arcade-barra" aria-hidden="true">
                    <span style={{ width: `${o.mejor && maxOficina ? Math.max(4, Math.round((o.mejor / maxOficina) * 100)) : 0}%` }} />
                  </div>
                  <div className="arcade-sub">
                    {o.partidas
                      ? `${plural(o.partidas, "partida", "partidas")} · ${plural(o.jugadores, "jugador", "jugadores")}${o.record_de ? ` · MVP: ${o.record_de}` : ""}`
                      : "Todavía no jugó nadie"}
                    {verMinutos && o.partidas ? ` · ${o.minutos ? `${o.minutos} min` : "menos de 1 min"}` : ""}
                  </div>
                </div>
                <span className={`arcade-score${o.mejor ? "" : " t-tenue"}`}>{puntaje6(o.mejor)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {record && (
        <div className="arcade-separador mt-3 pt-3 text-center">
          <div className="f-pixel t-magenta text-[8px]">RECORD HISTORICO</div>
          <div className="f-pixel t-amarillo mt-1 text-[13px]">{puntaje6(record.puntos)}</div>
          <div className="f-crt t-suave text-[19px]">
            {record.nombre}
            {record.oficina ? ` (${record.oficina})` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
