// src/pages/GruasPage.jsx
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ProveedoresPanel from "../components/gruas/ProveedoresPanel";
import SolicitudesPanel from "../components/gruas/SolicitudesPanel";
import AdhesionesPanel from "../components/gruas/AdhesionesPanel";
import PlanesPanel from "../components/gruas/PlanesPanel";
import ReportesPanel from "../components/gruas/ReportesPanel";

const TABS = [
  { key: "proveedores", label: "Proveedores" },
  { key: "solicitudes", label: "Solicitudes" },
  { key: "adhesiones", label: "Adhesiones" },
  { key: "planes", label: "Planes" },
  { key: "reportes", label: "Reportes" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function GruasPage() {
  const [tab, setTab] = useState("adhesiones");

  const Active = useMemo(() => {
    switch (tab) {
      case "proveedores":
        return ProveedoresPanel;
      case "solicitudes":
        return SolicitudesPanel;
      case "adhesiones":
        return AdhesionesPanel;
      case "planes":
        return PlanesPanel;
      case "reportes":
        return ReportesPanel;
      default:
        return AdhesionesPanel;
    }
  }, [tab]);

  return (
    <div className="w-full min-h-[calc(100vh-64px)] p-3 sm:p-5">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-100">
              Grúas
            </h1>
            <p className="text-sm text-slate-400">
              Gestión de proveedores, solicitudes, adhesiones, planes y reportes.
            </p>
          </div>

          <div className="text-xs text-slate-500">
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
              /api/gruas/…
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={classNames(
                  "px-3 py-2 rounded-xl text-sm border transition",
                  "focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-600",
                  tab === t.key
                    ? "bg-slate-100 text-slate-900 border-slate-100"
                    : "bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-900"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-sm overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-200">
                  Sección:{" "}
                  <span className="font-semibold">
                    {TABS.find((x) => x.key === tab)?.label || "Adhesiones"}
                  </span>
                </div>
                <div className="text-xs text-slate-500">v1</div>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <Active />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-600">
          Próximo paso: conectar cada panel a su API y Redux.
        </div>
      </div>
    </div>
  );
}
