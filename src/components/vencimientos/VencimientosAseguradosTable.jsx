// src/components/vencimientos/VencimientosAseguradosTable.jsx
import React from "react";

export default function VencimientosAseguradosTable({ asegurados, waUrl, pillCls, toneByDias, NavLink }) {
  return (
    <div className="rounded border border-slate-700 overflow-hidden mt-3">
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-900 text-xs font-semibold border-b border-slate-700">
        <div className="col-span-4">Asegurado</div>
        <div className="col-span-2">DNI</div>
        <div className="col-span-2">Contacto</div>
        <div className="col-span-2">Oficina</div>
        <div className="col-span-1 text-center">Pólizas</div>
        <div className="col-span-1 text-center">Urgencia</div>
      </div>

      {asegurados.length === 0 ? (
        <div className="p-4 text-sm opacity-80">Sin asegurados en este filtro.</div>
      ) : (
        asegurados.map((a) => {
          const d = a?.dias_mas_proximo;
          const tone = toneByDias(typeof d === "number" ? d : null);
          const wa = waUrl(a?.telefono);

          return (
            <div
              key={a.key}
              className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950 hover:bg-white/5 text-sm"
            >
              <div className="col-span-4">
                <div className="font-semibold truncate">{a.nombre}</div>
                <div className="text-xs opacity-70">
                  {a.vencidas ? `Vencidas:${a.vencidas} ` : ""}
                  {a.hoy ? `Hoy:${a.hoy} ` : ""}
                  {a.por_vencer ? `PorVencer:${a.por_vencer}` : ""}
                </div>

                {a.cliente_id ? (
                  <NavLink to={`/clientes/${a.cliente_id}`} className="text-xs underline opacity-80 hover:opacity-100">
                    Ver cliente
                  </NavLink>
                ) : a.poliza_id_ref ? (
                  <NavLink to={`/polizas/${a.poliza_id_ref}`} className="text-xs underline opacity-80 hover:opacity-100">
                    Ver póliza
                  </NavLink>
                ) : null}
              </div>

              <div className="col-span-2 truncate">{a.dni || "—"}</div>

              <div className="col-span-2 truncate">
                {a.telefono ? (
                  <div className="flex flex-col gap-1">
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline font-semibold text-emerald-200 hover:text-emerald-100 truncate"
                        title="Abrir chat de WhatsApp"
                      >
                        🟢 {a.telefono}
                      </a>
                    ) : (
                      <span className="text-xs truncate">{a.telefono}</span>
                    )}

                    <a className="text-[11px] underline opacity-70 hover:opacity-100" href={`tel:${a.telefono}`} title="Llamar">
                      Llamar
                    </a>
                  </div>
                ) : (
                  "—"
                )}
              </div>

              <div className="col-span-2 truncate">{a.oficina || "—"}</div>

              <div className="col-span-1 text-center font-semibold">{a.polizas_count}</div>

              <div className="col-span-1 flex justify-center">
                <span className={`px-2 py-1 rounded border text-xs ${pillCls(tone)}`}>{d ?? "—"}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
