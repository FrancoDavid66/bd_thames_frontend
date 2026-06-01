// src/components/estadisticas/CalidadDatosPanel.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  HiUserGroup, HiShieldExclamation, HiExclamationCircle,
  HiRefresh, HiSearch, HiChevronLeft, HiChevronRight,
  HiDownload, HiArrowRight, HiPhone, HiMail, HiIdentification,
  HiCake, HiHome, HiLocationMarker, HiPhotograph, HiClipboardList,
} from "react-icons/hi";

const token = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => (token() ? { Authorization: `Bearer ${token()}` } : {});

const vacio = (v) => v === null || v === undefined || String(v).trim() === "";

/* ──────────────────────────────────────────────────────────────
   CAMPOS DEL CLIENTE QUE AUDITAMOS.
   - key     → coincide con la clave del resumen del backend (sin_<key>)
   - short   → etiqueta corta para los chips de "Qué le falta"
   - getter  → cómo leer el valor real del cliente
   Si mañana agregás "partido", lo sumás acá y al backend, nada más.
   ────────────────────────────────────────────────────────────── */
const CAMPOS_CLIENTE = [
  { key: "telefono",         label: "Sin teléfono",      short: "teléfono",   icon: HiPhone,          color: "text-rose-400",    bg: "bg-rose-500/8 border-rose-500/20",       getter: (c) => c.telefono },
  { key: "email",            label: "Sin email",         short: "email",      icon: HiMail,           color: "text-pink-400",    bg: "bg-pink-500/8 border-pink-500/20",       getter: (c) => c.email },
  { key: "dni",              label: "Sin DNI/CUIT",      short: "DNI",        icon: HiIdentification, color: "text-fuchsia-400", bg: "bg-fuchsia-500/8 border-fuchsia-500/20", getter: (c) => c.dni_cuit_cuil },
  { key: "fecha_nacimiento", label: "Sin fecha de nac.", short: "fecha nac.", icon: HiCake,           color: "text-violet-400",  bg: "bg-violet-500/8 border-violet-500/20",   getter: (c) => c.fecha_nacimiento },
  { key: "direccion",        label: "Sin dirección",     short: "dirección",  icon: HiHome,           color: "text-indigo-400",  bg: "bg-indigo-500/8 border-indigo-500/20",   getter: (c) => c.direccion },
  { key: "localidad",        label: "Sin localidad",     short: "localidad",  icon: HiLocationMarker, color: "text-sky-400",     bg: "bg-sky-500/8 border-sky-500/20",         getter: (c) => c.localidad },
  { key: "dni_frente",       label: "Sin DNI frente",    short: "DNI frente", icon: HiPhotograph,     color: "text-amber-400",   bg: "bg-amber-500/8 border-amber-500/20",     getter: (c) => c.archivo_dni_frente || c.archivo_dni },
  { key: "dni_dorso",        label: "Sin DNI dorso",     short: "DNI dorso",  icon: HiPhotograph,     color: "text-orange-400",  bg: "bg-orange-500/8 border-orange-500/20",   getter: (c) => c.archivo_dni_dorso },
];

// KPIs de pólizas (vienen del endpoint de estadísticas, no se pueden clickear)
const CAMPOS_POLIZA = [
  { key: "sin_patente",  label: "Pólizas sin patente",  icon: HiShieldExclamation, color: "text-orange-400", bg: "bg-orange-500/8 border-orange-500/20" },
  { key: "sin_vehiculo", label: "Pólizas sin vehículo", icon: HiExclamationCircle, color: "text-amber-400",  bg: "bg-amber-500/8 border-amber-500/20" },
  { key: "sin_compania", label: "Pólizas sin compañía", icon: HiExclamationCircle, color: "text-slate-400",  bg: "bg-slate-700/30 border-slate-700" },
];

const labelPorKey = (key) =>
  key === "incompleto"
    ? "Incompletos (les falta algo)"
    : CAMPOS_CLIENTE.find((c) => c.key === key)?.label || "Datos faltantes";

// Devuelve la lista de campos que le faltan a un cliente (los buchonea todos)
const faltantesDe = (c) => CAMPOS_CLIENTE.filter((campo) => vacio(campo.getter(c)));

export default function CalidadDatosPanel({ apiBase, oficina, getOficinaNombre, anio, mes }) {
  const navigate = useNavigate();

  const [kpis, setKpis] = useState({});
  const [loadingKpis, setLoadingKpis] = useState(false);

  // Campo que se muestra en la tabla: una key de CAMPOS_CLIENTE o "incompleto"
  const [campoActivo, setCampoActivo] = useState("incompleto");

  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const fetchKpis = async () => {
    setLoadingKpis(true);
    try {
      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);
      const r1 = await fetch(`${apiBase}clientes/calidad/resumen/?${qs}`, { headers: authH() });
      const d1 = r1.ok ? await r1.json() : {};

      const p = new URLSearchParams({ anio, mes });
      if (oficina) p.set("oficina", oficina);
      const r2 = await fetch(`${apiBase}estadisticas/polizas/por-oficina/?${p}`, { headers: authH() });
      const d2 = r2.ok ? await r2.json() : {};
      const totPol = (d2.oficinas || []).reduce(
        (acc, o) => {
          const c = o.calidad_datos || {};
          acc.sin_patente += c.sin_patente || 0;
          acc.sin_vehiculo += c.sin_vehiculo || 0;
          acc.sin_compania += c.sin_compania || 0;
          return acc;
        },
        { sin_patente: 0, sin_vehiculo: 0, sin_compania: 0 }
      );

      setKpis({ ...d1, ...totPol });
    } catch {
      /* noop */
    } finally {
      setLoadingKpis(false);
    }
  };

  const fetchList = async () => {
    setLoadingList(true);
    try {
      const qs = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      // "incompleto" usa su propio filtro (OR de todo); el resto usa sin_<campo>
      if (campoActivo === "incompleto") qs.set("incompleto", "1");
      else qs.set(`sin_${campoActivo}`, "1");
      if (search.trim()) qs.set("search", search.trim());
      if (oficina) qs.set("oficina", oficina);
      const r = await fetch(`${apiBase}clientes/?${qs}`, { headers: authH() });
      const d = r.ok ? await r.json() : {};
      setItems(Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);
      setCount(Number(d?.count || (Array.isArray(d) ? d.length : 0)));
    } catch {
      /* noop */
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchKpis(); }, [oficina, anio, mes]);
  useEffect(() => { setPage(1); }, [oficina, search, campoActivo]);
  useEffect(() => { fetchList(); }, [oficina, page, search, campoActivo]);

  // 🔄 AUTO-REFRESCO: cuando volvés a esta pestaña/ventana (p. ej. tras editar
  // un cliente), vuelve a leer la base y actualiza KPIs + listado solo.
  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") {
        fetchKpis();
        fetchList();
      }
    };
    window.addEventListener("focus", refrescar);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      window.removeEventListener("focus", refrescar);
      document.removeEventListener("visibilitychange", refrescar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina, anio, mes, page, search, campoActivo]);

  const downloadCsv = () => {
    const h = ["ID", "Apellido", "Nombre", "DNI", "Teléfono", "Email", "Fecha Nac.", "Dirección", "Localidad", "Le falta"];
    const rows = items.map((c) =>
      [
        c.id, c.apellido, c.nombre, c.dni_cuit_cuil, c.telefono, c.email,
        c.fecha_nacimiento, c.direccion, c.localidad,
        faltantesDe(c).map((f) => f.short).join(" / "),
      ].map((v) => `"${String(v ?? "")}"`)
    );
    const csv = [h.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `calidad_${campoActivo}_p${page}.csv`;
    a.click();
  };

  const Celda = ({ value }) =>
    vacio(value)
      ? <span className="text-rose-400/70 font-medium">Falta</span>
      : <span className="text-slate-400">{value}</span>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Auditoría de calidad</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Perfiles incompletos que dificultan la gestión y el contacto
          </p>
        </div>
        <button
          onClick={() => { fetchKpis(); fetchList(); }}
          disabled={loadingKpis}
          className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
        >
          <HiRefresh className={`text-sm ${loadingKpis ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tarjeta destacada: INCOMPLETOS (les falta algo) */}
      <motion.button
        type="button"
        onClick={() => setCampoActivo("incompleto")}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full text-left rounded-2xl border p-4 transition-all bg-rose-500/8 border-rose-500/25 ${
          campoActivo === "incompleto" ? "ring-2 ring-rose-500/50" : "hover:brightness-110"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HiClipboardList className="text-rose-400 text-base shrink-0" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Clientes incompletos
              </div>
              <div className="text-[10px] text-slate-500">Les falta al menos un dato</div>
            </div>
          </div>
          <div className={`text-3xl font-light tabular-nums ${loadingKpis ? "text-slate-700" : "text-rose-400"}`}>
            {loadingKpis ? "—" : Number(kpis.incompletos || 0).toLocaleString("es-AR")}
          </div>
        </div>
      </motion.button>

      {/* KPIs de CLIENTE (clickeables) */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2 ml-0.5">
          Por dato puntual — tocá una tarjeta para filtrar el listado
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CAMPOS_CLIENTE.map((k, i) => {
            const activo = campoActivo === k.key;
            return (
              <motion.button
                key={k.key}
                type="button"
                onClick={() => setCampoActivo(k.key)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className={`text-left rounded-2xl border p-4 transition-all ${k.bg} ${
                  activo ? "ring-2 ring-sky-500/50 scale-[1.01]" : "hover:brightness-110"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <k.icon className={`text-sm shrink-0 ${k.color}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {k.label}
                  </span>
                </div>
                <div className={`text-3xl font-light tabular-nums ${loadingKpis ? "text-slate-700" : k.color}`}>
                  {loadingKpis ? "—" : Number(kpis[`sin_${k.key}`] || 0).toLocaleString("es-AR")}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* KPIs de PÓLIZA (informativos) */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2 ml-0.5">
          Datos faltantes de pólizas
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CAMPOS_POLIZA.map((k, i) => (
            <motion.div
              key={k.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className={`rounded-2xl border p-4 ${k.bg}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <k.icon className={`text-sm shrink-0 ${k.color}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {k.label}
                </span>
              </div>
              <div className={`text-3xl font-light tabular-nums ${loadingKpis ? "text-slate-700" : k.color}`}>
                {loadingKpis ? "—" : Number(kpis[k.key] || 0).toLocaleString("es-AR")}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Listado de clientes según el campo activo */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div>
            <span className="text-xs font-semibold text-slate-200">
              Clientes — {labelPorKey(campoActivo)}
            </span>
            <span className="ml-2 text-[10px] text-slate-600">
              {count.toLocaleString("es-AR")} encontrados
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 h-8 bg-slate-950 border border-slate-800 rounded-lg px-2.5">
              <HiSearch className="text-slate-600 text-xs shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-xs text-slate-300 outline-none w-32 placeholder:text-slate-700"
              />
            </div>
            <button
              onClick={downloadCsv}
              disabled={!items.length}
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors disabled:opacity-30 text-xs"
            >
              <HiDownload className="text-xs" /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Asegurado</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">DNI / CUIT</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Teléfono</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Email</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">F. Nac.</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Localidad</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Qué le falta</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loadingList ? (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-600">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600">
                  {search ? "Sin resultados para esa búsqueda." : "¡Todo en orden! No hay clientes para este filtro."}
                </td></tr>
              ) : items.map((c) => {
                const faltan = faltantesDe(c);
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-800/25 transition-colors group align-top"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-200">
                        {`${c.apellido || ""} ${c.nombre || ""}`.trim() || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums"><Celda value={c.dni_cuit_cuil} /></td>
                    <td className="px-4 py-3"><Celda value={c.telefono} /></td>
                    <td className="px-4 py-3"><Celda value={c.email} /></td>
                    <td className="px-4 py-3 tabular-nums"><Celda value={c.fecha_nacimiento} /></td>
                    <td className="px-4 py-3"><Celda value={c.localidad} /></td>
                    <td className="px-4 py-3">
                      {faltan.length === 0 ? (
                        <span className="text-emerald-400/80 font-medium text-[11px]">Completo ✓</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {faltan.map((f) => (
                            <span
                              key={f.key}
                              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${f.bg} ${f.color}`}
                            >
                              {f.short}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/clientes/${c.id}`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[10px] font-medium"
                      >
                        Ver perfil <HiArrowRight className="text-xs" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/60 bg-slate-900/40">
            <span className="text-[10px] text-slate-600">Página {page} de {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                <HiChevronLeft className="text-xs" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                <HiChevronRight className="text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}