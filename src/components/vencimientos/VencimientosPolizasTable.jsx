// src/components/vencimientos/VencimientosPolizasTable.jsx
import React from "react";

export default function VencimientosPolizasTable({
  polizas,
  getOficinaLabel,
  fmtVto,
  pillCls,
  toneByDias,
  badgeCls,
  isFinalizada,
  getTelefonoFromPoliza,
  waUrl,
  NavLink,
}) {
  return (
    <div className="rounded border border-slate-700 overflow-hidden mt-3">
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-900 text-xs font-semibold border-b border-slate-700">
        <div className="col-span-2">Patente</div>
        <div className="col-span-2">Póliza</div>
        <div className="col-span-2">Compañía</div>
        <div className="col-span-3">Asegurado</div>
        <div className="col-span-1">Contacto</div>
        <div className="col-span-1">Vto</div>
        <div className="col-span-1 text-center">Días</div>
      </div>

      {polizas.length === 0 ? (
        <div className="p-4 text-sm opacity-80">Sin resultados.</div>
      ) : (
        polizas.map((p) => {
          const d = p?._dias;
          const tone = toneByDias(d);

          const clienteObj = p?.cliente || {};
          const clienteId = p?.cliente_id ?? clienteObj?.id ?? null;
          const clienteNombre = clienteObj
            ? `${clienteObj.apellido || ""}, ${clienteObj.nombre || ""}`
                .trim()
                .replace(/^, /, "")
            : "—";
          const clienteDoc = (clienteObj?.dni_cuit_cuil || clienteObj?.dni || "").toString().trim();

          const finalizada = isFinalizada(p);
          const oficinaLabel = getOficinaLabel(p);

          const tel = getTelefonoFromPoliza(p);
          const wa = waUrl(tel);

          const compania = (p?.compania || p?.compañia || "").toString().trim();
          const companiaLabel = compania || "—";

          return (
            <div
              key={p.id}
              className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950 hover:bg-white/5 text-sm"
            >
              <div className="col-span-2 font-semibold">{p?.patente || "—"}</div>

              <div className="col-span-2">
                <NavLink
                  to={`/polizas/${p.id}`}
                  className="font-semibold underline opacity-90 hover:opacity-100"
                  title="Abrir póliza"
                >
                  {p?.numero_poliza || "s/n"}
                </NavLink>

                <div className="text-[11px] opacity-70 truncate" title={oficinaLabel}>
                  {oficinaLabel}
                </div>
              </div>

              <div className="col-span-2">
                <div className="truncate font-semibold" title={companiaLabel}>
                  {companiaLabel}
                </div>
              </div>

              <div className="col-span-3">
                <div className="truncate flex items-center gap-2">
                  {clienteId ? (
                    <NavLink
                      to={`/clientes/${clienteId}`}
                      className="truncate underline opacity-90 hover:opacity-100"
                      title="Abrir cliente"
                    >
                      {clienteNombre || "—"}
                    </NavLink>
                  ) : (
                    <span className="truncate">{clienteNombre || "—"}</span>
                  )}

                  {finalizada ? (
                    <span className={`px-2 py-0.5 rounded border text-[10px] ${badgeCls("finalizada")}`}>
                      FINALIZADA
                    </span>
                  ) : null}
                </div>

                <div className="text-xs opacity-70 truncate flex gap-2">
                  {clienteId ? (
                    <NavLink
                      to={`/clientes/${clienteId}`}
                      className="underline opacity-80 hover:opacity-100"
                      title="Abrir cliente"
                    >
                      Cliente #{clienteId}
                    </NavLink>
                  ) : (
                    <span>Cliente: —</span>
                  )}

                  {clienteId && clienteDoc ? (
                    <NavLink
                      to={`/clientes/${clienteId}`}
                      className="underline opacity-80 hover:opacity-100"
                      title="Abrir cliente"
                    >
                      DNI/CUIT: {clienteDoc}
                    </NavLink>
                  ) : clienteDoc ? (
                    <span>DNI/CUIT: {clienteDoc}</span>
                  ) : null}
                </div>
              </div>

              <div className="col-span-1">
                {tel ? (
                  <div className="flex flex-col gap-1">
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline font-semibold text-emerald-200 hover:text-emerald-100 truncate"
                        title="Abrir chat de WhatsApp"
                      >
                        🟢 {tel}
                      </a>
                    ) : (
                      <span className="text-xs truncate">{tel}</span>
                    )}

                    <a
                      href={`tel:${tel}`}
                      className="text-[11px] underline opacity-70 hover:opacity-100"
                      title="Llamar"
                    >
                      Llamar
                    </a>
                  </div>
                ) : (
                  <span className="text-xs opacity-60">—</span>
                )}
              </div>

              <div className="col-span-1">{fmtVto(p?.vto_referencia || p?.fecha_vencimiento)}</div>

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
