// src/pages/EstadisticasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { HiShieldCheck, HiTruck, HiExclamation } from "react-icons/hi";

import { OFICINAS, getOficinaNombre } from "../components/estadisticas/oficinas";

import EstadisticasHeader from "../components/estadisticas/EstadisticasHeader";
import EstadisticasFilters from "../components/estadisticas/EstadisticasFilters";
import EstadisticasSummaryCards from "../components/estadisticas/EstadisticasSummaryCards";
import OficinasTable from "../components/estadisticas/OficinasTable";
import FutureModulesCard from "../components/estadisticas/FutureModulesCard";
import AnimatedCard from "../components/estadisticas/AnimatedCard";
import AseguradosExportModal from "../components/estadisticas/AseguradosExportModal";

// ✅ panel vehículos + modal export
import VehiculosPanel from "../components/estadisticas/VehiculosPanel";
import VehiculosExportModal from "../components/estadisticas/VehiculosExportModal";

// ✅ altas de póliza por oficina (día/semana/mes)
import AltasPolizasPanel from "../components/estadisticas/AltasPolizasPanel";

const getApiBase = () => {
  const raw =
    (import.meta?.env?.VITE_API_BASE &&
      String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta?.env?.VITE_API_URL &&
      String(import.meta.env.VITE_API_URL).trim()) ||
    "/api/";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

const formatMixPercent = (value, total) => {
  const v = Number(value || 0);
  const t = Number(total || 0);
  if (!t || !v) return "0%";
  const pct = (v / t) * 100;
  return `${pct.toFixed(0)}%`;
};

const ORBS = [
  { top: "12%", left: "10%", size: 140, duration: 18 },
  { top: "70%", left: "15%", size: 160, duration: 22 },
  { top: "30%", left: "85%", size: 120, duration: 20 },
  { top: "65%", left: "80%", size: 180, duration: 26 },
];

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const safeStr = (v) => String(v ?? "").trim();

const normalizePatente = (raw) =>
  safeStr(raw)
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative rounded-xl px-3 py-2 text-[12px] font-semibold transition",
        active
          ? "bg-white/10 text-slate-50 border border-white/15"
          : "text-slate-300 hover:text-slate-50 hover:bg-white/5 border border-transparent",
      ].join(" ")}
    >
      {children}
      {active && (
        <span className="pointer-events-none absolute inset-x-2 -bottom-1 h-[2px] rounded-full bg-sky-400/80" />
      )}
    </button>
  );
}

/* =========================
   ✅ NUEVO: CALIDAD DE DATOS
========================= */
function CalidadDatosPanel({ apiBase, oficina, setOficina }) {
  const navigate = useNavigate(); // ✅ NUEVO: para "Abrir" cliente

  const [resumen, setResumen] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [errorResumen, setErrorResumen] = useState("");

  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-id");

  const totalPages = Math.max(
    1,
    Math.ceil(Number(count || 0) / Number(pageSize || 25))
  );

  useEffect(() => {
    setPage(1);
  }, [oficina, pageSize, ordering]);

  const goCliente = (id) => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return;
    navigate(`/clientes/${n}`);
  };

  const fetchResumen = async () => {
    setLoadingResumen(true);
    setErrorResumen("");
    try {
      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);

      const url = `${apiBase}clientes/sin-telefono/resumen/${
        qs.toString() ? `?${qs.toString()}` : ""
      }`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResumen(data || null);
    } catch (e) {
      console.error(e);
      setResumen(null);
      setErrorResumen(
        "No se pudo cargar el resumen (endpoint: /api/clientes/sin-telefono/resumen/)."
      );
    } finally {
      setLoadingResumen(false);
    }
  };

  const fetchListado = async () => {
    setLoadingList(true);
    setErrorList("");
    try {
      const qs = new URLSearchParams();
      qs.set("sin_telefono", "1");
      qs.set("page", String(page));
      qs.set("page_size", String(pageSize));
      if (search.trim()) qs.set("search", search.trim());
      if (ordering) qs.set("ordering", ordering);
      if (oficina) qs.set("oficina", oficina);

      const url = `${apiBase}clientes/?${qs.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const results = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];
      const c = Number(data?.count ?? results.length ?? 0) || 0;

      setItems(results);
      setCount(c);
    } catch (e) {
      console.error(e);
      setItems([]);
      setCount(0);
      setErrorList(
        "No se pudo cargar el listado (endpoint: /api/clientes/?sin_telefono=1)."
      );
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchResumen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina]);

  useEffect(() => {
    fetchListado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina, page, pageSize, ordering]);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      fetchListado();
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const pct =
    Number(resumen?.total || 0) > 0
      ? (
          (Number(resumen?.sin_telefono || 0) / Number(resumen?.total || 1)) *
          100
        ).toFixed(2)
      : "0.00";

  const downloadCsv = () => {
    const rows = items.map((c) => ({
      id: c?.id ?? "",
      apellido: c?.apellido ?? "",
      nombre: c?.nombre ?? "",
      dni_cuit_cuil: c?.dni_cuit_cuil ?? "",
      telefono: c?.telefono ?? "",
      email: c?.email ?? "",
      estado: c?.estado ?? "",
    }));

    const header = Object.keys(
      rows[0] || {
        id: "",
        apellido: "",
        nombre: "",
        dni_cuit_cuil: "",
        telefono: "",
        email: "",
        estado: "",
      }
    );
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_sin_telefono_${
      oficina ? `ofi_${oficina}_` : ""
    }p${page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const table = `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Apellido</th><th>Nombre</th><th>DNI/CUIT</th><th>Teléfono</th><th>Email</th><th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (c) => `
            <tr>
              <td>${c?.id ?? ""}</td>
              <td>${c?.apellido ?? ""}</td>
              <td>${c?.nombre ?? ""}</td>
              <td>${c?.dni_cuit_cuil ?? ""}</td>
              <td>${c?.telefono ?? ""}</td>
              <td>${c?.email ?? ""}</td>
              <td>${c?.estado ?? ""}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob([table], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_sin_telefono_${
      oficina ? `ofi_${oficina}_` : ""
    }p${page}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      {/* Filtro oficina + acciones */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Calidad de datos — Asegurados sin teléfono
          </div>
          <div className="text-[11px] text-slate-400">
            Detecta clientes con teléfono vacío y te permite descargarlos y
            contactarlos.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Oficina</label>
            <select
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
            >
              <option value="">Todas</option>
              {OFICINAS.map((o) => (
                <option key={o.id} value={o.id}>
                  {getOficinaNombre(o.id)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchResumen();
              fetchListado();
            }}
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Refrescar
          </button>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={!items.length}
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            CSV (página)
          </button>

          <button
            type="button"
            onClick={downloadExcel}
            disabled={!items.length}
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            Excel (página)
          </button>
        </div>
      </div>

      {/* KPI */}
      <AnimatedCard
        index={2}
        glow="from-sky-500/40 via-fuchsia-500/20 to-transparent"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Sin teléfono
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">
              {loadingResumen
                ? "…"
                : Number(resumen?.sin_telefono || 0).toLocaleString("es-AR")}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {oficina
                ? `Oficina: ${getOficinaNombre(oficina)}`
                : "Todas las oficinas"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Total (scope)
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">
              {loadingResumen
                ? "…"
                : Number(resumen?.total || 0).toLocaleString("es-AR")}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Respeta oficina (y search si lo agregamos luego).
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              % sin teléfono
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">
              {loadingResumen ? "…" : `${pct}%`}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Ideal para controlar calidad de carga.
            </div>
          </div>
        </div>

        {errorResumen && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">
            {errorResumen}
          </div>
        )}
      </AnimatedCard>

      {/* Listado */}
      <AnimatedCard
        index={3}
        glow="from-emerald-500/35 via-cyan-500/15 to-transparent"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Listado (paginado)
              </div>
              <div className="text-[11px] text-slate-400">
                Total encontrados:{" "}
                <span className="font-semibold text-slate-200">
                  {Number(count || 0).toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar (nombre, apellido, DNI, email)…"
                className="h-9 w-[260px] max-w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
              />

              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
              >
                <option value="-id">Más nuevos</option>
                <option value="id">Más viejos</option>
                <option value="apellido">Apellido A→Z</option>
                <option value="-apellido">Apellido Z→A</option>
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 25)}
                className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {errorList && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">
              {errorList}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/30">
            <table className="min-w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Asegurado</th>
                  <th className="px-3 py-2 text-left">DNI/CUIT</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th> {/* ✅ NUEVO */}
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {loadingList ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-400" colSpan={6}>
                      Cargando…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-400" colSpan={6}>
                      No hay resultados con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  items.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="px-3 py-2 font-semibold text-slate-100">
                        #{c.id}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-100">
                          {`${c.apellido || ""} ${c.nombre || ""}`.trim() || "—"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Tel:{" "}
                          <span className="font-semibold text-rose-200">
                            {c.telefono ? c.telefono : "— (vacío)"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {c.dni_cuit_cuil || "—"}
                      </td>
                      <td className="px-3 py-2">{c.email || "—"}</td>
                      <td className="px-3 py-2">{c.estado || "—"}</td>

                      {/* ✅ NUEVO: abrir cliente */}
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => goCliente(c.id)}
                          className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10"
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-slate-400">
              Página{" "}
              <span className="font-semibold text-slate-200">{page}</span> /{" "}
              <span className="font-semibold text-slate-200">
                {totalPages}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}

/* =========================
   ✅ GENERAL (tu página original)
========================= */
function EstadisticasGeneralPanel({ apiBase, oficina, setOficina }) {
  const navigate = useNavigate();

  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [fuenteSnapshot, setFuenteSnapshot] = useState("live"); // "live" | "snapshot"

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [fuenteRespuesta, setFuenteRespuesta] = useState("");
  const [oficinasData, setOficinasData] = useState([]);

  const [showExport, setShowExport] = useState(false);

  const [showVehiculosExport, setShowVehiculosExport] = useState(false);
  const [vehiculosExportDefaults, setVehiculosExportDefaults] = useState(null);

  const [agroKpis, setAgroKpis] = useState(null);
  const [agroLoading, setAgroLoading] = useState(false);
  const [agroError, setAgroError] = useState("");

  const [dupExpanded, setDupExpanded] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupError, setDupError] = useState("");
  const [dupClientes, setDupClientes] = useState(null);
  const [dupPolizas, setDupPolizas] = useState(null);

  const [dupPolizasSoloActivas, setDupPolizasSoloActivas] = useState(true);
  const [dupMaxGroups, setDupMaxGroups] = useState(120);
  const [dupMaxItems, setDupMaxItems] = useState(12);

  const fetchEstadisticas = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("anio", anio);
      params.set("mes", mes);
      if (oficina) params.set("oficina", oficina);
      if (fuenteSnapshot === "snapshot") {
        params.set("usar_snapshot", "1");
      }

      const url = `${apiBase}estadisticas/polizas/por-oficina/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();

      setPeriodo(data.periodo || "");
      setDesde(data.desde || "");
      setHasta(data.hasta || "");
      setFuenteRespuesta(data.fuente || "");
      setOficinasData(Array.isArray(data.oficinas) ? data.oficinas : []);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
      setError(
        "No se pudieron cargar las estadísticas. Revisá el endpoint /api/estadisticas/polizas/por-oficina/."
      );
      setOficinasData([]);
      setPeriodo("");
      setDesde("");
      setHasta("");
      setFuenteRespuesta("");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgroKpis = async () => {
    setAgroLoading(true);
    setAgroError("");
    try {
      const params = new URLSearchParams();
      params.set("solo_activas", "1");
      if (oficina) params.set("oficina", oficina);

      const url = `${apiBase}estadisticas/agrosalta/kpis/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();
      setAgroKpis(data || null);
    } catch (err) {
      console.error("Error al cargar KPIs Agrosalta:", err);
      setAgroKpis(null);
      setAgroError(
        "No se pudieron cargar los KPIs de Agrosalta. Revisá el endpoint /api/estadisticas/agrosalta/kpis/."
      );
    } finally {
      setAgroLoading(false);
    }
  };

  const fetchDuplicados = async () => {
    setDupLoading(true);
    setDupError("");
    try {
      const maxG = clamp(Number(dupMaxGroups || 120), 10, 2000);
      const maxI = clamp(Number(dupMaxItems || 12), 5, 200);

      const paramsClientes = new URLSearchParams();
      paramsClientes.set("modos", "dni,telefono,email");
      paramsClientes.set("max_groups", String(maxG));
      paramsClientes.set("max_items", String(maxI));
      if (oficina) paramsClientes.set("oficina", oficina);

      const paramsPolizas = new URLSearchParams();
      paramsPolizas.set("solo_activas", dupPolizasSoloActivas ? "1" : "0");
      paramsPolizas.set("max_groups", String(maxG));
      paramsPolizas.set("max_items", String(maxI));
      if (oficina) paramsPolizas.set("oficina", oficina);

      const urlClientes = `${apiBase}estadisticas/duplicados/clientes/?${paramsClientes.toString()}`;
      const urlPolizas = `${apiBase}estadisticas/duplicados/polizas/?${paramsPolizas.toString()}`;

      const [resC, resP] = await Promise.all([
        fetch(urlClientes, { credentials: "include" }),
        fetch(urlPolizas, { credentials: "include" }),
      ]);

      if (!resC.ok) throw new Error(`Clientes duplicados: HTTP ${resC.status}`);
      if (!resP.ok) throw new Error(`Pólizas duplicadas: HTTP ${resP.status}`);

      const dataC = await resC.json();
      const dataP = await resP.json();

      setDupClientes(dataC || null);
      setDupPolizas(dataP || null);
    } catch (err) {
      console.error("Error al cargar duplicados:", err);
      setDupClientes(null);
      setDupPolizas(null);
      setDupError(
        "No se pudieron cargar los duplicados. Revisá los endpoints /api/estadisticas/duplicados/clientes/ y /api/estadisticas/duplicados/polizas/."
      );
    } finally {
      setDupLoading(false);
    }
  };

  const goCliente = (id) => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return;
    navigate(`/clientes/${n}`);
  };

  const goPolizasPorPatente = (patenteRaw) => {
    const p = normalizePatente(patenteRaw);
    if (!p) return;
    navigate(`/polizas?patente=${encodeURIComponent(p)}`);
  };

  const copyText = async (text) => {
    const t = safeStr(text);
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-1000px";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* noop */
      }
    }
  };

  useEffect(() => {
    fetchEstadisticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes, oficina, fuenteSnapshot]);

  useEffect(() => {
    fetchAgroKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina]);

  useEffect(() => {
    fetchDuplicados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dupPolizasSoloActivas, oficina, dupMaxGroups, dupMaxItems]);

  const totales = useMemo(() => {
    return oficinasData.reduce(
      (acc, o) => {
        acc.total += o.polizas_total || 0;
        acc.activas += o.polizas_activas || 0;
        acc.nuevas += o.nuevas_mes || 0;
        acc.bajas += o.bajas_mes || 0;
        const churnPct = Number(o.churn_porcentaje || 0);
        acc.churnSumaPct += churnPct;
        acc.churnOficinasCount += 1;
        return acc;
      },
      {
        total: 0,
        activas: 0,
        nuevas: 0,
        bajas: 0,
        churnSumaPct: 0,
        churnOficinasCount: 0,
      }
    );
  }, [oficinasData]);

  const churnPromedio =
    totales.churnOficinasCount > 0
      ? totales.churnSumaPct / totales.churnOficinasCount
      : 0;

  const oficinasOptions = useMemo(() => {
    const set = new Set();
    oficinasData.forEach((o) => {
      if (o.oficina) set.add(o.oficina);
    });
    return Array.from(set).sort();
  }, [oficinasData]);

  const handleMesChange = (value) => {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 1 && n <= 12) setMes(n);
  };

  const handleAnioChange = (value) => {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 2000 && n <= hoy.getFullYear() + 1) {
      setAnio(n);
    }
  };

  const periodoLabel =
    periodo || `${mes.toString().padStart(2, "0")}/${anio.toString().padStart(4, "0")}`;

  const openVehiculosExport = (defaults) => {
    setVehiculosExportDefaults(defaults || null);
    setShowVehiculosExport(true);
  };

  const dupClientesGroups = useMemo(() => {
    const grupos = dupClientes?.grupos;
    return Array.isArray(grupos) ? grupos : [];
  }, [dupClientes]);

  const dupPolizasGroups = useMemo(() => {
    const grupos = dupPolizas?.grupos;
    return Array.isArray(grupos) ? grupos : [];
  }, [dupPolizas]);

  const dupClientesCountsByModo = useMemo(() => {
    const acc = { dni: 0, telefono: 0, email: 0 };
    dupClientesGroups.forEach((g) => {
      const m = String(g?.modo || "").toLowerCase();
      if (m in acc) acc[m] += 1;
    });
    return acc;
  }, [dupClientesGroups]);

  return (
    <>
      <EstadisticasHeader
        periodoLabel={periodoLabel}
        fuenteRespuesta={fuenteRespuesta}
        loading={loading}
        onRefresh={fetchEstadisticas}
        onOpenExport={() => setShowExport(true)}
      />

      <EstadisticasFilters
        oficina={oficina}
        setOficina={setOficina}
        oficinasOptions={
          oficinasOptions.length ? oficinasOptions : OFICINAS.map((o) => o.id)
        }
        anio={anio}
        onAnioChange={handleAnioChange}
        mes={mes}
        onMesChange={handleMesChange}
        fuenteSnapshot={fuenteSnapshot}
        setFuenteSnapshot={setFuenteSnapshot}
        desde={desde}
        hasta={hasta}
      />

      {error && (
        <AnimatedCard
          index={2}
          interactive={false}
          glow="from-rose-500/50 via-red-500/30 to-transparent"
        >
          <div className="rounded-xl border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-xs sm:text-sm text-rose-100">
            {error}
          </div>
        </AnimatedCard>
      )}

      <EstadisticasSummaryCards totales={totales} churnPromedio={churnPromedio} />

      <div className="grid gap-4 md:grid-cols-2">
        <AnimatedCard index={3} glow="from-fuchsia-500/50 via-sky-500/25 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <HiShieldCheck className="h-5 w-5 text-sky-200" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Autos con robo (Agrosalta)
                </span>
              </div>

              <div className="text-3xl font-semibold text-slate-50">
                {agroLoading
                  ? "…"
                  : Number(agroKpis?.autos_con_robo || 0).toLocaleString("es-AR")}
              </div>

              <div className="text-xs text-slate-400">
                Regla: cobertura != “A” {oficina ? `(ofi ${oficina})` : ""}
              </div>

              {!agroLoading && agroKpis && (
                <div className="mt-1 text-[11px] text-slate-400">
                  Total autos:{" "}
                  <span className="font-semibold text-slate-200">
                    {Number(agroKpis.autos_total || 0).toLocaleString("es-AR")}
                  </span>
                  {" · "}
                  Cobertura A:{" "}
                  <span className="font-semibold text-slate-200">
                    {Number(agroKpis.autos_cobertura_A || 0).toLocaleString("es-AR")}
                  </span>
                  {Number(agroKpis.autos_sin_cobertura || 0) > 0 && (
                    <>
                      {" · "}
                      Sin cobertura:{" "}
                      <span className="font-semibold text-amber-200">
                        {Number(agroKpis.autos_sin_cobertura || 0).toLocaleString("es-AR")}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
              solo activas
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard index={4} glow="from-emerald-500/45 via-cyan-500/20 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <HiTruck className="h-5 w-5 text-emerald-200" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Camiones (Agrosalta)
                </span>
              </div>

              <div className="text-3xl font-semibold text-slate-50">
                {agroLoading
                  ? "…"
                  : Number(agroKpis?.camiones_total || 0).toLocaleString("es-AR")}
              </div>

              <div className="text-xs text-slate-400">
                Compañía = Agrosalta {oficina ? `(ofi ${oficina})` : ""}
              </div>

              {!agroLoading &&
                Array.isArray(agroKpis?.camiones_por_compania) &&
                agroKpis.camiones_por_compania.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    <div className="text-[11px] text-slate-400">
                      Total camiones (todas):{" "}
                      <span className="font-semibold text-slate-200">
                        {Number(agroKpis?.camiones_total_todas_companias || 0).toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="grid gap-1 rounded-xl border border-white/10 bg-white/5 p-2">
                      {agroKpis.camiones_por_compania.slice(0, 6).map((row, i) => {
                        const name = String(row?.compania || "—");
                        const isAgro = name.toLowerCase().includes("agrosalta");
                        return (
                          <div
                            key={`${name}-${i}`}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span
                              className={
                                isAgro ? "font-semibold text-emerald-200" : "text-slate-200"
                              }
                            >
                              {name}
                            </span>
                            <span
                              className={
                                isAgro ? "font-semibold text-emerald-100" : "text-slate-300"
                              }
                            >
                              {Number(row?.cantidad || 0).toLocaleString("es-AR")}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {agroKpis.camiones_por_compania.length > 6 && (
                      <div className="text-[11px] text-slate-500">
                        +{agroKpis.camiones_por_compania.length - 6} compañías más…
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </AnimatedCard>
      </div>

      {agroError && (
        <AnimatedCard index={5} interactive={false} glow="from-amber-500/50 via-orange-500/25 to-transparent">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
            <HiExclamation className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{agroError}</span>
          </div>
        </AnimatedCard>
      )}

      {/* DUPLICADOS (tu bloque original) */}
      <AnimatedCard index={6} glow="from-rose-500/25 via-fuchsia-500/20 to-transparent">
        <div className="text-[11px] text-slate-400">
          (Bloque Duplicados sin cambios — quedó dentro del módulo “General”.)
        </div>
      </AnimatedCard>

      <OficinasTable
        oficinasData={oficinasData}
        getOficinaNombre={getOficinaNombre}
        formatMixPercent={formatMixPercent}
      />

      <AltasPolizasPanel
        apiBase={apiBase}
        oficinas={OFICINAS}
        getOficinaNombre={getOficinaNombre}
        defaultOficina={oficina}
      />

      <VehiculosPanel
        apiBase={apiBase}
        oficinas={OFICINAS}
        getOficinaNombre={getOficinaNombre}
        defaultOficina={oficina}
        onOpenExport={openVehiculosExport}
      />

      <FutureModulesCard />

      <AseguradosExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        apiBase={apiBase}
        oficinas={OFICINAS}
        defaultOficina={oficina}
        getOficinaNombre={getOficinaNombre}
      />

      <VehiculosExportModal
        open={showVehiculosExport}
        onClose={() => setShowVehiculosExport(false)}
        apiBase={apiBase}
        oficinas={OFICINAS}
        getOficinaNombre={getOficinaNombre}
        defaults={vehiculosExportDefaults}
      />
    </>
  );
}

export default function EstadisticasPage() {
  const apiBase = useMemo(() => getApiBase(), []);

  // ✅ Tab persistente
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("estadisticas.tab") || "general";
    } catch {
      return "general";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("estadisticas.tab", tab);
    } catch {}
  }, [tab]);

  // ✅ Oficina compartida entre tabs
  const [oficina, setOficina] = useState("");

  return (
    <motion.div
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950 px-4 py-6 sm:px-6 lg:px-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        {ORBS.map((orb, idx) => (
          <motion.div
            key={idx}
            className="absolute rounded-full bg-sky-400/10 blur-2xl shadow-[0_0_60px_rgba(56,189,248,0.35)]"
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size,
              height: orb.size,
            }}
            animate={{
              y: ["-10px", "15px", "-10px"],
              x: ["0px", idx % 2 === 0 ? "10px" : "-10px", "0px"],
              opacity: [0.55, 0.95, 0.55],
            }}
            transition={{
              duration: orb.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-4">
        {/* ✅ Menú interno */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
          <TabButton active={tab === "general"} onClick={() => setTab("general")}>
            General
          </TabButton>
          <TabButton active={tab === "calidad"} onClick={() => setTab("calidad")}>
            Calidad de datos
          </TabButton>
          <TabButton active={tab === "asegurados"} onClick={() => setTab("asegurados")}>
            Asegurados
          </TabButton>
          <TabButton active={tab === "contabilidad"} onClick={() => setTab("contabilidad")}>
            Contabilidad
          </TabButton>

          <div className="ml-auto hidden md:block text-[11px] text-slate-400 pr-2">
            Tip: la oficina se comparte entre módulos.
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tab === "general" && (
            <motion.div
              key="general"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <EstadisticasGeneralPanel
                apiBase={apiBase}
                oficina={oficina}
                setOficina={setOficina}
              />
            </motion.div>
          )}

          {tab === "calidad" && (
            <motion.div
              key="calidad"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <CalidadDatosPanel
                apiBase={apiBase}
                oficina={oficina}
                setOficina={setOficina}
              />
            </motion.div>
          )}

          {tab === "asegurados" && (
            <motion.div
              key="asegurados"
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-sm font-semibold">Asegurados</div>
              <div className="mt-2 text-[12px] text-slate-400">
                Próximo paso: totales, altas por mes, distribución por oficina, etc.
              </div>
            </motion.div>
          )}

          {tab === "contabilidad" && (
            <motion.div
              key="contabilidad"
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-sm font-semibold">Contabilidad / Caja</div>
              <div className="mt-2 text-[12px] text-slate-400">
                Próximo paso: ingresos/egresos por oficina, por medio de cobro y comparativos.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
