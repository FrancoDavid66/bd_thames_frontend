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
  HiCheckCircle,
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
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark">
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
          <h2 className="text-base font-semibold text-titulo dark:text-titulo-dark">Clientes duplicados</h2>
          <p className="text-xs text-suave dark:text-suave-dark mt-0.5">
            Clientes repetidos que comparten DNI, teléfono o email — deberían ser uno solo con varias pólizas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={simularMasivaDNI}
            disabled={masivaLoading || loading}
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-tarjeta text-white text-xs font-medium hover:brightness-105 transition-colors disabled:opacity-50"
            title="Fusionar automáticamente todos los clientes con el mismo DNI"
          >
            {masivaLoading ? "Procesando…" : "Auto por DNI"}
          </button>
          <button
            onClick={descargarTodo}
            disabled={downloading || loading}
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-ingreso text-white text-xs font-medium hover:brightness-110 transition-colors disabled:opacity-50"
          >
            {downloading ? "Descargando…" : "Descargar todo"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina transition-colors"
            title="Actualizar"
          >
            <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Selección de criterios */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-suave dark:text-suave-dark">Comparar por:</span>
        {MODOS.map((m) => {
          const Icon = m.icon;
          const active = modos.includes(m.value);
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => toggleModo(m.value)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? "border-ingreso bg-ingreso/10 text-ingreso"
                  : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:border-ingreso/50"
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
        <div className="rounded-xl border border-tarjeta/25 bg-tarjeta/[0.06] p-3.5">
          <div className="text-[11px] text-[#d97706] dark:text-tarjeta-claro flex items-center gap-1.5">
            <HiUserGroup className="text-sm" /> Grupos duplicados
          </div>
          <div className="text-2xl font-semibold text-[#d97706] dark:text-tarjeta-claro mt-0.5">{totalGrupos}</div>
        </div>
        <div className="rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3.5">
          <div className="text-[11px] text-suave dark:text-suave-dark flex items-center gap-1.5">
            <HiUserGroup className="text-sm" /> Registros afectados
          </div>
          <div className="text-2xl font-semibold text-titulo dark:text-titulo-dark mt-0.5">{totalClientesAfectados}</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-egreso/35 bg-egreso/10 px-3 py-2 text-xs text-egreso dark:text-egreso-claro flex items-center gap-2">
          <HiExclamationCircle className="text-base shrink-0" />
          {error}
        </div>
      )}

      {/* Estado vacío */}
      {!loading && !error && grupos.length === 0 && (
        <div className="rounded-xl border border-dashed border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-8 text-center text-sm text-suave dark:text-suave-dark flex flex-col items-center gap-2">
          <HiCheckCircle className="text-2xl text-ingreso" />
          No se encontraron clientes duplicados con los criterios elegidos.
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
            className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden"
          >
            {/* Cabecera del grupo */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface dark:bg-surface-dark border-b border-linea dark:border-linea-dark">
              <div className="flex items-center gap-2 min-w-0">
                <ModoBadge modo={g?.modo} />
                <span className="text-sm font-mono font-medium text-titulo dark:text-titulo-dark truncate">{safeStr(g?.key) || "—"}</span>
                <button
                  onClick={() => copyText(g?.key)}
                  className="text-suave dark:text-suave-dark hover:text-ingreso transition-colors shrink-0"
                  title="Copiar dato"
                >
                  <HiOutlineClipboardCopy className="text-sm" />
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-[#d97706] dark:text-tarjeta-claro">
                  {g?.count} registros
                  {g?.truncated ? " (+)" : ""}
                </span>
                <button
                  onClick={() => abrirFusion(g)}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-oficina text-white text-[11px] font-medium hover:brightness-110 transition-colors"
                  title="Fusionar estos clientes en uno solo"
                >
                  Fusionar
                </button>
              </div>
            </div>

            {/* Clientes del grupo */}
            <div className="divide-y divide-linea/50 dark:divide-linea-dark/50">
              {(Array.isArray(g?.clientes) ? g.clientes : []).map((c) => {
                const nombre =
                  [c?.apellido, c?.nombre].filter(Boolean).join(", ") || "Sin nombre";
                return (
                  <div
                    key={c?.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-oficina/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-titulo dark:text-titulo-dark truncate">
                        {nombre}
                        <span className="ml-2 text-[11px] font-mono text-suave dark:text-suave-dark">#{c?.id}</span>
                      </div>
                      <div className="text-[11px] text-suave dark:text-suave-dark flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 font-mono">
                        {c?.dni_cuit_cuil && <span>DNI {c.dni_cuit_cuil}</span>}
                        {c?.telefono && <span>Tel {c.telefono}</span>}
                        {c?.email && <span className="truncate max-w-[180px]">{c.email}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/clientes/${c?.id}`)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-ingreso hover:text-ingreso-fuerte transition-colors"
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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !fusionando && setFusionGrupo(null)}
        >
          <div
            className="w-full max-w-lg bg-card dark:bg-card-dark border border-linea dark:border-linea-dark rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-linea dark:border-linea-dark">
              <h3 className="text-base font-semibold text-titulo dark:text-titulo-dark">Fusionar clientes</h3>
              <p className="text-xs text-suave dark:text-suave-dark mt-0.5">
                Elegí la ficha que se queda. Las demás se mueven hacia ella (pólizas incluidas) y se borran.
              </p>
            </div>

            <div className="max-h-[55vh] overflow-y-auto divide-y divide-linea/50 dark:divide-linea-dark/50">
              {(Array.isArray(fusionGrupo?.clientes) ? fusionGrupo.clientes : []).map((c) => {
                const nombre = [c?.apellido, c?.nombre].filter(Boolean).join(", ") || "Sin nombre";
                const elegido = Number(principalSel) === Number(c?.id);
                return (
                  <label
                    key={c?.id}
                    className={`flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors ${elegido ? "bg-oficina/10" : "hover:bg-surface dark:hover:bg-surface-dark"}`}
                  >
                    <input
                      type="radio"
                      name="principal"
                      className="mt-1 accent-[var(--color-oficina)]"
                      checked={elegido}
                      onChange={() => setPrincipalSel(Number(c?.id))}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-titulo dark:text-titulo-dark">
                        {nombre}
                        <span className="ml-2 text-[11px] font-mono text-suave dark:text-suave-dark">#{c?.id}</span>
                        {elegido && <span className="ml-2 text-[11px] font-medium text-oficina">QUEDA</span>}
                      </div>
                      <div className="text-[11px] text-suave dark:text-suave-dark flex flex-wrap gap-x-3 mt-0.5 font-mono">
                        {c?.dni_cuit_cuil && <span>DNI {c.dni_cuit_cuil}</span>}
                        {c?.telefono && <span>Tel {c.telefono}</span>}
                        {c?.email && <span className="truncate max-w-[180px]">{c.email}</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-linea dark:border-linea-dark flex items-center justify-end gap-2">
              <button
                onClick={() => setFusionGrupo(null)}
                disabled={fusionando}
                className="h-10 px-4 rounded-lg border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-sm font-medium hover:border-egreso hover:text-egreso disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarFusion}
                disabled={fusionando || !principalSel}
                className="h-10 px-4 rounded-lg bg-oficina text-white text-sm font-medium transition-colors hover:brightness-110 disabled:opacity-50"
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
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !masivaLoading && setMasivaSim(null)}
        >
          <div
            className="w-full max-w-md bg-card dark:bg-card-dark border border-linea dark:border-linea-dark rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-linea dark:border-linea-dark">
              <h3 className="text-base font-semibold text-titulo dark:text-titulo-dark">Fusión automática por DNI</h3>
              <p className="text-xs text-suave dark:text-suave-dark mt-0.5">Esto es una simulación. Todavía no se tocó nada.</p>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-oficina/25 bg-oficina/[0.06] p-3">
                  <div className="text-2xl font-semibold text-oficina">{Number(masivaSim?.grupos || 0).toLocaleString("es-AR")}</div>
                  <div className="text-[11px] text-suave dark:text-suave-dark mt-0.5">grupos a fusionar</div>
                </div>
                <div className="rounded-xl border border-ingreso/25 bg-ingreso/[0.06] p-3">
                  <div className="text-2xl font-semibold text-ingreso">{Number(masivaSim?.se_conservan || 0).toLocaleString("es-AR")}</div>
                  <div className="text-[11px] text-suave dark:text-suave-dark mt-0.5">fichas que quedan</div>
                </div>
                <div className="rounded-xl border border-egreso/25 bg-egreso/[0.06] p-3">
                  <div className="text-2xl font-semibold text-egreso">{Number(masivaSim?.se_borrarian || 0).toLocaleString("es-AR")}</div>
                  <div className="text-[11px] text-suave dark:text-suave-dark mt-0.5">copias a borrar</div>
                </div>
              </div>
              <p className="text-[11px] text-suave dark:text-suave-dark leading-relaxed">
                Se juntan los clientes con el mismo DNI. En cada grupo queda la ficha más antigua y
                las pólizas/pagos de las copias se mueven hacia ella. No se pierde historial.
                {Number(masivaSim?.grupos || 0) === 0 && " — No hay nada para fusionar."}
              </p>
            </div>

            <div className="px-5 py-4 border-t border-linea dark:border-linea-dark flex items-center justify-end gap-2">
              <button
                onClick={() => setMasivaSim(null)}
                disabled={masivaLoading}
                className="h-10 px-4 rounded-lg border border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-sm font-medium hover:border-egreso hover:text-egreso disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarMasivaDNI}
                disabled={masivaLoading || Number(masivaSim?.grupos || 0) === 0}
                className="h-10 px-4 rounded-lg bg-tarjeta text-white text-sm font-medium transition-colors hover:brightness-105 disabled:opacity-50"
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
