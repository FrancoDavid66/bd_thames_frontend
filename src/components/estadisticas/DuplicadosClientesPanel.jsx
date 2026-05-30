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
        <button
          onClick={fetchData}
          disabled={loading}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
          title="Actualizar"
        >
          <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
        </button>
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
              <span className="text-[11px] font-bold text-amber-300 shrink-0">
                {g?.count} registros
                {g?.truncated ? " (+)" : ""}
              </span>
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
    </div>
  );
}