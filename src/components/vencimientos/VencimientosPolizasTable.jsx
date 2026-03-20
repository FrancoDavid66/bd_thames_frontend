// src/components/vencimientos/VencimientosPolizasTable.jsx
import React from "react";
import { FaCar, FaFileAlt, FaBuilding, FaUser, FaPhoneAlt, FaWhatsapp, FaCalendarAlt, FaExclamationTriangle } from "react-icons/fa";

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
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-4 transition-colors">
      
      {/* 🚀 HEADER DE LA TABLA (Visible en pantallas medianas o más grandes) */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
        <div className="col-span-2 flex items-center gap-2"><FaCar /> Patente</div>
        <div className="col-span-2 flex items-center gap-2"><FaFileAlt /> Póliza</div>
        <div className="col-span-2 flex items-center gap-2"><FaBuilding /> Compañía</div>
        <div className="col-span-3 flex items-center gap-2"><FaUser /> Asegurado</div>
        <div className="col-span-1 flex items-center gap-2">Contacto</div>
        <div className="col-span-1 flex items-center gap-2"><FaCalendarAlt /> Vto</div>
        <div className="col-span-1 text-center" title="Días para el vencimiento"><FaExclamationTriangle className="mx-auto" /></div>
      </div>

      {polizas.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No se encontraron pólizas con los filtros actuales.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {polizas.map((p) => {
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
                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors items-center relative"
              >
                {/* 1. PATENTE */}
                <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                  <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase flex items-center gap-1.5"><FaCar /> Patente:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 tracking-widest text-sm">
                    {p?.patente || "S/P"}
                  </span>
                </div>

                {/* 2. PÓLIZA Y OFICINA */}
                <div className="col-span-1 md:col-span-2 flex flex-col gap-1 md:gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase flex items-center gap-1.5"><FaFileAlt /> Póliza:</span>
                    <NavLink
                      to={`/polizas/${p.id}`}
                      className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors truncate text-sm"
                      title="Abrir póliza"
                    >
                      {p?.numero_poliza || "S/N"}
                    </NavLink>
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate md:pl-0 pl-26" title={oficinaLabel}>
                    🏢 {oficinaLabel}
                  </div>
                </div>

                {/* 3. COMPAÑÍA */}
                <div className="col-span-1 md:col-span-2 flex items-center md:items-start">
                  <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase flex items-center gap-1.5"><FaBuilding /> Comp:</span>
                  <div className="truncate font-semibold text-slate-700 dark:text-slate-200 text-sm" title={companiaLabel}>
                    {companiaLabel}
                  </div>
                </div>

                {/* 4. ASEGURADO */}
                <div className="col-span-1 md:col-span-3 flex flex-col gap-1 md:gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase flex items-center gap-1.5"><FaUser /> Titular:</span>
                    <div className="truncate flex items-center gap-2 flex-1 min-w-0">
                      {clienteId ? (
                        <NavLink
                          to={`/clientes/${clienteId}`}
                          className="truncate font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors text-sm"
                          title="Abrir cliente"
                        >
                          {clienteNombre || "—"}
                        </NavLink>
                      ) : (
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100 text-sm">{clienteNombre || "—"}</span>
                      )}

                      {finalizada && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${badgeCls("finalizada")}`}>
                          FINALIZADA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info extra del cliente (solo desktop o si hay espacio) */}
                  <div className="hidden md:flex text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate gap-2">
                    {clienteId && clienteDoc ? (
                      <NavLink
                        to={`/clientes/${clienteId}`}
                        className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                        title="Abrir cliente"
                      >
                         DNI: {clienteDoc}
                      </NavLink>
                    ) : clienteDoc ? (
                      <span>DNI: {clienteDoc}</span>
                    ) : null}
                  </div>
                </div>

                {/* 5. CONTACTO */}
                <div className="col-span-1 md:col-span-1 flex items-center md:items-start">
                  <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase flex items-center gap-1.5"><FaPhoneAlt /> Tel:</span>
                  {tel ? (
                    <div className="flex flex-col gap-1 md:gap-0.5">
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors truncate"
                          title="Abrir chat de WhatsApp"
                        >
                          <FaWhatsapp className="text-sm" /> {tel}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5">
                          <FaPhoneAlt className="text-[10px]" /> {tel}
                        </span>
                      )}
                      <a
                        href={`tel:${tel}`}
                        className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-blue-500 transition-colors"
                        title="Llamar"
                      >
                        Llamar
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">—</span>
                  )}
                </div>

                {/* 6. VTO */}
                <div className="col-span-1 md:col-span-1 flex items-center md:items-start">
                  <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase flex items-center gap-1.5"><FaCalendarAlt /> Vence:</span>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {fmtVto(p?.vto_referencia || p?.fecha_vencimiento)}
                  </div>
                </div>

                {/* 7. DÍAS (URGENCIA) */}
                <div className="col-span-1 md:col-span-1 flex md:justify-center items-center mt-2 md:mt-0 pt-3 md:pt-0 border-t border-slate-100 dark:border-slate-700/50 md:border-0">
                  <span className="md:hidden font-semibold flex-1 text-slate-400 text-xs uppercase">Días restantes:</span>
                  <span className={`px-2.5 py-1 rounded-md font-bold text-xs shadow-sm ${pillCls(tone)}`}>
                    {d ?? "—"}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}