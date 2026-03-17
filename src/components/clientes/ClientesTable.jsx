// src/components/clientes/ClientesTable.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const normalize = (v) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

// 🚀 AHORA EVALUAMOS SI LA FICHA ESTÁ COMPLETA O INCOMPLETA
const estadoTone = (estado) => {
  const v = normalize(estado);
  
  if (v.includes("incompleto") || v.includes("borrador"))
    return {
      label: "INCOMPLETO",
      cls: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    };
  if (v.includes("completo") || v.includes("dia"))
    return {
      label: "COMPLETO",
      cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    };
  if (v.includes("inactiv") || v.includes("baja"))
    return {
      label: "INACTIVO",
      cls: "bg-white/5 text-white/40 border border-white/10",
    };
    
  return {
    label: estado ? String(estado).toUpperCase() : "—",
    cls: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  };
};

const calcPolizasActivas = (cli) => {
  if (Array.isArray(cli?.polizas))
    return cli.polizas.filter((p) => p?.estado === "activa").length;
  if (Number.isFinite(cli?.polizas_activas)) return Number(cli.polizas_activas);
  return null;
};

const HeaderCell = ({ children, sortable, active, dir, onClick, className = "" }) => (
  <th
    className={`p-4 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 ${
      sortable ? "cursor-pointer select-none hover:text-white/70 transition-colors" : ""
    } ${className}`}
    onClick={sortable ? onClick : undefined}
    title={sortable ? "Ordenar" : undefined}
  >
    <span className="inline-flex items-center gap-1.5">
      {children}
      {sortable && (
        <span className={`text-xs ${active ? "text-sky-400" : "text-white/20"}`}>
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      )}
    </span>
  </th>
);

const ClientesTable = ({
  clientes = [],
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  showFooter = true,
}) => {
  const serverMode = typeof total === "number" && typeof onPageChange === "function";

  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(25);

  useEffect(() => {
    if (!serverMode) setLocalPage(1);
  }, [clientes, serverMode]);

  const currPage = serverMode ? page || 1 : localPage;
  const currSize = serverMode ? pageSize || 25 : localPageSize;

  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const requestSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const rowsSorted = useMemo(() => {
    const base = Array.isArray(clientes) ? [...clientes] : [];
    if (!sortBy) return base;
    const getValue = (c) => {
      switch (sortBy) {
        case "nombre":
          return normalize(`${c?.apellido || ""} ${c?.nombre || ""}`);
        case "dni":
          return Number(onlyDigits(c?.dni_cuit_cuil)) || 0;
        case "polizas":
          return calcPolizasActivas(c) ?? -1;
        case "estado":
          return normalize(c?.estado || c?.estado_pago);
        default:
          return 0;
      }
    };
    return base.sort((a, b) => {
      const va = getValue(a), vb = getValue(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [clientes, sortBy, sortDir]);

  const totalItems = serverMode ? total ?? rowsSorted.length : rowsSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currSize));

  const pageRows = useMemo(() => {
    if (serverMode) return rowsSorted; 
    const start = (currPage - 1) * currSize;
    return rowsSorted.slice(start, start + currSize);
  }, [rowsSorted, currPage, currSize, serverMode]);

  const gotoPage = (p) => {
    const target = Math.max(1, Math.min(totalPages, p));
    if (serverMode) onPageChange?.(target);
    else setLocalPage(target);
  };
  
  const changeSize = (size) => {
    if (serverMode) onPageSizeChange?.(size);
    else {
      setLocalPageSize(size);
      setLocalPage(1);
    }
  };

  useEffect(() => {
    if (serverMode || !showFooter) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") gotoPage(currPage + 1);
      if (e.key === "ArrowLeft") gotoPage(currPage - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currPage, totalPages, serverMode, showFooter]);

  if (!pageRows.length) return null; 

  return (
    <div className="w-full flex flex-col h-full bg-transparent">
      
      {/* Tabla (Desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-black/60 sticky top-0 z-10 backdrop-blur-md border-b border-white/10">
            <tr>
              <HeaderCell sortable active={sortBy === "nombre"} dir={sortDir} onClick={() => requestSort("nombre")}>Nombre</HeaderCell>
              <HeaderCell sortable active={sortBy === "dni"} dir={sortDir} onClick={() => requestSort("dni")}>DNI / CUIT</HeaderCell>
              <th className="p-4 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">Teléfono</th>
              <th className="p-4 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">Email</th>
              <HeaderCell sortable active={sortBy === "polizas"} dir={sortDir} onClick={() => requestSort("polizas")} className="text-center">Pólizas activas</HeaderCell>
              <HeaderCell sortable active={sortBy === "estado"} dir={sortDir} onClick={() => requestSort("estado")} className="text-center">Estado del Perfil</HeaderCell>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {pageRows.map((cli) => {
              const polAct = calcPolizasActivas(cli);
              // Evaluamos 'estado' general o 'estado_pago' por seguridad
              const tone = estadoTone(cli?.estado || cli?.estado_pago);
              
              return (
                <tr key={cli.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4 font-bold text-sm">
                    <Link to={`/clientes/${cli.id}`} className="text-white group-hover:text-sky-400 transition-colors truncate block max-w-[200px]" title="Ver ficha">
                      {(cli.nombre || "") + " " + (cli.apellido || "")}
                    </Link>
                    {cli.alias && <div className="text-[10px] font-black uppercase tracking-widest text-white/30 truncate max-w-[200px] mt-0.5">{cli.alias}</div>}
                  </td>
                  <td className="p-4 text-xs text-white/80 font-mono">
                    {cli.dni_cuit_cuil || <span className="text-white/20">—</span>}
                  </td>
                  <td className="p-4 text-xs">
                    {cli.telefono ? (
                      <a href={`tel:${cli.telefono}`} className="text-white/70 hover:text-white transition-colors">{cli.telefono}</a>
                    ) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="p-4 text-xs">
                    {cli.email ? (
                      <a href={`mailto:${cli.email}`} className="text-white/70 hover:text-white transition-colors truncate max-w-[150px] inline-block" title={cli.email}>{cli.email}</a>
                    ) : <span className="text-white/20">—</span>}
                  </td>
                  <td className="p-4 text-center">
                    {polAct === null || polAct === 0 ? (
                      <span className="text-white/20">—</span>
                    ) : (
                      <Link to={`/polizas?cliente=${cli.id}&modo=polizas`} className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-lg text-[11px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors">
                        {polAct}
                      </Link>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[90px] px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${tone.cls}`}>
                      {tone.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Lista responsiva (Mobile) */}
      <div className="md:hidden space-y-3 p-3">
        {pageRows.map((cli) => {
          const polAct = calcPolizasActivas(cli);
          const tone = estadoTone(cli?.estado || cli?.estado_pago);

          return (
            <motion.article
              key={cli.id} layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl bg-black/40 border border-white/5 p-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3 mb-4 border-b border-white/5 pb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">Cliente #{cli.id}</p>
                  <Link to={`/clientes/${cli.id}`} className="block text-sm font-bold text-white truncate hover:text-sky-400 transition-colors">
                    {(cli.nombre || "") + " " + (cli.apellido || "")}
                  </Link>
                  {cli.alias && <div className="text-[10px] font-black uppercase tracking-widest text-sky-400/80 truncate mt-0.5">{cli.alias}</div>}
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${tone.cls}`}>
                  {tone.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30">DNI/CUIT</span>
                  <span className="text-white/80 font-mono font-bold">{cli.dni_cuit_cuil || "—"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Teléfono</span>
                  {cli.telefono ? <a href={`tel:${cli.telefono}`} className="text-sky-400 font-bold">{cli.telefono}</a> : <span className="text-white/30">—</span>}
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Pólizas Activas</span>
                  {polAct === null || polAct === 0 ? <span className="text-white/30">—</span> : (
                     <Link to={`/polizas?cliente=${cli.id}&modo=polizas`} className="text-white font-bold inline-flex items-center gap-2">
                       <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">{polAct}</span> Pólizas en curso
                     </Link>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/5">
                <Link to={`/clientes/${cli.id}`} className="w-full inline-flex items-center justify-center py-2.5 rounded-xl bg-white/5 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-colors">
                  Abrir Ficha Completa
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Footer Paginación */}
      {showFooter && (
        <div className="mt-auto flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t border-white/10 bg-black/60 backdrop-blur-md">
          <div className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
            Página <span className="text-white">{currPage}</span> de <span className="text-white">{totalPages}</span> 
            <span className="mx-2 opacity-50">•</span> {totalItems} Registros
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden p-1">
              <button className="px-3 py-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all text-white" onClick={() => gotoPage(1)} disabled={currPage <= 1} title="Inicio">«</button>
              <button className="px-3 py-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all text-white" onClick={() => gotoPage(currPage - 1)} disabled={currPage <= 1} title="Anterior">‹</button>
              <button className="px-3 py-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all text-white" onClick={() => gotoPage(currPage + 1)} disabled={currPage >= totalPages} title="Siguiente">›</button>
              <button className="px-3 py-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all text-white" onClick={() => gotoPage(totalPages)} disabled={currPage >= totalPages} title="Fin">»</button>
            </div>
            
            <select
              value={currSize} onChange={(e) => changeSize(Number(e.target.value))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-[#0b0f1e]">{n} Filas</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesTable;