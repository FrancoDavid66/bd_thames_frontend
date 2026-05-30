// src/pages/VerificacionCompaniaPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiShieldCheck,
  HiFlag,
  HiRefresh,
  HiArrowLeft,
  HiQuestionMarkCircle,
  HiX,
  HiCheckCircle,
  HiExclamation,
  HiArrowRight,
} from "react-icons/hi";

import api from "../services/api";

/* ─── helpers ─────────────────────────────────────────────── */
const TABS = [
  { key: "pendiente", label: "Por verificar", icon: HiShieldCheck },
  { key: "ok", label: "Verificadas", icon: HiCheckCircle },
  { key: "no_figura", label: "No figura", icon: HiFlag },
];

/* ─── Tutorial (signo de ?) ───────────────────────────────── */
function TutorialModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <HiQuestionMarkCircle className="text-sky-400" /> ¿Cómo verifico una póliza?
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        <ol className="space-y-2.5 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">1</span>
            Entrá al portal de la compañía (Sancor, Federación, etc.).
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">2</span>
            Buscá la póliza por <strong>patente</strong> o número.
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-900/60 text-emerald-300 text-xs flex items-center justify-center font-bold">3</span>
            Si está <strong>vigente</strong> y la <strong>patente coincide</strong> → tocá <span className="text-emerald-400 font-semibold">Verificada</span>.
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-rose-900/60 text-rose-300 text-xs flex items-center justify-center font-bold">4</span>
            Si <strong>no aparece</strong>, está vencida o los datos no coinciden → tocá <span className="text-rose-400 font-semibold">No figura</span>.
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center justify-center font-bold">5</span>
            Si te equivocaste, podés <strong>volverla a "Por verificar"</strong>.
          </li>
        </ol>

        <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/8 px-3 py-2 text-xs text-sky-200">
          Solo aparecen las pólizas <strong>al día</strong>. Las que marques como "No figura" se muestran también en Estadísticas → Auditoría.
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Fila de póliza ──────────────────────────────────────── */
function PolizaRow({ p, tab, onMarcar, busy }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-100 truncate">
          {p.cliente || "Sin nombre"}
        </div>
        <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
          {p.patente || "s/patente"} · {p.compania || "s/compañía"}
          {p.numero_poliza ? ` · N° ${p.numero_poliza}` : ""}
          {p.al_dia && <span className="text-emerald-400"> · al día</span>}
          {p.oficina_nombre ? ` · ${p.oficina_nombre}` : ""}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {tab === "pendiente" && (
          <>
            <button
              onClick={() => onMarcar(p.id, "OK")}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-700/15 text-emerald-300 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700/25 transition-colors disabled:opacity-50"
            >
              <HiShieldCheck className="w-4 h-4" /> Verificada
            </button>
            <button
              onClick={() => onMarcar(p.id, "NO_FIGURA")}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-700/50 bg-rose-700/10 text-rose-300 px-3 py-1.5 text-xs font-semibold hover:bg-rose-700/20 transition-colors disabled:opacity-50"
            >
              <HiFlag className="w-4 h-4" /> No figura
            </button>
          </>
        )}

        {tab !== "pendiente" && (
          <>
            <button
              onClick={() => navigate(`/polizas/${p.id}`)}
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              Ver <HiArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => onMarcar(p.id, "")}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
              title="Volver a 'Por verificar'"
            >
              <HiArrowLeft className="w-4 h-4" /> Revertir
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Página ──────────────────────────────────────────────── */
export default function VerificacionCompaniaPage() {
  const [tab, setTab] = useState("pendiente");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ pendiente: 0, ok: 0, no_figura: 0 });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const fetchTab = useCallback(async (estado) => {
    setLoading(true);
    try {
      const res = await api.get("polizas/verificacion-compania/", {
        params: { estado },
      });
      const data = res.data || {};
      const lista = Array.isArray(data.resultados) ? data.resultados : [];
      setItems(lista);
      setCounts((prev) => ({ ...prev, [estado]: data.total ?? lista.length }));
    } catch {
      setItems([]);
      toast.error("No se pudo cargar la lista.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTab(tab);
  }, [tab, fetchTab]);

  const marcar = async (id, estado) => {
    setBusyId(id);
    try {
      await api.post(`polizas/${id}/marcar-verificacion-compania/`, { estado });
      // Sacar de la lista actual (cambió de estado)
      setItems((prev) => prev.filter((p) => p.id !== id));
      // Refrescar contadores de las otras solapas en segundo plano
      const msg =
        estado === "OK" ? "Marcada como verificada."
        : estado === "NO_FIGURA" ? "Marcada como 'No figura'."
        : "Volvió a 'Por verificar'.";
      toast.success(msg);
    } catch {
      toast.error("No se pudo guardar el cambio.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight flex items-center gap-2">
            Verificación con la compañía
            <button
              onClick={() => setShowTutorial(true)}
              className="text-slate-500 hover:text-sky-400 transition-colors"
              title="¿Cómo se usa?"
            >
              <HiQuestionMarkCircle className="w-5 h-5" />
            </button>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Confirmá en el portal de la compañía que cada póliza exista y esté vigente.
          </p>
        </div>
        <button
          onClick={() => fetchTab(tab)}
          disabled={loading}
          className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Solapas */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-semibold border transition-colors ${
                active
                  ? t.key === "no_figura"
                    ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                    : t.key === "ok"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-sky-500/50 bg-sky-500/15 text-sky-300"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {active && <span className="ml-0.5 text-xs opacity-80">· {items.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Aviso para No figura */}
      {tab === "no_figura" && items.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
          <HiExclamation className="text-base shrink-0" />
          Estas pólizas no figuran en la compañía. Cobraste pero el seguro real podría no existir — revisalas.
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 h-16 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-sm text-slate-400">
          {tab === "pendiente"
            ? "✅ No hay pólizas pendientes de verificar. ¡Lista vacía!"
            : tab === "ok"
            ? "Todavía no marcaste ninguna póliza como verificada."
            : "No hay pólizas marcadas como 'No figura'."}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ duration: 0.18 }}
              >
                <PolizaRow p={p} tab={tab} onMarcar={marcar} busy={busyId === p.id} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <TutorialModal open={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}