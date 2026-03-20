// src/components/vencimientos/VencimientosAseguradosTable.jsx
import React from "react";
import { FaWhatsapp, FaPhoneAlt, FaUser, FaIdCard, FaBuilding, FaShieldAlt } from "react-icons/fa";

export default function VencimientosAseguradosTable({ asegurados, waUrl, pillCls, toneByDias, NavLink }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-4 transition-colors">
      
      {/* 🚀 HEADER DE LA TABLA (Oculto en móviles chicos, visible en md+) */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
        <div className="col-span-4 flex items-center gap-2"><FaUser /> Asegurado</div>
        <div className="col-span-2 flex items-center gap-2"><FaIdCard /> DNI / CUIT</div>
        <div className="col-span-2">Contacto</div>
        <div className="col-span-2 flex items-center gap-2"><FaBuilding /> Oficina</div>
        <div className="col-span-1 text-center" title="Cantidad de Pólizas"><FaShieldAlt className="mx-auto" /></div>
        <div className="col-span-1 text-center">Urgencia</div>
      </div>

      {asegurados.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No se encontraron asegurados con los filtros actuales.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {asegurados.map((a) => {
            const d = a?.dias_mas_proximo;
            const tone = toneByDias(typeof d === "number" ? d : null);
            const wa = waUrl(a?.telefono);

            return (
              <div
                key={a.key}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors items-center"
              >
                {/* 1. ASEGURADO */}
                <div className="col-span-1 md:col-span-4 flex flex-col gap-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-base md:text-sm">
                    {a.nombre}
                  </div>
                  
                  {/* Badges de estado */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold tracking-wide">
                    {a.vencidas > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                        VENCIDAS: {a.vencidas}
                      </span>
                    )}
                    {a.hoy > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        HOY: {a.hoy}
                      </span>
                    )}
                    {a.por_vencer > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        POR VENCER: {a.por_vencer}
                      </span>
                    )}
                  </div>

                  {/* Links de acción */}
                  <div className="mt-1">
                    {a.cliente_id ? (
                      <NavLink 
                        to={`/clientes/${a.cliente_id}`} 
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                      >
                        Ver perfil del cliente &rarr;
                      </NavLink>
                    ) : a.poliza_id_ref ? (
                      <NavLink 
                        to={`/polizas/${a.poliza_id_ref}`} 
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                      >
                        Ver póliza &rarr;
                      </NavLink>
                    ) : null}
                  </div>
                </div>

                {/* 2. DNI (En mobile lo mostramos sutil) */}
                <div className="col-span-1 md:col-span-2 flex items-center md:items-start text-sm text-slate-600 dark:text-slate-300 truncate">
                  <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase">DNI:</span>
                  {a.dni || "—"}
                </div>

                {/* 3. CONTACTO */}
                <div className="col-span-1 md:col-span-2 flex flex-col md:gap-1.5 gap-2">
                  <span className="md:hidden font-semibold text-slate-400 text-xs uppercase mb-1">Contacto:</span>
                  {a.telefono ? (
                    <>
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors truncate"
                          title="Abrir chat de WhatsApp"
                        >
                          <FaWhatsapp className="text-sm" /> {a.telefono}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5">
                          <FaPhoneAlt className="text-slate-400" /> {a.telefono}
                        </span>
                      )}

                      <a 
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors" 
                        href={`tel:${a.telefono}`} 
                        title="Llamar"
                      >
                        <FaPhoneAlt /> Llamar
                      </a>
                    </>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                  )}
                </div>

                {/* 4. OFICINA */}
                <div className="col-span-1 md:col-span-2 flex items-center text-sm text-slate-600 dark:text-slate-300 truncate">
                  <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase">Oficina:</span>
                  {a.oficina || "—"}
                </div>

                {/* 5. PÓLIZAS COUNT */}
                <div className="col-span-1 md:col-span-1 flex items-center md:justify-center">
                  <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase">Pólizas:</span>
                  <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs">
                    {a.polizas_count}
                  </div>
                </div>

                {/* 6. URGENCIA */}
                <div className="col-span-1 md:col-span-1 flex items-center md:justify-center">
                  <span className="md:hidden font-semibold w-24 text-slate-400 text-xs uppercase">Días:</span>
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