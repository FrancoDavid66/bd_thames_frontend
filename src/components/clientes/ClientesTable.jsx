// src/components/clientes/ClientesTable.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Boton3D from "../ui/Boton3D";
import CardDuo from "../ui/CardDuo";

const normalize = (v) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

// 🎨 Iniciales del cliente para el avatar (nombre + apellido)
const getIniciales = (cli) => {
  const n = String(cli?.nombre || "").trim();
  const a = String(cli?.apellido || "").trim();
  const ini = `${n.charAt(0)}${a.charAt(0)}`.toUpperCase().trim();
  return ini || (String(cli?.alias || "").charAt(0).toUpperCase() || "?");
};

// 🎨 Color vivo del avatar rotando por id (azul/violeta/amarillo/verde)
const AVATAR_COLORS = [
  "bg-duo-azul text-white",
  "bg-duo-violeta text-white",
  "bg-duo-amarillo text-duo-texto",
  "bg-duo-verde text-white",
];
const avatarColor = (cli) => {
  const key = Number(cli?.id) || getIniciales(cli).charCodeAt(0) || 0;
  return AVATAR_COLORS[Math.abs(key) % AVATAR_COLORS.length];
};

// 🚀 AHORA EVALUAMOS SI LA FICHA ESTÁ COMPLETA O INCOMPLETA
const estadoTone = (estado) => {
  const v = normalize(estado);

  if (v.includes("incompleto") || v.includes("borrador"))
    return {
      label: "INCOMPLETO",
      cls: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
    };
  if (v.includes("completo") || v.includes("dia"))
    return {
      label: "COMPLETO",
      cls: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
    };
  if (v.includes("inactiv") || v.includes("baja"))
    return {
      label: "INACTIVO",
      cls: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
    };

  return {
    label: estado ? String(estado).toUpperCase() : "—",
    cls: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
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
    className={`p-4 border-b-2 border-linea dark:border-linea-dark text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark ${
      sortable ? "cursor-pointer select-none hover:text-duo-azul transition-colors" : ""
    } ${className}`}
    onClick={sortable ? onClick : undefined}
    title={sortable ? "Ordenar" : undefined}
  >
    <span className="inline-flex items-center gap-1.5">
      {children}
      {sortable && (
        <span className={`text-xs ${active ? "text-duo-azul" : "text-suave/50 dark:text-suave-dark/50"}`}>
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      )}
    </span>
  </th>
);

const ClientesTable = React.memo(function ClientesTable({
  clientes = [],
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  showFooter = true,
}) {
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
          <thead className="bg-surface dark:bg-surface-dark sticky top-0 z-10 backdrop-blur-md border-b-2 border-linea dark:border-linea-dark">
            <tr>
              <HeaderCell sortable active={sortBy === "nombre"} dir={sortDir} onClick={() => requestSort("nombre")}>Nombre</HeaderCell>
              <HeaderCell sortable active={sortBy === "dni"} dir={sortDir} onClick={() => requestSort("dni")}>DNI / CUIT</HeaderCell>
              <th className="p-4 border-b-2 border-linea dark:border-linea-dark text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">Teléfono</th>
              <th className="p-4 border-b-2 border-linea dark:border-linea-dark text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">Email</th>
              <HeaderCell sortable active={sortBy === "polizas"} dir={sortDir} onClick={() => requestSort("polizas")} className="text-center">Pólizas activas</HeaderCell>
              <HeaderCell sortable active={sortBy === "estado"} dir={sortDir} onClick={() => requestSort("estado")} className="text-center">Estado del Perfil</HeaderCell>
            </tr>
          </thead>

          <tbody className="divide-y divide-linea dark:divide-linea-dark">
            {pageRows.map((cli) => {
              const polAct = calcPolizasActivas(cli);
              // Evaluamos 'estado' general o 'estado_pago' por seguridad
              const tone = estadoTone(cli?.estado || cli?.estado_pago);

              return (
                <tr key={cli.id} className="hover:bg-card dark:hover:bg-card-dark transition-colors group">
                  <td className="p-4 font-black text-sm">
                    <div className="flex items-center gap-3 max-w-[240px]">
                      <span className={`shrink-0 h-9 w-9 rounded-full inline-flex items-center justify-center text-[12px] font-black ${avatarColor(cli)}`}>
                        {getIniciales(cli)}
                      </span>
                      <div className="min-w-0">
                        <Link to={`/clientes/${cli.id}`} className="text-titulo dark:text-titulo-dark group-hover:text-duo-azul transition-colors truncate block" title="Ver ficha">
                          {(cli.nombre || "") + " " + (cli.apellido || "")}
                        </Link>
                        {cli.alias && <div className="text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark truncate mt-0.5">{cli.alias}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-titulo dark:text-titulo-dark font-mono font-bold">
                    {cli.dni_cuit_cuil || <span className="text-suave/50 dark:text-suave-dark/50">—</span>}
                  </td>
                  <td className="p-4 text-xs">
                    {cli.telefono ? (
                      <a href={`tel:${cli.telefono}`} className="text-suave dark:text-suave-dark font-bold hover:text-duo-azul transition-colors">{cli.telefono}</a>
                    ) : <span className="text-suave/50 dark:text-suave-dark/50">—</span>}
                  </td>
                  <td className="p-4 text-xs">
                    {cli.email ? (
                      <a href={`mailto:${cli.email}`} className="text-suave dark:text-suave-dark font-bold hover:text-duo-azul transition-colors truncate max-w-[150px] inline-block" title={cli.email}>{cli.email}</a>
                    ) : <span className="text-suave/50 dark:text-suave-dark/50">—</span>}
                  </td>
                  <td className="p-4 text-center">
                    {polAct === null || polAct === 0 ? (
                      <span className="text-suave/50 dark:text-suave-dark/50">—</span>
                    ) : (
                      <Link to={`/polizas?cliente=${cli.id}&modo=polizas`} className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-xl text-[13px] font-black bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul hover:-translate-y-0.5 transition-transform" title="Ver pólizas">
                        {polAct}
                      </Link>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[90px] rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${tone.cls}`}>
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
            <CardDuo as="article" key={cli.id} className="p-4">
              <div className="flex items-start gap-3 mb-4 border-b-2 border-linea dark:border-linea-dark pb-4">
                <span className={`shrink-0 h-12 w-12 rounded-full inline-flex items-center justify-center text-base font-black ${avatarColor(cli)}`}>
                  {getIniciales(cli)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-suave dark:text-suave-dark mb-0.5">Cliente #{cli.id}</p>
                  <Link to={`/clientes/${cli.id}`} className="block text-base font-black text-titulo dark:text-titulo-dark truncate hover:text-duo-azul transition-colors">
                    {(cli.nombre || "") + " " + (cli.apellido || "")}
                  </Link>
                  {cli.alias && <div className="text-[10px] font-black uppercase tracking-widest text-duo-azul truncate mt-0.5">{cli.alias}</div>}
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${tone.cls}`}>
                  {tone.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">DNI/CUIT</span>
                  <span className="text-titulo dark:text-titulo-dark font-mono font-black">{cli.dni_cuit_cuil || "—"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">Teléfono</span>
                  {cli.telefono ? <a href={`tel:${cli.telefono}`} className="text-duo-azul font-black">{cli.telefono}</a> : <span className="text-suave dark:text-suave-dark">—</span>}
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">Pólizas Activas</span>
                  {polAct === null || polAct === 0 ? <span className="text-suave dark:text-suave-dark">—</span> : (
                     <Link to={`/polizas?cliente=${cli.id}&modo=polizas`} className="text-titulo dark:text-titulo-dark font-black inline-flex items-center gap-2">
                       <span className="bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul px-2.5 py-1 rounded-xl">{polAct}</span> Pólizas en curso
                     </Link>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t-2 border-linea dark:border-linea-dark">
                <Link to={`/clientes/${cli.id}`} className="block">
                  <Boton3D variant="blanco" size="sm" full>Abrir Ficha Completa</Boton3D>
                </Link>
              </div>
            </CardDuo>
          );
        })}
      </div>

      {/* Footer Paginación */}
      {showFooter && (
        <div className="mt-auto flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-t-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark backdrop-blur-md">
          <div className="text-[11px] font-bold text-suave dark:text-suave-dark uppercase tracking-widest">
            Página <span className="text-titulo dark:text-titulo-dark font-black">{currPage}</span> de <span className="text-titulo dark:text-titulo-dark font-black">{totalPages}</span>
            <span className="mx-2 opacity-50">•</span> {totalItems} Registros
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl overflow-hidden p-1 gap-1">
              <button className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-30 transition-all text-titulo dark:text-titulo-dark font-black" onClick={() => gotoPage(1)} disabled={currPage <= 1} title="Inicio">«</button>
              <button className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-30 transition-all text-titulo dark:text-titulo-dark font-black" onClick={() => gotoPage(currPage - 1)} disabled={currPage <= 1} title="Anterior">‹</button>
              <button className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-30 transition-all text-titulo dark:text-titulo-dark font-black" onClick={() => gotoPage(currPage + 1)} disabled={currPage >= totalPages} title="Siguiente">›</button>
              <button className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-30 transition-all text-titulo dark:text-titulo-dark font-black" onClick={() => gotoPage(totalPages)} disabled={currPage >= totalPages} title="Fin">»</button>
            </div>

            <select
              value={currSize} onChange={(e) => changeSize(Number(e.target.value))}
              className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-titulo dark:text-titulo-dark outline-none cursor-pointer focus:border-duo-azul transition-colors"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-card dark:bg-card-dark">{n} Filas</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
});

export default ClientesTable;