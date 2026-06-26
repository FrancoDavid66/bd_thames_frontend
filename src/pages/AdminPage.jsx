// src/pages/AdminPage.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import {
  HiShieldCheck,
  HiOfficeBuilding,
  HiUsers,
  HiUserGroup,
  HiCollection,
  HiMail,
  HiClipboardCheck,
  HiCalendar,
  HiClock,
} from "react-icons/hi";
import AdminOficinas from "../components/admin/AdminOficinas";
import AdminUsuarios from "../components/admin/AdminUsuarios";
import AdminResponsables from "../components/admin/AdminResponsables";
import AdminCatalogos from "../components/admin/AdminCatalogos";
import AdminCorreosBajas from "../components/admin/Admincorreosbajas";
import AdminDiagnostico from "../components/admin/AdminDiagnostico";
import AdminTareasFijas from "../components/admin/AdminTareasFijas";
import AdminHorariosCierre from "../components/admin/AdminHorariosCierre";

const TABS = [
  { key: "oficinas",        label: "Sucursales",         icon: HiOfficeBuilding, color: "slate" },
  { key: "usuarios",        label: "Usuarios",           icon: HiUsers,          color: "slate" },
  { key: "responsables",    label: "Responsables",       icon: HiUserGroup,      color: "sky" },
  { key: "catalogos",       label: "Aseguradoras",       icon: HiCollection,     color: "amber" },
  { key: "correos_bajas",   label: "Correos de bajas",   icon: HiMail,           color: "rose" },
  { key: "diagnostico",     label: "Salud de datos",     icon: HiClipboardCheck, color: "emerald" },
  { key: "control_diario",  label: "Control diario",     icon: HiCalendar,       color: "violet" },
  { key: "horarios_cierre", label: "Horarios de cierre", icon: HiClock,          color: "sky" },
];

const COLORS = {
  slate:   { on: "bg-slate-700/40 text-white",         dot: "text-slate-300" },
  sky:     { on: "bg-sky-500/15 text-sky-300",         dot: "text-sky-400" },
  amber:   { on: "bg-amber-500/15 text-amber-300",     dot: "text-amber-400" },
  rose:    { on: "bg-rose-500/15 text-rose-300",       dot: "text-rose-400" },
  emerald: { on: "bg-emerald-500/15 text-emerald-300", dot: "text-emerald-400" },
  violet:  { on: "bg-violet-500/15 text-violet-300",   dot: "text-violet-400" },
};

export default function AdminPage() {
  const [tab, setTab] = useState("responsables");
  const actual = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <motion.div
      className="min-h-[calc(100vh-4rem)] bg-[#030712] px-4 py-6 sm:px-6 lg:px-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 to-slate-900/50 p-5 shadow-2xl sm:p-7">
          <div className="pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 h-56 w-56 rounded-full bg-amber-500/5 blur-3xl" />
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-2xl text-amber-500 ring-1 ring-amber-500/30">
            <HiShieldCheck />
          </div>
          <div className="relative z-10">
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Panel de Administración</h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-400">Configuración global, sucursales y catálogos.</p>
          </div>
        </div>

        {/* Menú lateral (desktop) / chips con scroll (mobile) + contenido */}
        <div className="flex flex-col gap-5 lg:flex-row">
          <nav className="lg:w-60 lg:shrink-0">
            <div className="admin-tabs flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {TABS.map((t) => {
                const Icon = t.icon;
                const c = COLORS[t.color] || COLORS.slate;
                const on = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-all lg:w-full ${
                      on ? c.on + " shadow-sm" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <Icon className={`text-lg ${on ? "" : "opacity-70"}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-w-0 flex-1"
          >
            <div className="mb-4 flex items-center gap-2 lg:hidden">
              {(() => { const Icon = actual.icon; return <Icon className={`text-lg ${COLORS[actual.color]?.dot}`} />; })()}
              <span className="text-base font-bold text-white">{actual.label}</span>
            </div>

            {tab === "oficinas"        && <AdminOficinas />}
            {tab === "usuarios"        && <AdminUsuarios />}
            {tab === "responsables"    && <AdminResponsables />}
            {tab === "catalogos"       && <AdminCatalogos />}
            {tab === "correos_bajas"   && <AdminCorreosBajas />}
            {tab === "diagnostico"     && <AdminDiagnostico />}
            {tab === "control_diario"  && <AdminTareasFijas />}
            {tab === "horarios_cierre" && <AdminHorariosCierre />}
          </motion.div>
        </div>
      </div>

      <style>{`
        .admin-tabs::-webkit-scrollbar { display: none; }
        .admin-tabs { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
}