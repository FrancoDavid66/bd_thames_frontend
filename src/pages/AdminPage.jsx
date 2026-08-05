// src/pages/AdminPage.jsx
import { useState } from "react";
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

// Cada pestaña tiene su token Duo. "on" = clases del botón activo (relieve 3D).
const TABS = [
  { key: "oficinas",        label: "Sucursales",         icon: HiOfficeBuilding, on: "bg-[var(--color-oficina)] text-white border-[var(--color-oficina-fuerte)] shadow-[0_4px_0_var(--color-oficina-fuerte)]" },
  { key: "usuarios",        label: "Usuarios",           icon: HiUsers,          on: "bg-[var(--color-ingreso)] text-white border-[var(--color-ingreso-fuerte)] shadow-[0_4px_0_var(--color-ingreso-fuerte)]" },
  { key: "responsables",    label: "Responsables",       icon: HiUserGroup,      on: "bg-[var(--color-oficina)] text-white border-[var(--color-oficina-fuerte)] shadow-[0_4px_0_var(--color-oficina-fuerte)]" },
  { key: "catalogos",       label: "Aseguradoras",       icon: HiCollection,     on: "bg-[var(--color-tarjeta)] text-white border-[#d97706] shadow-[0_4px_0_#d97706]" },
  { key: "correos_bajas",   label: "Correos de bajas",   icon: HiMail,           on: "bg-[var(--color-egreso)] text-white border-[var(--color-egreso-fuerte)] shadow-[0_4px_0_var(--color-egreso-fuerte)]" },
  { key: "diagnostico",     label: "Salud de datos",     icon: HiClipboardCheck, on: "bg-[var(--color-ingreso)] text-white border-[var(--color-ingreso-fuerte)] shadow-[0_4px_0_var(--color-ingreso-fuerte)]" },
  { key: "control_diario",  label: "Control diario",     icon: HiCalendar,       on: "bg-[var(--color-transferencia)] text-white border-[var(--color-transferencia-fuerte)] shadow-[0_4px_0_var(--color-transferencia-fuerte)]" },
  { key: "horarios_cierre", label: "Horarios de cierre", icon: HiClock,          on: "bg-[var(--color-oficina)] text-white border-[var(--color-oficina-fuerte)] shadow-[0_4px_0_var(--color-oficina-fuerte)]" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("responsables");
  const actual = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-surface)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header Duo */}
        <div className="flex items-center gap-4 rounded-3xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-5 shadow-[0_4px_0_var(--color-linea)] sm:p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-tarjeta)] text-2xl text-white shadow-[0_4px_0_#d97706]">
            <HiShieldCheck />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[var(--color-titulo)] sm:text-2xl">Panel de Administración</h1>
            <p className="mt-0.5 text-[13px] font-semibold text-[var(--color-suave)]">Configuración global, sucursales y catálogos.</p>
          </div>
        </div>

        {/* Menú lateral (desktop) / chips con scroll (mobile) + contenido */}
        <div className="flex flex-col gap-5 lg:flex-row">
          <nav className="lg:w-60 lg:shrink-0">
            <div className="admin-tabs flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {TABS.map((t) => {
                const Icon = t.icon;
                const on = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-2xl border-2 px-4 py-3 text-sm font-black transition-all lg:w-full ${
                      on
                        ? t.on
                        : "border-transparent text-[var(--color-suave)] hover:bg-[var(--color-card)] hover:text-[var(--color-titulo)]"
                    }`}
                  >
                    <Icon className={`text-lg ${on ? "" : "opacity-70"}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div key={tab} className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2 lg:hidden">
              {(() => { const Icon = actual.icon; return <Icon className="text-lg text-[var(--color-oficina)]" />; })()}
              <span className="text-base font-black text-[var(--color-titulo)]">{actual.label}</span>
            </div>

            {tab === "oficinas"        && <AdminOficinas />}
            {tab === "usuarios"        && <AdminUsuarios />}
            {tab === "responsables"    && <AdminResponsables />}
            {tab === "catalogos"       && <AdminCatalogos />}
            {tab === "correos_bajas"   && <AdminCorreosBajas />}
            {tab === "diagnostico"     && <AdminDiagnostico />}
            {tab === "control_diario"  && <AdminTareasFijas />}
            {tab === "horarios_cierre" && <AdminHorariosCierre />}
          </div>
        </div>
      </div>

      <style>{`
        .admin-tabs::-webkit-scrollbar { display: none; }
        .admin-tabs { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
