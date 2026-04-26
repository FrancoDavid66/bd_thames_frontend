// src/pages/AdminPage.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { HiShieldCheck, HiOfficeBuilding, HiUsers, HiUserGroup, HiCollection } from "react-icons/hi";
import AdminOficinas from "../components/admin/AdminOficinas";
import AdminUsuarios from "../components/admin/AdminUsuarios";
import AdminResponsables from "../components/admin/AdminResponsables";
import AdminCatalogos from "../components/admin/AdminCatalogos"; // 🚀 NUEVO

export default function AdminPage() {
  const [tab, setTab] = useState("oficinas");

  return (
    <motion.div 
      className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 sm:px-6 lg:px-10"
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 text-2xl ring-1 ring-amber-500/30">
            <HiShieldCheck />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Panel de Administración</h1>
            <p className="text-sm text-slate-400">Configuración global, sucursales y catálogos de cotización.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setTab("oficinas")}
            className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "oficinas" ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
          >
            <HiOfficeBuilding size={18} /> Sucursales
          </button>
          
          <button 
            onClick={() => setTab("usuarios")}
            className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "usuarios" ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
          >
            <HiUsers size={18} /> Usuarios
          </button>

          <button 
            onClick={() => setTab("responsables")}
            className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "responsables" ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
          >
            <HiUserGroup size={18} /> Responsables
          </button>

          {/* 🚀 NUEVA PESTAÑA: CATÁLOGOS */}
          <button 
            onClick={() => setTab("catalogos")}
            className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "catalogos" ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
          >
            <HiCollection size={18} /> Catálogos (Aseguradoras)
          </button>
        </div>

        {/* Content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "oficinas" && <AdminOficinas />}
          {tab === "usuarios" && <AdminUsuarios />}
          {tab === "responsables" && <AdminResponsables />}
          {tab === "catalogos" && <AdminCatalogos />}
        </motion.div>

      </div>
    </motion.div>
  );
}