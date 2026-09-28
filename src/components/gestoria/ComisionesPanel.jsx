// src/components/gestoria/ComisionesPanel.jsx
//
// 💰 COMISIONES (solo admin 🔒): lo que las gestorías nos pagaron y entró a
// Balances. El cliente le paga el trámite directo a la gestoría, así que a la
// caja entran SOLO estas comisiones — como ingreso "Comisión gestoría" SIN
// oficina (en Balances aparecen en «SIN OFICINA»; la oficina no las ve).
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import useDatosVivos from "../../hooks/useDatosVivos";
import { mensajeError, pedirComisiones } from "../../services/gestoria";
import { Candado, Cargando, Tile } from "./Piezas";
import { ddmmhhmm, plata } from "./gestoriaUtils";

const PERIODOS = [
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
  { dias: 365, label: "1 año" },
];

export default function ComisionesPanel() {
  const navigate = useNavigate();
  const [dias, setDias] = useState(90);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setData(await pedirComisiones(dias));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las comisiones."));
    }
  }, [dias]);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useDatosVivos(["gestoria"], () => cargar(), { cadaMs: 30000 });

  if (error && !data) return <p className="rounded-xl border border-duo-rojo/40 p-4 text-[14px] text-duo-rojo">{error}</p>;
  if (!data) return <Cargando alto="h-72" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="inline-flex items-center gap-2 text-xl font-bold text-titulo dark:text-titulo-dark">Comisiones <Candado /></h2>
        <span className="text-[13px] text-suave dark:text-suave-dark">
          El cliente le paga directo a la gestoría: a Balances entran solo las comisiones que nos pagan las gestorías (categoría «Comisión gestoría»),
          <strong> sin oficina</strong>: las ves en el total de todas las oficinas y en los movimientos; la caja de cada oficina no las muestra.
        </span>
      </div>

      <div className="flex gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.dias}
            type="button"
            aria-pressed={dias === p.dias}
            onClick={() => setDias(p.dias)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-medium ${
              dias === p.dias ? "bg-duo-violeta text-white border-duo-violeta" : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Tile k={`COMISIONES COBRADAS · ${dias} DÍAS`} v={plata(data.total)} n={`${data.movimientos.length} movimientos`} tono="verde" />
        <Tile k="A COBRAR" v={plata(data.a_cobrar)} n={`Pendientes de las gestorías${data.sin_precio ? ` · ${data.sin_precio} sin precio todavía` : ""}`} tono="ambar" />
        <Tile k="PLATA DE CLIENTES EN LA CAJA" v={plata(0)} n="Nada: la cobra la gestoría" />
      </div>

      <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface dark:bg-surface-dark text-left text-suave dark:text-suave-dark">
                <th scope="col" className="px-3 py-2.5 font-semibold">Fecha</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Gestor</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Trámite</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Oficina del trámite</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Forma</th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.movimientos.map((m) => (
                <tr
                  key={m.tramite}
                  onClick={() => navigate(`/gestoria/tramite/${m.tramite}`)}
                  className="cursor-pointer border-t border-linea/70 dark:border-linea-dark/70 hover:bg-surface/70 dark:hover:bg-surface-dark/60"
                >
                  <td className="px-3 py-3 whitespace-nowrap text-titulo dark:text-titulo-dark">{ddmmhhmm(m.fecha)}</td>
                  <td className="px-3 py-3 text-titulo dark:text-titulo-dark">{m.gestor_nombre}</td>
                  <td className="px-3 py-3 text-titulo dark:text-titulo-dark">
                    {m.tipo_corto}{m.detalle ? ` ${m.detalle}` : ""} · <span className="font-mono">{m.patente}</span>
                    <br />
                    <span className="text-[11px] text-suave dark:text-suave-dark">{m.numero}</span>
                  </td>
                  <td className="px-3 py-3 text-titulo dark:text-titulo-dark">{m.oficina_nombre || "—"}</td>
                  <td className="px-3 py-3 text-titulo dark:text-titulo-dark">{m.forma_nombre}</td>
                  <td className="px-3 py-3 text-right font-bold whitespace-nowrap text-duo-verde-sombra dark:text-duo-verde">+ {plata(m.monto)}</td>
                </tr>
              ))}
              {!data.movimientos.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-suave dark:text-suave-dark">No se cobró ninguna comisión en este período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
