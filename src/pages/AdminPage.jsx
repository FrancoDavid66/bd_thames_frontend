// src/pages/AdminPage.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { HiShieldCheck, HiOfficeBuilding, HiUsers, HiUserGroup, HiCollection, HiMail } from "react-icons/hi";
import AdminOficinas from "../components/admin/AdminOficinas";
import AdminUsuarios from "../components/admin/AdminUsuarios";
import AdminResponsables from "../components/admin/AdminResponsables";
import AdminCatalogos from "../components/admin/AdminCatalogos";
import AdminCorreosBajas from "../components/admin/Admincorreosbajas";

export default function AdminPage() {
  const [tab, setTab] = useState("responsables");

  const tabs = [
    { key: "oficinas",      label: "Sucursales",           icon: <HiOfficeBuilding className="text-lg opacity-80" />, color: "" },
    { key: "usuarios",      label: "Usuarios",             icon: <HiUsers          className="text-lg opacity-80" />, color: "" },
    { key: "responsables",  label: "Responsables",         icon: <HiUserGroup      className="text-lg opacity-80" />, color: "sky" },
    { key: "catalogos",     label: "Catálogos (Aseguradoras)", icon: <HiCollection className="text-lg opacity-80" />, color: "amber" },
    { key: "correos_bajas", label: "Correos de bajas",     icon: <HiMail          className="text-lg opacity-80" />, color: "rose" },
  ];

  const activeClass = (t) => {
    const colorMap = { sky: "text-sky-400 border-sky-500/30", amber: "text-amber-400 border-amber-500/30", rose: "text-rose-400 border-rose-500/30", "": "text-white border-slate-700" };
    return tab === t.key
      ? `bg-slate-800 shadow-sm border ${colorMap[t.color]} `
      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent";
  };

  return (
    <motion.div
      className="min-h-[calc(100vh-4rem)] bg-[#030712] px-4 py-8 sm:px-6 lg:px-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden flex items-center gap-5 bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center text-amber-500 text-3xl ring-1 ring-amber-500/30 shadow-inner">
            <HiShieldCheck />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Panel de Administración</h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">Configuración global, sucursales y catálogos de cotización.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-3 border-b border-slate-800/60 pb-5 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeClass(t)}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {tab === "oficinas"      && <AdminOficinas />}
          {tab === "usuarios"      && <AdminUsuarios />}
          {tab === "responsables"  && <AdminResponsables />}
          {tab === "catalogos"     && <AdminCatalogos />}
          {tab === "correos_bajas" && <AdminCorreosBajas />}
        </motion.div>

      </div>
    </motion.div>
  );
}