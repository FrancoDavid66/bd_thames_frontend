// src/components/gruas/SolicitudesTable.jsx
import { useEffect, useMemo, useState } from "react";
import { HiRefresh, HiDownload, HiChat, HiX } from "react-icons/hi";
import dayjs from "dayjs";
import GruasAPI from "../../api/gruas";

// --------- Helpers ----------
const parseList = (res) => {
  let rows = [];
  if (Array.isArray(res)) rows = res;
  else if (res && typeof res === "object") {
    for (const k of ["results", "items", "data", "rows"]) {
      if (Array.isArray(res[k])) { rows = res[k]; break; }
    }
  }
  const total =
    (res && (res.count ?? res.total ?? res.total_items)) ??
    rows.length;
  return { rows, total: Number(total) || 0 };
};

const STATUS_META = {
  PEND_VALID: { label: "Pendiente",   cls: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-400/30" },
  ASIGNADA:   { label: "Asignada",    cls: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-400/30" },
  EN_CURSO:   { label: "En curso",    cls: "bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/30" },
  CERRADA:    { label: "Cerrada",     cls: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30" },
  CANCELADA:  { label: "Cancelada",   cls: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/30" },
  DEFAULT:    { label: "—",           cls: "bg-gray-600/20 text-gray-300 ring-1 ring-gray-500/30" },
};

const fmtDate = (d) => (d ? dayjs(d).isValid() ? dayjs(d).format("DD/MM/YY HH:mm") : d : "-");

// --------- Sortable header (igual patrón que PolizaTable) ----------
const SortHeader = ({ label, field, ordering, onOrderingChange, className = "" }) => {
  const isActive = ordering && (ordering === field || ordering === `-${field}`);
  const dir = ordering && ordering.startsWith("-") ? "desc" : "asc";

  const nextOrdering = () => {
    if (!onOrderingChange) return;
    if (!isActive) return onOrderingChange(field);         // activa asc
    if (dir === "asc") return onOrderingChange(`-${field}`); // alterna a desc
    return onOrderingChange(field);                        // vuelve a asc
  };

  return (
    <th
      className={`p-3 border-b border-gray-700 ${onOrderingChange ? "cursor-pointer select-none" : ""} ${className}`}
      onClick={onOrderingChange ? nextOrdering : undefined}
      title={onOrderingChange ? "Ordenar" : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {onOrderingChange && (
          <span className="text-xs text-gray-400">
            {isActive ? (dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        )}
      </span>
    </th>
  );
};

export default function SolicitudesTable() {
  // --------- Estado de datos/UI ----------
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState("");

  // Filtros sencillos
  const [estado, setEstado] = useState(""); // "", PEND_VALID, ASIGNADA, EN_CURSO, CERRADA, CANCELADA
  const [qLocal, setQLocal] = useState("");
  const [q, setQ] = useState("");

  // Paginación + orden
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [ordering, setOrdering] = useState("-fecha"); // por defecto, más recientes

  // --------- Carga de datos (server-side) ----------
  async function load() {
    try {
      setStatus("loading"); setError("");
      const filtros = { estado, q, page, page_size: pageSize, ordering };
      const res = await GruasAPI.getSolicitudes?.(filtros);
      const { rows, total } = parseList(res);
      setItems(rows);
      setTotal(total);
      setStatus("idle");
    } catch (e) {
      setItems([]);
      setTotal(0);
      setStatus("error");
      setError(e?.message || "Error al cargar solicitudes");
    }
  }

  // Debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQ(qLocal);
    }, 350);
    return () => clearTimeout(t);
  }, [qLocal]);

  // Disparar carga al cambiar filtros/paginación/orden
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [estado, q, page, pageSize, ordering]);

  // --------- Acciones ----------
  async function validar(id){
    try { await GruasAPI?.validarFotos?.(id); await load(); }
    catch(e){ alert(e?.message || "No se pudo validar"); }
  }
  async function asignar(id){
    const pid = window.prompt("ID proveedor:");
    if(!pid) return;
    try { await GruasAPI?.asignarProveedor?.(id, Number(pid)); await load(); }
    catch(e){ alert(e?.message || "No se pudo asignar"); }
  }
  async function cambiarEstado(id){
    const s = window.prompt("Nuevo estado (PEND_VALID, ASIGNADA, EN_CURSO, CERRADA, CANCELADA):");
    if(!s) return;
    try { await GruasAPI?.cambiarEstadoSolicitud?.(id, s); await load(); }
    catch(e){ alert(e?.message || "No se pudo cambiar el estado"); }
  }
  async function cerrar(id){
    if(!window.confirm("¿Cerrar la solicitud?")) return;
    try { await GruasAPI?.cerrarSolicitud?.(id); await load(); }
    catch(e){ alert(e?.message || "No se pudo cerrar"); }
  }
  function whatsapp(id, it){
    const url = GruasAPI?.whatsappURL?.(id);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else {
      const phone = (it?.telefono || it?.cliente_telefono || "").replace(/[^0-9]/g,"");
      if (phone) window.open(`https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
    }
  }

  // --------- Derivados ----------
  const exportURL = GruasAPI.exportarExcelURL?.({ estado, q, ordering }) || "#";
  const estados = useMemo(() => ["", "PEND_VALID", "ASIGNADA", "EN_CURSO", "CERRADA", "CANCELADA"], []);
  const startIdx = items.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(startIdx + items.length - 1, total || 0);
  const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / (Number(pageSize) || 1)));

  return (
    <div className="rounded shadow bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {estados.map((e) => (
            <button
              key={e || "ALL"}
              onClick={() => { setEstado(e); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                estado === e ? "bg-white/10 text-white ring-1 ring-white/20"
                              : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
              aria-pressed={estado === e}
            >
              {e ? ({
                PEND_VALID: "Pendiente",
                ASIGNADA: "Asignada",
                EN_CURSO: "En curso",
                CERRADA: "Cerrada",
                CANCELADA: "Cancelada",
              }[e]) : "Todos"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <input
              className="w-full pl-3 pr-9 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
              placeholder="Buscar por cliente, patente o #ID"
              value={qLocal}
              onChange={(e)=>setQLocal(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==="Enter") setQ(qLocal); }}
              aria-label="Buscar solicitudes"
            />
            {qLocal && (
              <button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                onClick={()=>{ setQLocal(""); setQ(""); setPage(1); }}
                aria-label="Limpiar búsqueda"
                title="Limpiar"
              >
                <HiX />
              </button>
            )}
          </div>

          <button
            className={`px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 ${status==="loading" ? "opacity-70" : ""}`}
            onClick={load}
            disabled={status==="loading"}
            title="Refrescar"
          >
            <HiRefresh className={`inline-block -mt-0.5 ${status==="loading" ? "animate-spin" : ""}`} /> Refrescar
          </button>

          <a
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
            href={exportURL}
            target="_blank"
            rel="noreferrer"
            title="Exportar a Excel"
          >
            <HiDownload className="inline-block -mt-0.5" /> Exportar
          </a>
        </div>
      </div>

      {/* Estado de carga */}
      {status === "loading" && (
        <div className="px-4 py-2 text-sm text-blue-300">Cargando solicitudes…</div>
      )}
      {status === "error" && (
        <div className="px-4 py-2 text-sm text-red-300 bg-red-900/30 border-y border-red-800">
          {error} — <button className="underline" onClick={load}>Reintentar</button>
        </div>
      )}

      {/* Tabla (md+) */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr className="text-xs uppercase tracking-wide text-gray-300">
              <SortHeader label="#" field="id" ordering={ordering} onOrderingChange={setOrdering} />
              <SortHeader label="Fecha" field="fecha" ordering={ordering} onOrderingChange={setOrdering} />
              <SortHeader label="Cliente" field="cliente__apellido" ordering={ordering} onOrderingChange={setOrdering} />
              <SortHeader label="Póliza" field="poliza_numero" ordering={ordering} onOrderingChange={setOrdering} />
              <SortHeader label="Patente" field="patente" ordering={ordering} onOrderingChange={setOrdering} />
              <SortHeader label="Estado" field="estado" ordering={ordering} onOrderingChange={setOrdering} className="text-center" />
              <SortHeader label="Proveedor" field="proveedor__nombre" ordering={ordering} onOrderingChange={setOrdering} />
              <th className="p-3 border-b border-gray-700 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, idx) => {
              const meta = STATUS_META[s.estado] || STATUS_META.DEFAULT;
              return (
                <tr
                  key={s.id}
                  className={`hover:bg-gray-800 transition-colors ${idx % 2 === 0 ? "bg-gray-900" : "bg-gray-900/80"}`}
                >
                  <td className="p-3 border-b border-gray-800 font-medium">#{s.id}</td>
                  <td className="p-3 border-b border-gray-800">{fmtDate(s.fecha || s.created_at)}</td>

                  <td className="p-3 border-b border-gray-800">
                    <div className="font-medium">{s.cliente_nombre || s.cliente || "-"}</div>
                    {s.cliente_dni && <div className="text-xs text-gray-400">{s.cliente_dni}</div>}
                  </td>

                  <td className="p-3 border-b border-gray-800">
                    {s.poliza_numero || s.poliza || "-"}
                  </td>

                  <td className="p-3 border-b border-gray-800">
                    {s.patente || "-"}
                  </td>

                  <td className="p-3 border-b border-gray-800 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${meta.cls}`}>
                      {meta.label}{s.subestado ? ` · ${s.subestado}` : ""}
                    </span>
                  </td>

                  <td className="p-3 border-b border-gray-800">
                    {s.proveedor_nombre || s.proveedor || "-"}
                  </td>

                  <td className="p-3 border-b border-gray-800 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
                        onClick={()=>validar(s.id)}
                        title="Validar fotos"
                      >
                        Validar
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
                        onClick={()=>asignar(s.id)}
                        title="Asignar proveedor"
                      >
                        Asignar
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
                        onClick={()=>cambiarEstado(s.id)}
                        title="Cambiar estado"
                      >
                        Estado
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
                        onClick={()=>cerrar(s.id)}
                        title="Cerrar solicitud"
                      >
                        Cerrar
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition"
                        onClick={()=>whatsapp(s.id, s)}
                        title="Enviar WhatsApp"
                        aria-label="Enviar WhatsApp"
                      >
                        <HiChat className="inline -mt-0.5" /> WhatsApp
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-400">
                  Sin datos. Probá{" "}
                  <button className="underline" onClick={()=>{ setEstado(""); setQLocal(""); setQ(""); setPage(1); }}>
                    limpiar filtros
                  </button>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lista responsiva (mobile) */}
      <div className="md:hidden divide-y divide-gray-800">
        {items.length > 0 ? items.map((s) => {
          const meta = STATUS_META[s.estado] || STATUS_META.DEFAULT;
          return (
            <div key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-300">#{s.id}</div>
                  <div className="font-semibold">{s.cliente_nombre || s.cliente || "-"}</div>
                  <div className="text-xs text-gray-400">{fmtDate(s.fecha || s.created_at)}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${meta.cls}`}>
                  {meta.label}{s.subestado ? ` · ${s.subestado}` : ""}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-400">Póliza</div>
                  <div>{s.poliza_numero || s.poliza || "-"}</div>
                </div>
                <div>
                  <div className="text-gray-400">Patente</div>
                  <div>{s.patente || "-"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-400">Proveedor</div>
                  <div>{s.proveedor_nombre || s.proveedor || "-"}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm transition" onClick={()=>validar(s.id)}>Validar</button>
                <button className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm transition" onClick={()=>asignar(s.id)}>Asignar</button>
                <button className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm transition" onClick={()=>cambiarEstado(s.id)}>Estado</button>
                <button className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm transition" onClick={()=>cerrar(s.id)}>Cerrar</button>
                <button className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm transition" onClick={()=>whatsapp(s.id, s)}>
                  <HiChat className="inline -mt-0.5" /> WhatsApp
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="py-6 text-center text-gray-400">Sin datos.</div>
        )}
      </div>

      {/* Footer de paginación */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="text-sm text-gray-300">
          Mostrando <strong>{startIdx || 0}</strong>–<strong>{endIdx || 0}</strong> de{" "}
          <strong>{total || 0}</strong>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 disabled:opacity-40"
            title="Primera página"
          >
            «
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 disabled:opacity-40"
            title="Página anterior"
          >
            ‹
          </button>
          <span className="text-sm text-gray-300 px-2">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 disabled:opacity-40"
            title="Página siguiente"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-700 disabled:opacity-40"
            title="Última página"
          >
            »
          </button>

          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="ml-2 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm"
            title="Tamaño de página"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / pág.</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
