// src/components/estadisticas/DuplicadosClientesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HiRefresh,
  HiUserGroup,
  HiIdentification,
  HiPhone,
  HiMail,
  HiOutlineClipboardCopy,
  HiArrowRight,
  HiExclamationCircle,
} from "react-icons/hi";
import * as XLSX from "xlsx";

const safeStr = (v) => String(v ?? "").trim();

const token = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => (token() ? { Authorization: `Bearer ${token()}` } : {});

const copyText = async (text) => {
  const t = safeStr(text);
  if (!t) return;
  try {
    await navigator.clipboard.writeText(t);
  } catch {}
};

// Criterios de agrupación (los que soporta el backend)
const MODOS = [
  { value: "dni", label: "Mismo DNI", icon: HiIdentification },
  { value: "telefono", label: "Mismo teléfono", icon: HiPhone },
  { value: "email", label: "Mismo email", icon: HiMail },
];

function ModoBadge({ modo }) {
  const def = MODOS.find((m) => m.value === modo) || MODOS[0];
  const Icon = def.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
      <Icon className="text-xs" />
      {def.label}
    </span>
  );
}

export default function DuplicadosClientesPanel({ apiBase, oficina, getOficinaNombre }) {
  const navigate = useNavigate();

  const [modos, setModos] = useState(["dni", "telefono", "email"]);
  const [grupos, setGrupos] = useState([]);
  const [totalGrupos, setTotalGrupos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [fusionGrupo, setFusionGrupo] = useState(null);   // grupo abierto en el modal
  const [principalSel, setPrincipalSel] = useState(null); // id del cliente que QUEDA
  const [fusionando, setFusionando] = useState(false);
  const [masivaSim, setMasivaSim] = useState(null);     // resultado de la simulación
  const [masivaLoading, setMasivaLoading] = useState(false);

  const modosParam = useMemo(() => modos.join(","), [modos]);

  const toggleModo = (value) => {
    setModos((prev) => {
      const has = prev.includes(value);
      const next = has ? prev.filter((m) => m !== value) : [...prev, value];
      // Nunca dejar vacío
      return next.length ? next : prev;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("modos", modosParam);
      qs.set("max_groups", "200");
      qs.set("max_items", "20");
      if (oficina) qs.set("oficina", oficina);

      const url = `${apiBase}estadisticas/duplicados/clientes/?${qs.toString()}`;
      const res = await fetch(url, { headers: authH() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setGrupos(Array.isArray(data?.grupos) ? data.grupos : []);
      setTotalGrupos(Number(data?.total_grupos || 0));
    } catch {
      setGrupos([]);
      setTotalGrupos(0);
      setError("No se pudieron cargar los clientes duplicados.");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Descarga TODOS los clientes duplicados (una fila por cliente).
  const descargarTodo = async () => {
    if (downloading) return;
    setDownloading(true); setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("modos", modosParam);
      qs.set("max_groups", "100000");
      qs.set("max_items", "100000");
      if (oficina) qs.set("oficina", oficina);

      const url = `${apiBase}estadisticas/duplicados/clientes/?${qs.toString()}`;
      const res = await fetch(url, { headers: authH() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const gs = Array.isArray(data?.grupos) ? data.grupos : [];

      const modoLabel = { dni: "Mismo DNI", telefono: "Mismo teléfono", email: "Mismo email" };
      const filas = [];
      gs.forEach(g => {
        const clientes = Array.isArray(g?.clientes) ? g.clientes : [];
        clientes.forEach(c => {
          filas.push({
            "Criterio": modoLabel[g?.modo] || (g?.modo || ""),
            "Clave duplicada": safeStr(g?.key) || "—",
            "ID Cliente": c?.id ?? "",
            "Apellido": c?.apellido || "",
            "Nombre": c?.nombre || "",
            "DNI/CUIT": c?.dni_cuit_cuil || "",
            "Teléfono": c?.telefono || "",
            "Email": c?.email || "",
            "Estado": c?.estado || "",
          });
        });
      });

      if (filas.length === 0) { setError("No hay clientes duplicados para descargar."); return; }

      const ws = XLSX.utils.json_to_sheet(filas);
      ws["!cols"] = [{ wch: 16 }, { wch: 24 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 26 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes duplicados");
      const hoy = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Duplicados_Clientes_${hoy}.xlsx`);
    } catch {
      setError("No se pudo generar la descarga.");
    } finally {
      setDownloading(false);
    }
  };

  // Abrir el modal de fusión para un grupo (preselecciona el cliente de menor ID)
  const abrirFusion = (g) => {
    const clientes = Array.isArray(g?.clientes) ? g.clientes : [];
    if (clientes.length < 2) return;
    const idMenor = clientes.map(c => Number(c?.id)).filter(Boolean).sort((a, b) => a - b)[0];
    setPrincipalSel(idMenor || clientes[0]?.id || null);
    setFusionGrupo(g);
  };

  // Ejecutar la fusión: el principal queda, el resto se mueve hacia él y se borra
  const ejecutarFusion = async () => {
    if (!fusionGrupo || !principalSel || fusionando) return;
    setFusionando(true); setError("");
    try {
      const clientes = Array.isArray(fusionGrupo?.clientes) ? fusionGrupo.clientes : [];
      const duplicados_ids = clientes.map(c => Number(c?.id)).filter(id => id && id !== Number(principalSel));
      const res = await fetch(`${apiBase}clientes/fusionar/`, {
        method: "POST",
        headers: { ...authH(), "Content-Type": "application/json" },
        body: JSON.stringify({ principal_id: Number(principalSel), duplicados_ids }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j?.error || msg; } catch {}
        throw new Error(msg);
      }
      setFusionGrupo(null); setPrincipalSel(null);
      await fetchData(); // refrescar lista
    } catch (e) {
      setError(`No se pudo fusionar: ${e.message || "error"}`);
    } finally {
      setFusionando(false);
    }
  };

  // Paso 1: SIMULAR la fusión masiva por DNI (no toca nada, solo informa)
  const simularMasivaDNI = async () => {
    if (masivaLoading) return;
    setMasivaLoading(true); setError("");
    try {
      const res = await fetch(`${apiBase}clientes/fusionar-dni/`, {
        method: "POST",
        headers: { ...authH(), "Content-Type": "application/json" },
        body: JSON.stringify({ simular: true, ...(oficina ? { oficina } : {}) }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j?.error || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setMasivaSim(data); // abre el modal de confirmación
    } catch (e) {
      setError(`No se pudo simular: ${e.message || "error"}`);
    } finally {
      setMasivaLoading(false);
    }
  };

  // Paso 2: EJECUTAR la fusión masiva por DNI de verdad
  const ejecutarMasivaDNI = async () => {
    if (masivaLoading) return;
    setMasivaLoading(true); setError("");
    try {
      const res = await fetch(`${apiBase}clientes/fusionar-dni/`, {
        method: "POST",
        headers: { ...authH(), "Content-Type": "application/json" },
        body: JSON.stringify({ simular: false, ...(oficina ? { oficina } : {}) }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j?.error || msg; } catch {}
        throw new Error(msg);
      }
      setMasivaSim(null);
      await fetchData(); // refrescar
    } catch (e) {
      setError(`No se pudo fusionar: ${e.message || "error"}`);
    } finally {
      setMasivaLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina, modosParam]);

  const totalClientesAfectados = useMemo(
    () => grupos.reduce((acc, g) => acc + (Number(g?.count) || 0), 0),
    [grupos]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Clientes duplicados</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clientes repetidos que comparten DNI, teléfono o email — deberían ser uno solo con varias pólizas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={simularMasivaDNI}
            disabled={masivaLoading || loading}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-amber-500 bg-amber-500/90 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors"
            title="Fusionar automáticamente todos los clientes con el mismo DNI"
          >
            {masivaLoading ? "Procesando…" : "Auto por DNI"}
          </button>
          <button
            onClick={descargarTodo}
            disabled={downloading || loading}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-emerald-600 bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {downloading ? "Descargando…" : "Descargar todo"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
            title="Actualizar"
          >
            <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Selección de criterios */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-slate-500 uppercase tracking-wide">Comparar por:</span>
        {MODOS.map((m) => {
          const Icon = m.icon;
          const active = modos.includes(m.value);
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => toggleModo(m.value)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                active
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Icon className="text-sm" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-3">
          <div className="text-[11px] text-amber-300/80 flex items-center gap-1.5">
            <HiUserGroup className="text-sm" /> Grupos duplicados
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-0.5">{totalGrupos}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <HiUserGroup className="text-sm" /> Registros afectados
          </div>
          <div className="text-2xl font-bold text-slate-200 mt-0.5">{totalClientesAfectados}</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
          <HiExclamationCircle className="text-base shrink-0" />
          {error}
        </div>
      )}

      {/* Estado vacío */}
      {!loading && !error && grupos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-sm text-slate-400">
          ✅ No se encontraron clientes duplicados con los criterios elegidos.
        </div>
      )}

      {/* Lista de grupos */}
      <div className="space-y-3">
        {grupos.map((g, idx) => (
          <motion.div
            key={`${g?.modo}-${g?.key}-${idx}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(0.25, idx * 0.02) }}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
          >
            {/* Cabecera del grupo */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <ModoBadge modo={g?.modo} />
                <span className="text-sm font-mono text-slate-200 truncate">{safeStr(g?.key) || "—"}</span>
                <button
                  onClick={() => copyText(g?.key)}
                  className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                  title="Copiar dato"
                >
                  <HiOutlineClipboardCopy className="text-sm" />
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-amber-300">
                  {g?.count} registros
                  {g?.truncated ? " (+)" : ""}
                </span>
                <button
                  onClick={() => abrirFusion(g)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-sky-600 bg-sky-600/90 text-white text-[11px] font-semibold hover:bg-sky-500 transition-colors"
                  title="Fusionar estos clientes en uno solo"
                >
                  Fusionar
                </button>
              </div>
            </div>

            {/* Clientes del grupo */}
            <div className="divide-y divide-slate-800/60">
              {(Array.isArray(g?.clientes) ? g.clientes : []).map((c) => {
                const nombre =
                  [c?.apellido, c?.nombre].filter(Boolean).join(", ") || "Sin nombre";
                return (
                  <div
                    key={c?.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100 truncate">
                        {nombre}
                        <span className="ml-2 text-[10px] font-mono text-slate-500">#{c?.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 font-mono">
                        {c?.dni_cuit_cuil && <span>DNI {c.dni_cuit_cuil}</span>}
                        {c?.telefono && <span>Tel {c.telefono}</span>}
                        {c?.email && <span className="truncate max-w-[180px]">{c.email}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/clientes/${c?.id}`)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Ver cliente"
                    >
                      Ver <HiArrowRight className="text-xs" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Modal de fusión ── */}
      {fusionGrupo && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !fusionando && setFusionGrupo(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">Fusionar clientes</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Elegí la ficha que se queda. Las demás se mueven hacia ella (pólizas incluidas) y se borran.
              </p>
            </div>

            <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-800/60">
              {(Array.isArray(fusionGrupo?.clientes) ? fusionGrupo.clientes : []).map((c) => {
                const nombre = [c?.apellido, c?.nombre].filter(Boolean).join(", ") || "Sin nombre";
                const elegido = Number(principalSel) === Number(c?.id);
                return (
                  <label
                    key={c?.id}
                    className={`flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors ${elegido ? "bg-sky-500/10" : "hover:bg-slate-900/60"}`}
                  >
                    <input
                      type="radio"
                      name="principal"
                      className="mt-1 accent-sky-500"
                      checked={elegido}
                      onChange={() => setPrincipalSel(Number(c?.id))}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100">
                        {nombre}
                        <span className="ml-2 text-[10px] font-mono text-slate-500">#{c?.id}</span>
                        {elegido && <span className="ml-2 text-[10px] font-bold text-sky-400">QUEDA</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 mt-0.5 font-mono">
                        {c?.dni_cuit_cuil && <span>DNI {c.dni_cuit_cuil}</span>}
                        {c?.telefono && <span>Tel {c.telefono}</span>}
                        {c?.email && <span className="truncate max-w-[180px]">{c.email}</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setFusionGrupo(null)}
                disabled={fusionando}
                className="h-9 px-4 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-900 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarFusion}
                disabled={fusionando || !principalSel}
                className="h-9 px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500 disabled:opacity-50 transition-colors"
              >
                {fusionando ? "Fusionando…" : "Fusionar y borrar duplicados"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmación de fusión masiva por DNI ── */}
      {masivaSim && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !masivaLoading && setMasivaSim(null)}
        >
          <div
            className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">Fusión automática por DNI</h3>
              <p className="text-xs text-slate-500 mt-0.5">Esto es una simulación. Todavía no se tocó nada.</p>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-2xl font-bold text-sky-300">{Number(masivaSim?.grupos || 0).toLocaleString("es-AR")}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">grupos a fusionar</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-2xl font-bold text-emerald-300">{Number(masivaSim?.se_conservan || 0).toLocaleString("es-AR")}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">fichas que quedan</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="text-2xl font-bold text-rose-300">{Number(masivaSim?.se_borrarian || 0).toLocaleString("es-AR")}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">copias a borrar</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Se juntan los clientes con el mismo DNI. En cada grupo queda la ficha más antigua y
                las pólizas/pagos de las copias se mueven hacia ella. No se pierde historial.
                {Number(masivaSim?.grupos || 0) === 0 && " — No hay nada para fusionar."}
              </p>
            </div>

            <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setMasivaSim(null)}
                disabled={masivaLoading}
                className="h-9 px-4 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-900 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarMasivaDNI}
                disabled={masivaLoading || Number(masivaSim?.grupos || 0) === 0}
                className="h-9 px-4 rounded-lg bg-amber-500 text-slate-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {masivaLoading ? "Fusionando…" : "Sí, fusionar ahora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}