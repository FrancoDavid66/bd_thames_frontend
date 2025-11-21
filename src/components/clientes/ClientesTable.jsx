// src/components/clientes/ClientesTable.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";

const currency = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `$${num}`;
  }
};

const normalize = (v) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

const estadoTone = (estado) => {
  const v = normalize(estado);
  if (v.includes("dia")) return { label: "AL DÍA", cls: "bg-green-500/10 text-green-400 ring-1 ring-green-500/30" };
  if (v.includes("vencid")) return { label: "VENCIDO", cls: "bg-red-500/10 text-red-400 ring-1 ring-red-500/30" };
  if (v.includes("inactiv")) return { label: "INACTIVO", cls: "bg-gray-500/10 text-gray-300 ring-1 ring-gray-500/30" };
  return { label: estado || "—", cls: "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30" };
};

const calcPolizasActivas = (cli) => {
  if (Array.isArray(cli?.polizas)) return cli.polizas.filter((p) => p?.estado === "activa").length;
  if (Number.isFinite(cli?.polizas_activas)) return Number(cli.polizas_activas);
  return null;
};

const calcDeuda = (cli) => {
  if (!Array.isArray(cli?.polizas)) {
    if (Number.isFinite(cli?.deuda)) return Number(cli.deuda);
    return null;
  }
  let total = 0;
  for (const p of cli.polizas) {
    if (!Array.isArray(p?.cuotas)) continue;
    for (const c of p.cuotas) {
      if (!c?.pagado && Number.isFinite(Number(c?.monto))) total += Number(c.monto);
    }
  }
  return total;
};

const HeaderCell = ({ children, sortable, active, dir, onClick, className = "" }) => (
  <th
    className={`p-3 border-b border-gray-700 ${sortable ? "cursor-pointer select-none" : ""} ${className}`}
    onClick={sortable ? onClick : undefined}
    title={sortable ? "Ordenar" : undefined}
  >
    <span className="inline-flex items-center gap-1">
      {children}
      {sortable && <span className="text-xs text-gray-400">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>}
    </span>
  </th>
);

/**
 * Si recibís (page, pageSize, total, onPageChange) => modo SERVIDOR.
 * Si no, la tabla pagina en LOCAL con su footer.
 * Con showFooter podés ocultar el footer incluso en local.
 */
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

  // Estado local de paginación (solo modo local)
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(25);

  useEffect(() => {
    if (!serverMode) setLocalPage(1);
  }, [clientes, serverMode]);

  const currPage = serverMode ? (page || 1) : localPage;
  const currSize = serverMode ? (pageSize || 25) : localPageSize;

  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const requestSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  const rowsSorted = useMemo(() => {
    const base = Array.isArray(clientes) ? [...clientes] : [];
    if (!sortBy) return base;
    const getValue = (c) => {
      switch (sortBy) {
        case "nombre": return normalize(`${c?.apellido || ""} ${c?.nombre || ""}`);
        case "dni":    return Number(onlyDigits(c?.dni_cuit_cuil)) || 0;
        case "polizas":return calcPolizasActivas(c) ?? -1;
        case "deuda":  return calcDeuda(c) ?? -1;
        case "estado": return normalize(c?.estado_pago);
        default:       return 0;
      }
    };
    return base.sort((a, b) => {
      const va = getValue(a), vb = getValue(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [clientes, sortBy, sortDir]);

  const totalItems = serverMode ? (total ?? rowsSorted.length) : rowsSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currSize));

  const pageRows = useMemo(() => {
    if (serverMode) return rowsSorted; // el backend ya paginó
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
    else { setLocalPageSize(size); setLocalPage(1); }
  };

  // Flechas del teclado SOLO en modo local y si el footer está visible
  useEffect(() => {
    if (serverMode || !showFooter) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") gotoPage(currPage + 1);
      if (e.key === "ArrowLeft")  gotoPage(currPage - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currPage, totalPages, serverMode, showFooter]);

  if (!pageRows.length) {
    return <div className="text-center text-gray-400 mt-6">No hay clientes para este estado.</div>;
  }

  return (
    <div className="rounded shadow bg-gray-900 text-white">
      {/* Tabla (md y arriba) */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr className="text-xs uppercase tracking-wide text-gray-300">
              <HeaderCell sortable active={sortBy === "nombre"} dir={sortDir} onClick={() => requestSort("nombre")}>Nombre</HeaderCell>
              <HeaderCell sortable active={sortBy === "dni"} dir={sortDir} onClick={() => requestSort("dni")}>DNI / CUIT</HeaderCell>
              <th className="p-3 border-b border-gray-700">Teléfono</th>
              <th className="p-3 border-b border-gray-700">Email</th>
              <HeaderCell sortable active={sortBy === "polizas"} dir={sortDir} onClick={() => requestSort("polizas")}>Pólizas activas</HeaderCell>
              <HeaderCell sortable active={sortBy === "deuda"} dir={sortDir} onClick={() => requestSort("deuda")}>Deuda</HeaderCell>
              <HeaderCell sortable active={sortBy === "estado"} dir={sortDir} onClick={() => requestSort("estado")} className="text-center">Estado</HeaderCell>
            </tr>
          </thead>

          <tbody>
            {pageRows.map((cli, idx) => {
              const polAct = calcPolizasActivas(cli);
              const deuda = calcDeuda(cli);
              const tone = estadoTone(cli?.estado_pago);
              return (
                <tr key={cli.id} className={`hover:bg-gray-800 transition-colors ${idx % 2 === 0 ? "bg-gray-900" : "bg-gray-900/80"}`}>
                  <td className="p-3 border-b border-gray-800 font-medium">
                    <Link to={`/clientes/${cli.id}`} className="text-blue-400 hover:underline underline-offset-2" title="Ver detalle de cliente">
                      {(cli.nombre || "") + " " + (cli.apellido || "")}
                    </Link>
                    {cli.alias && <div className="text-xs text-gray-400">{cli.alias}</div>}
                  </td>
                  <td className="p-3 border-b border-gray-800">
                    {cli.dni_cuit_cuil || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-3 border-b border-gray-800">
                    {cli.telefono ? <a href={`tel:${cli.telefono}`} className="text-blue-400 hover:underline underline-offset-2" title={`Llamar a ${cli.nombre}`}>{cli.telefono}</a> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-3 border-b border-gray-800">
                    {cli.email ? <a href={`mailto:${cli.email}`} className="text-blue-400 hover:underline underline-offset-2" title={`Enviar correo a ${cli.nombre}`}>{cli.email}</a> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-3 border-b border-gray-800">
                    {polAct === null ? <span className="text-gray-400">-</span> : (
                      <Link to={`/polizas?cliente=${cli.id}&modo=polizas`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30 hover:bg-blue-500/20" title="Ver pólizas del cliente">
                        {polAct}
                      </Link>
                    )}
                  </td>
                  <td className="p-3 border-b border-gray-800">
                    {deuda === null ? <span className="text-gray-400">-</span> : currency(deuda)}
                  </td>
                  <td className="p-3 border-b border-gray-800 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tone.cls}`}>{tone.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Lista responsiva (mobile) */}
      <div className="md:hidden divide-y divide-gray-800">
        {pageRows.map((cli) => {
          const polAct = calcPolizasActivas(cli);
          const deuda = calcDeuda(cli);
          const tone = estadoTone(cli?.estado_pago);
          return (
            <div key={cli.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-300">Cliente</div>
                  <Link to={`/clientes/${cli.id}`} className="font-semibold text-blue-400 hover:underline underline-offset-2">
                    {(cli.nombre || "") + " " + (cli.apellido || "")}
                  </Link>
                  {cli.alias && <div className="text-xs text-gray-400">{cli.alias}</div>}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tone.cls}`}>{tone.label}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-400">DNI / CUIT</div>
                  <div>{cli.dni_cuit_cuil || "-"}</div>
                </div>
                <div>
                  <div className="text-gray-400">Teléfono</div>
                  <div>{cli.telefono ? <a href={`tel:${cli.telefono}`} className="text-blue-400 hover:underline underline-offset-2">{cli.telefono}</a> : "-"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-400">Email</div>
                  <div>{cli.email ? <a href={`mailto:${cli.email}`} className="text-blue-400 hover:underline underline-offset-2">{cli.email}</a> : "-"}</div>
                </div>
                <div>
                  <div className="text-gray-400">Pólizas activas</div>
                  <div>{polAct === null ? "-" : <Link to={`/polizas?cliente=${cli.id}&modo=polizas`} className="text-blue-300 underline underline-offset-2">{polAct}</Link>}</div>
                </div>
                <div>
                  <div className="text-gray-400">Deuda</div>
                  <div>{deuda === null ? "-" : currency(deuda)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer de paginación (solo si showFooter) */}
      {showFooter && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 border-t border-gray-800">
          <div className="text-sm text-gray-300">
            Página <strong>{currPage}</strong> de <strong>{totalPages}</strong>
            <span className="text-gray-500"> • {totalItems} clientes</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-40" onClick={() => gotoPage(1)} disabled={currPage <= 1} aria-label="Primera página" title="Primera página">«</button>
            <button className="px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-40" onClick={() => gotoPage(currPage - 1)} disabled={currPage <= 1} aria-label="Página anterior" title="Página anterior">‹</button>
            <button className="px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-40" onClick={() => gotoPage(currPage + 1)} disabled={currPage >= totalPages} aria-label="Página siguiente" title="Página siguiente">›</button>
            <button className="px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-40" onClick={() => gotoPage(totalPages)} disabled={currPage >= totalPages} aria-label="Última página" title="Última página">»</button>
            <select value={currSize} onChange={(e) => changeSize(Number(e.target.value))} className="ml-2 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm" aria-label="Tamaño de página" title="Tamaño de página">
              {[10, 25, 50, 100].map((n) => (<option key={n} value={n}>{n} / pág.</option>))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesTable;
