// src/components/asegurados/AseguradosTable.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";

const normalize = (v) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

const estadoPerfilTone = (estado) => {
  const v = normalize(estado);
  if (v.includes("completo"))
    return { label: "Completo", cls: "bg-duo-verde/10 text-duo-verde ring-1 ring-duo-verde/25" };
  if (v.includes("borrador"))
    return { label: "Borrador", cls: "bg-duo-amarillo/10 text-duo-amarillo ring-1 ring-duo-amarillo/25" };
  return { label: estado || "—", cls: "bg-duo-azul/10 text-duo-azul ring-1 ring-duo-azul/25" };
};

const HeaderCell = ({ children, sortable, active, dir, onClick, className = "" }) => (
  <th
    className={`p-3 border-b border-linea dark:border-linea-dark ${sortable ? "cursor-pointer select-none" : ""} ${className}`}
    onClick={sortable ? onClick : undefined}
    title={sortable ? "Ordenar" : undefined}
  >
    <span className="inline-flex items-center gap-1">
      {children}
      {sortable && <span className="text-[11px] text-suave dark:text-suave-dark">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>}
    </span>
  </th>
);

/**
 * Modo servidor: si recibís (page, pageSize, total, onPageChange).
 * Si no, pagina en local. showFooter controla el footer local.
 */
export default function AseguradosTable({
  rows = [],
  page,
  pageSize,
  total,
  ordering, // ej. "cliente__apellido" | "-kpis__proximo_vto" (NO usado para ordenar local)
  onSort, // (clave ordering) => void  (modo servidor)
  onPageChange,
  onPageSizeChange,
  showFooter = true,
  loading = false,
}) {
  const serverMode = typeof total === "number" && typeof onPageChange === "function";

  // Estado local (solo modo local)
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(25);

  useEffect(() => {
    if (!serverMode) setLocalPage(1);
  }, [rows, serverMode]);

  const currPage = serverMode ? (page || 1) : localPage;
  const currSize = serverMode ? (pageSize || 25) : localPageSize;

  // Sorting local (cuando no hay servidor)
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const requestLocalSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  // Mapeo de claves de orden local ≈ columnas visibles
  const rowsSorted = useMemo(() => {
    const base = Array.isArray(rows) ? [...rows] : [];
    if (serverMode || !sortBy) return base;

    const getValue = (r) => {
      switch (sortBy) {
        case "asegurado":
          return normalize(`${r?.apellido || ""} ${r?.nombre || ""}` || r?.nombre_completo || "");
        case "dni":
          return Number(onlyDigits(r?.dni)) || 0;
        case "estado_perfil":
          return normalize(r?.estado_perfil);
        case "numero_poliza":
          return normalize(r?.ultima_poliza?.numero);
        case "compania":
          return normalize(r?.ultima_poliza?.compania);
        case "cuotas_vencidas":
          return Number(r?.kpis?.cuotas_vencidas) || 0;
        case "proximo_vto":
          return new Date(r?.kpis?.proximo_vto || 0).getTime();
        default:
          return 0;
      }
    };

    return base.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortBy, sortDir, serverMode]);

  const totalItems = serverMode ? (total ?? rowsSorted.length) : rowsSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currSize));

  const pageRows = useMemo(() => {
    if (serverMode) return rowsSorted; // backend ya paginó
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

  // Teclas ← →
  useEffect(() => {
    if (serverMode || !showFooter) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") gotoPage(currPage + 1);
      if (e.key === "ArrowLeft") gotoPage(currPage - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currPage, totalPages, serverMode, showFooter]);

  // Header sort handler (server/local)
  const sortHandler = (key, serverOrderingKey) => {
    if (serverMode) {
      const isActive = ordering?.replace("-", "") === serverOrderingKey;
      const isDesc = ordering?.startsWith("-");
      const next = !isActive ? serverOrderingKey : isDesc ? serverOrderingKey : `-${serverOrderingKey}`;
      onSort?.(next);
    } else {
      requestLocalSort(key);
    }
  };

  if (!loading && !pageRows.length) {
    return <div className="text-center text-suave dark:text-suave-dark mt-6 text-[13px]">No hay asegurados para mostrar.</div>;
  }

  return (
    <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark overflow-hidden">
      {/* Tabla (md y arriba) */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-surface dark:bg-surface-dark sticky top-0 z-10">
            <tr className="text-[12px] text-suave dark:text-suave-dark">
              <HeaderCell
                sortable
                active={serverMode ? ordering?.replace("-", "") === "cliente__apellido" : sortBy === "asegurado"}
                dir={serverMode ? (ordering?.startsWith("-") ? "desc" : "asc") : sortDir}
                onClick={() => sortHandler("asegurado", "cliente__apellido")}
              >
                Asegurado
              </HeaderCell>
              <HeaderCell
                sortable
                active={serverMode ? ordering?.replace("-", "") === "cliente__dni" : sortBy === "dni"}
                dir={serverMode ? (ordering?.startsWith("-") ? "desc" : "asc") : sortDir}
                onClick={() => sortHandler("dni", "cliente__dni")}
              >
                DNI
              </HeaderCell>
              <th className="p-3 border-b border-linea dark:border-linea-dark">Teléfono</th>
              <HeaderCell
                sortable
                active={serverMode ? ordering?.replace("-", "") === "cliente__estado" : sortBy === "estado_perfil"}
                dir={serverMode ? (ordering?.startsWith("-") ? "desc" : "asc") : sortDir}
                onClick={() => sortHandler("estado_perfil", "cliente__estado")}
              >
                Estado perfil
              </HeaderCell>
              <HeaderCell
                sortable
                active={serverMode ? ordering?.replace("-", "") === "ultima_poliza__numero" : sortBy === "numero_poliza"}
                dir={serverMode ? (ordering?.startsWith("-") ? "desc" : "asc") : sortDir}
                onClick={() => sortHandler("numero_poliza", "ultima_poliza__numero")}
              >
                Nº Póliza
              </HeaderCell>
              <HeaderCell
                sortable
                active={serverMode ? ordering?.replace("-", "") === "ultima_poliza__compania" : sortBy === "compania"}
                dir={serverMode ? (ordering?.startsWith("-") ? "desc" : "asc") : sortDir}
                onClick={() => sortHandler("compania", "ultima_poliza__compania")}
              >
                Compañía
              </HeaderCell>
              <HeaderCell
                sortable
                active={serverMode ? ordering?.replace("-", "") === "kpis__cuotas_vencidas" : sortBy === "cuotas_vencidas"}
                dir={serverMode ? (ordering?.startsWith("-") ? "desc" : "asc") : sortDir}
                onClick={() => sortHandler("cuotas_vencidas", "kpis__cuotas_vencidas")}
              >
                Cuotas vencidas
              </HeaderCell>
              <HeaderCell
                sortable
                active={serverMode ? ordering?.replace("-", "") === "kpis__proximo_vto" : sortBy === "proximo_vto"}
                dir={serverMode ? (ordering?.startsWith("-") ? "desc" : "asc") : sortDir}
                onClick={() => sortHandler("proximo_vto", "kpis__proximo_vto")}
              >
                Próx. vto
              </HeaderCell>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-[13px] text-suave dark:text-suave-dark">
                  Cargando…
                </td>
              </tr>
            )}

            {!loading &&
              pageRows.map((r, idx) => {
                const nombre =
                  r.nombre_completo ||
                  `${r.apellido || ""} ${r.nombre || ""}`.trim() ||
                  "—";
                const avatar = r.ultima_poliza?.foto_perfil_url;
                const tone = estadoPerfilTone(r?.estado_perfil);

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-surface dark:hover:bg-surface-dark transition-colors ${
                      idx % 2 === 0 ? "bg-card dark:bg-card-dark" : "bg-surface/50 dark:bg-surface-dark/50"
                    }`}
                  >
                    <td className="p-3 border-b border-linea dark:border-linea-dark font-medium">
                      <Link
                        to={`/clientes/${r.id}`}
                        className="text-duo-azul hover:underline underline-offset-2"
                        title="Ver detalle del asegurado"
                      >
                        {nombre}
                      </Link>
                      {avatar && (
                        <div className="mt-1">
                          <img
                            src={avatar}
                            alt={nombre}
                            className="h-8 w-8 rounded-full border border-linea dark:border-linea-dark object-cover"
                          />
                        </div>
                      )}
                    </td>

                    <td className="p-3 border-b border-linea dark:border-linea-dark">
                      {r.dni || <span className="text-suave dark:text-suave-dark">-</span>}
                    </td>

                    <td className="p-3 border-b border-linea dark:border-linea-dark">
                      {r.telefono_e164 || r.telefono ? (
                        <a
                          href={`tel:${r.telefono_e164 || r.telefono}`}
                          className="text-duo-azul hover:underline underline-offset-2"
                          title={`Llamar a ${nombre}`}
                        >
                          {r.telefono_e164 || r.telefono}
                        </a>
                      ) : (
                        <span className="text-suave dark:text-suave-dark">-</span>
                      )}
                    </td>

                    <td className="p-3 border-b border-linea dark:border-linea-dark">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.cls}`}>
                        {tone.label}
                      </span>
                    </td>

                    <td className="p-3 border-b border-linea dark:border-linea-dark">
                      {r.ultima_poliza?.numero || <span className="text-suave dark:text-suave-dark">-</span>}
                    </td>

                    <td className="p-3 border-b border-linea dark:border-linea-dark">
                      {r.ultima_poliza?.compania || <span className="text-suave dark:text-suave-dark">-</span>}
                    </td>

                    <td className="p-3 border-b border-linea dark:border-linea-dark">
                      {Number.isFinite(Number(r?.kpis?.cuotas_vencidas))
                        ? r.kpis.cuotas_vencidas
                        : <span className="text-suave dark:text-suave-dark">-</span>}
                    </td>

                    <td className="p-3 border-b border-linea dark:border-linea-dark">
                      {r?.kpis?.proximo_vto
                        ? new Date(r.kpis.proximo_vto).toLocaleDateString()
                        : <span className="text-suave dark:text-suave-dark">-</span>}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Lista responsiva (mobile) */}
      <div className="md:hidden divide-y divide-linea dark:divide-linea-dark">
        {pageRows.map((r) => {
          const nombre =
            r.nombre_completo ||
            `${r.apellido || ""} ${r.nombre || ""}`.trim() ||
            "—";
        const tone = estadoPerfilTone(r?.estado_perfil);

          return (
            <div key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] text-suave dark:text-suave-dark">Asegurado</div>
                  <Link
                    to={`/clientes/${r.id}`}
                    className="font-medium text-duo-azul hover:underline underline-offset-2"
                  >
                    {nombre}
                  </Link>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${tone.cls}`}>
                  {tone.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-suave dark:text-suave-dark">DNI</div>
                  <div>{r.dni || "-"}</div>
                </div>
                <div>
                  <div className="text-suave dark:text-suave-dark">Teléfono</div>
                  <div>
                    {r.telefono_e164 || r.telefono ? (
                      <a
                        href={`tel:${r.telefono_e164 || r.telefono}`}
                        className="text-duo-azul hover:underline underline-offset-2"
                      >
                        {r.telefono_e164 || r.telefono}
                      </a>
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-suave dark:text-suave-dark">Nº Póliza</div>
                  <div>{r.ultima_poliza?.numero || "-"}</div>
                </div>
                <div>
                  <div className="text-suave dark:text-suave-dark">Compañía</div>
                  <div>{r.ultima_poliza?.compania || "-"}</div>
                </div>
                <div>
                  <div className="text-suave dark:text-suave-dark">Cuotas vencidas</div>
                  <div>{Number.isFinite(Number(r?.kpis?.cuotas_vencidas)) ? r.kpis.cuotas_vencidas : "-"}</div>
                </div>
                <div>
                  <div className="text-suave dark:text-suave-dark">Próx. vto</div>
                  <div>{r?.kpis?.proximo_vto ? new Date(r.kpis.proximo_vto).toLocaleDateString() : "-"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer de paginación */}
      {showFooter && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 border-t border-linea dark:border-linea-dark">
          <div className="text-[13px] text-suave dark:text-suave-dark">
            Página <strong className="text-titulo dark:text-titulo-dark font-medium">{currPage}</strong> de <strong className="text-titulo dark:text-titulo-dark font-medium">{totalPages}</strong>
            <span> • {totalItems} asegurados</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2.5 py-1.5 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors disabled:opacity-40"
              onClick={() => gotoPage(1)}
              disabled={currPage <= 1}
              aria-label="Primera página"
              title="Primera página"
            >
              «
            </button>
            <button
              className="px-2.5 py-1.5 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors disabled:opacity-40"
              onClick={() => gotoPage(currPage - 1)}
              disabled={currPage <= 1}
              aria-label="Página anterior"
              title="Página anterior"
            >
              ‹
            </button>
            <button
              className="px-2.5 py-1.5 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors disabled:opacity-40"
              onClick={() => gotoPage(currPage + 1)}
              disabled={currPage >= totalPages}
              aria-label="Página siguiente"
              title="Página siguiente"
            >
              ›
            </button>
            <button
              className="px-2.5 py-1.5 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors disabled:opacity-40"
              onClick={() => gotoPage(totalPages)}
              disabled={currPage >= totalPages}
              aria-label="Última página"
              title="Última página"
            >
              »
            </button>
            <select
              value={currSize}
              onChange={(e) => changeSize(Number(e.target.value))}
              className="ml-2 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2 py-1.5 text-[13px] text-titulo dark:text-titulo-dark outline-none dark:[color-scheme:dark]"
              aria-label="Tamaño de página"
              title="Tamaño de página"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / pág.
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}