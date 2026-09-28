// src/components/legales/ComisionesLegales.jsx
//
// 💰 COMISIONES (solo admin): lo que entró a Balances desde Legales ("Comisión
// legales", sin oficina) y lo que falta cobrar.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import useDatosVivos from "../../hooks/useDatosVivos";
import { mensajeError, pedirComisiones } from "../../services/legales";
import { Candado, Cargando, Tile } from "../gestoria/Piezas";
import { ddmm, fmtPct, plata } from "./legalesUtils";

const RANGOS = [
  [30, "30 días"],
  [90, "90 días"],
  [365, "1 año"],
];

export default function ComisionesLegales() {
  const navigate = useNavigate();
  const [dias, setDias] = useState(90);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setData(await pedirComisiones(dias));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron traer las comisiones."));
    }
  }, [dias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useDatosVivos(["legales", "caja"], () => cargar());

  if (error && !data) return <p className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft p-4 text-[14px] text-duo-rojo">{error}</p>;
  if (!data) return <Cargando alto="h-64" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-titulo dark:text-titulo-dark">
          Comisiones de Legales <Candado />
        </h2>
        <div className="flex gap-1 rounded-lg border border-linea dark:border-linea-dark p-1">
          {RANGOS.map(([d, txt]) => (
            <button
              key={d}
              type="button"
              aria-pressed={dias === d}
              onClick={() => setDias(d)}
              className={`rounded-md px-3 py-1 text-[13px] font-semibold ${dias === d ? "bg-sky-700 text-white" : "text-suave dark:text-suave-dark"}`}
            >
              {txt}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile k={`COBRADAS · ${RANGOS.find((r) => r[0] === dias)?.[1] || ""}`} v={plata(data.total)} n="Entraron a Balances sin oficina" tono="verde" />
        <Tile k="A COBRAR" v={plata(data.a_cobrar)} n="Honorarios cargados y comisión sin cobrar" tono="ambar" />
        <Tile k="SIN HONORARIOS" v={data.sin_honorarios} n="Casos cobrados donde el abogado no cargó sus honorarios" />
      </div>
      {data.movimientos.length ? (
        <div className="overflow-x-auto rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-suave dark:text-suave-dark border-b border-linea dark:border-linea-dark">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Caso</th>
                <th className="px-3 py-2 font-semibold">Abogado</th>
                <th className="px-3 py-2 font-semibold">Honorarios</th>
                <th className="px-3 py-2 font-semibold">%</th>
                <th className="px-3 py-2 font-semibold">Forma</th>
                <th className="px-3 py-2 font-semibold text-right">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {data.movimientos.map((m) => (
                <tr key={m.expediente} className="border-b border-linea/60 dark:border-linea-dark/60 last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">{ddmm(m.fecha)}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => navigate(`/legales/${m.expediente}`)} className="text-left font-semibold text-sky-700 dark:text-sky-400 hover:underline">
                      {m.numero}
                    </button>
                    <span className="block text-[11px] text-suave dark:text-suave-dark">
                      {m.persona} · {m.titulo} · {m.oficina_nombre}
                    </span>
                  </td>
                  <td className="px-3 py-2">{m.abogado_nombre}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{plata(m.honorarios)}</td>
                  <td className="px-3 py-2">{fmtPct(m.comision_pct)}</td>
                  <td className="px-3 py-2">{m.forma_nombre}</td>
                  <td className="px-3 py-2 text-right font-bold whitespace-nowrap">{plata(m.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 text-[14px] text-suave dark:text-suave-dark">
          No se cobraron comisiones en este período.
        </p>
      )}
    </div>
  );
}
