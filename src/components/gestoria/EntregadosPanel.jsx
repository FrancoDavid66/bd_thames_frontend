// src/components/gestoria/EntregadosPanel.jsx
//
// ✅ Entregados y cancelados (los trámites cerrados), del más nuevo al más viejo.
// El admin ve además el precio de la gestoría y la comisión (cobrada o pendiente),
// solo con las comisiones prendidas (🎚️ hoy apagadas).
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
import { listarCerrados, mensajeError } from "../../services/gestoria";
import { Candado, Cargando, Punto } from "./Piezas";
import { colorOficina, ddmm, diasEntre, plata, tipoCorto } from "./gestoriaUtils";

export default function EntregadosPanel() {
  const navigate = useNavigate();
  const { esAdmin } = useGestoria();
  const [filas, setFilas] = useState(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async (hasta = 1) => {
    setCargando(true);
    try {
      let todas = [];
      let r = null;
      for (let p = 1; p <= hasta; p += 1) {
        r = await listarCerrados(p);
        todas = todas.concat(r.results || []);
        if (!r.next) break;
      }
      setFilas(todas);
      setTotal(r?.count || 0);
      setHayMas(!!r?.next);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar la lista."));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(1);
  }, [cargar]);
  useDatosVivos(["gestoria"], () => cargar(pagina), { cadaMs: 30000 });

  if (error && !filas) return <p className="rounded-xl border border-duo-rojo/40 p-4 text-[14px] text-duo-rojo">{error}</p>;
  if (!filas) return <Cargando alto="h-72" />;
  // 🎚️ Precio y comisión: solo si el servidor los mandó (con las comisiones apagadas, no).
  const conPlata = esAdmin && filas.some((t) => t.ve_plata);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-titulo dark:text-titulo-dark">Entregados y cancelados</h2>
        <span className="text-[13px] text-suave dark:text-suave-dark">{total} trámites cerrados. Tocá uno para ver su historial.</span>
      </div>
      <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface dark:bg-surface-dark text-left text-suave dark:text-suave-dark">
                <th scope="col" className="px-3 py-2.5 font-semibold">Cerrado</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Trámite</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Cliente</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Oficina</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Gestor</th>
                <th scope="col" className="px-3 py-2.5 font-semibold text-right">Tardó</th>
                {conPlata && (
                  <>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-right">
                      <span className="inline-flex items-center gap-1">Precio (gestoría) <Candado texto={false} /></span>
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-right">Comisión</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map((t) => {
                const cierre = t.entregado_en || t.cancelado_en;
                return (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/gestoria/tramite/${t.id}`)}
                    className="cursor-pointer border-t border-linea/70 dark:border-linea-dark/70 hover:bg-surface/70 dark:hover:bg-surface-dark/60"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-titulo dark:text-titulo-dark">
                      {ddmm(cierre)}
                      {t.estado === "CANCELADO" && <span className="ml-1.5 text-[11px] font-bold text-duo-rojo">CANCELADO</span>}
                    </td>
                    <td className="px-3 py-3">
                      <strong className="text-titulo dark:text-titulo-dark">{tipoCorto(t)}</strong>
                      {t.con_vehiculo === false ? null : t.patente ? (
                        <>
                          {" "}· <span className="font-mono">{t.patente}</span>
                        </>
                      ) : (
                        <span className="text-suave dark:text-suave-dark"> · sin patente</span>
                      )}
                      <br />
                      <span className="text-[11px] text-suave dark:text-suave-dark">{t.numero}</span>
                    </td>
                    <td className="px-3 py-3 text-titulo dark:text-titulo-dark">{t.persona_nombre}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-titulo dark:text-titulo-dark"><Punto color={colorOficina(t.oficina)} />{t.oficina_nombre || "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-titulo dark:text-titulo-dark">{t.gestor_nombre || "—"}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-titulo dark:text-titulo-dark">{t.listo_en ? `${diasEntre(t.creado_en, t.listo_en)} días` : "—"}</td>
                    {conPlata && (
                      <>
                        <td className="px-3 py-3 text-right whitespace-nowrap text-titulo dark:text-titulo-dark">{t.precio_gestoria == null ? "—" : plata(t.precio_gestoria)}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap font-bold text-titulo dark:text-titulo-dark">
                          {Number(t.comision) > 0 ? (
                            <>
                              {plata(t.comision)}{" "}
                              {t.comision_cobrada ? (
                                <span className="text-[11px] font-semibold text-duo-verde-sombra dark:text-duo-verde">cobrada</span>
                              ) : (
                                <span className="text-[11px] font-semibold text-duo-amarillo-sombra dark:text-duo-amarillo">pendiente</span>
                              )}
                            </>
                          ) : (
                            <span className="font-normal text-suave dark:text-suave-dark">—</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {!filas.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-suave dark:text-suave-dark">Todavía no hay trámites cerrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {hayMas && (
        <button
          type="button"
          disabled={cargando}
          onClick={() => {
            const p = pagina + 1;
            setPagina(p);
            cargar(p);
          }}
          className="self-center rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2 text-[13px] font-semibold text-titulo dark:text-titulo-dark disabled:opacity-50"
        >
          {cargando ? "Cargando…" : "Ver más"}
        </button>
      )}
    </div>
  );
}
