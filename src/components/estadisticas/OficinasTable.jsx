// src/components/estadisticas/OficinasTable.jsx  (diseño Duo)
import { motion } from "framer-motion";
import { HiOfficeBuilding } from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

export default function OficinasTable({
  oficinasData,
  getOficinaNombre,
  formatMixPercent,
}) {
  return (
    <AnimatedCard index={7} interactive={false}>
      <div>
        <div className="flex items-center justify-between border-b-2 border-linea dark:border-linea-dark pb-2.5 mb-2">
          <div className="flex items-center gap-2 text-sm font-black text-titulo dark:text-titulo-dark">
            <HiOfficeBuilding className="text-oficina" />
            <span>Detalle por oficina</span>
          </div>
          <span className="text-[11px] font-bold text-suave dark:text-suave-dark">
            {oficinasData.length} oficinas encontradas
          </span>
        </div>

        {oficinasData.length === 0 ? (
          <div className="px-1 py-4 text-sm font-bold text-suave dark:text-suave-dark">
            No hay datos para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-surface dark:bg-surface-dark border-b-2 border-linea dark:border-linea-dark">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
                    Oficina
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
                    Pólizas totales
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-ingreso">
                    Al día
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-ingreso">
                    Altas mes
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-egreso">
                    Bajas (Canceladas)
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-[#d97706] dark:text-tarjeta-claro">
                    En Mora (Vencidas)
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
                    Churn %
                  </th>
                </tr>
              </thead>
              <tbody>
                {oficinasData.map((o, idx) => {
                  const totalOf = Number(o.polizas_total || 0);
                  const bajasOf = Number(o.bajas_mes || 0);
                  const vencidasOf = Number(o.en_mora || o.vencidas_mes || 0);

                  const mixCob = o.por_cobertura || {};
                  const mixComp = o.por_compania || {};
                  const antig = o.antiguedad || {};

                  const churnPct = totalOf > 0 ? ((bajasOf + vencidasOf) / totalOf) * 100 : 0;

                  // 🚀 FIX: OBLIGAMOS AL SISTEMA A USAR EL NOMBRE REAL DE LA BASE DE DATOS
                  const oficinaNombre = getOficinaNombre ? getOficinaNombre(o.oficina) : (o.oficina_nombre || o.oficina || "—");

                  const cobKeys = Object.keys(mixCob);
                  const cobResumen = cobKeys
                    .slice(0, 3)
                    .map((k) => `${k}: ${formatMixPercent(mixCob[k], totalOf)}`)
                    .join(" · ");

                  const compKeys = Object.keys(mixComp);
                  const compResumen = compKeys
                    .slice(0, 3)
                    .map((k) => {
                      const count = Number(mixComp[k] || 0);
                      const pct = formatMixPercent(count, totalOf);
                      return `${k}: ${count} (${pct})`;
                    })
                    .join(" · ");

                  const antigResumenParts = [];
                  if (antig["0_1"]) antigResumenParts.push(`0–1: ${antig["0_1"]}`);
                  if (antig["1_3"]) antigResumenParts.push(`1–3: ${antig["1_3"]}`);
                  if (antig["3_5"]) antigResumenParts.push(`3–5: ${antig["3_5"]}`);
                  if (antig["5_plus"]) antigResumenParts.push(`5+: ${antig["5_plus"]}`);
                  const antigResumen = antigResumenParts.join(" · ");

                  let churnColor = "text-titulo dark:text-titulo-dark";
                  if (churnPct >= 5 && churnPct < 10) churnColor = "text-[#d97706] dark:text-tarjeta-claro";
                  else if (churnPct >= 10) churnColor = "text-egreso";
                  else if (churnPct > 0 && churnPct < 5) churnColor = "text-ingreso";

                  return (
                    <motion.tr
                      key={`${o.oficina || "SIN"}-${idx}`}
                      className="border-b-2 border-linea/50 dark:border-linea-dark/50"
                      whileHover={{ backgroundColor: "rgba(14,165,233,0.06)" }}
                      transition={{ duration: 0.15 }}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap align-top">
                        {/* El Nombre Principal */}
                        <div className="font-black text-oficina">{oficinaNombre}</div>

                        {/* El Código/ID chiquito abajo */}
                        {o.oficina && String(o.oficina) !== "SIN_OFICINA" && String(o.oficina) !== "OTRAS" ? (
                          <div className="mt-0.5 text-[10px] font-bold text-suave dark:text-suave-dark">
                            Código / ID: {String(o.oficina)}
                          </div>
                        ) : null}

                        <div className="mt-1.5 text-[10px] font-semibold text-suave dark:text-suave-dark space-y-0.5">
                          {cobResumen && <div>Coberturas: {cobResumen}</div>}
                          {compResumen && <div>Compañías: {compResumen}</div>}
                          {antigResumen && <div>Antigüedad (años): {antigResumen}</div>}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-right align-top font-mono font-black text-titulo dark:text-titulo-dark">
                        {totalOf.toLocaleString("es-AR")}
                      </td>
                      {/* Al día — activas SIN cuotas vencidas */}
                      <td className="px-3 py-2.5 text-right align-top">
                        <span className="font-mono font-black text-ingreso">
                          {(o.activas_al_dia ?? o.polizas_activas ?? 0).toLocaleString("es-AR")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-ingreso align-top">
                        {(o.nuevas_mes || 0).toLocaleString("es-AR")}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-egreso align-top">
                        {bajasOf.toLocaleString("es-AR")}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-[#d97706] dark:text-tarjeta-claro align-top">
                        {vencidasOf.toLocaleString("es-AR")}
                      </td>
                      <td className={`px-3 py-2.5 text-right align-top font-mono font-black tracking-wide ${churnColor}`}>
                        {churnPct.toFixed(1)}%
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}
