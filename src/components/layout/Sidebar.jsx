// src/components/layout/Sidebar.jsx
import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiChevronDown, HiChevronRight, HiChevronLeft, HiHome,
} from "react-icons/hi";
import ThemeToggle from "./ThemeToggle";
// 🚀 Isotipo oficial (columna)
import logoThames from "../../assets/logos/logo_thames.svg";
// 📚 Fuente única del menú (compartida con el Footer)
import { ICON_MAP, buildMenuGroups } from "./menuData";
// 🧠 Memoria de los acordeones (arrancan cerrados; recuerda si el usuario los abre)
import { useAccordionPrefs } from "../../hooks/useMenuPrefs";

// 🎨 UN SOLO acento (azul) para lo activo. Antes cada sección tenía su
//    propio color (azul/violeta/verde/amarillo a la vez) — se veía
//    "colorinche". Ahora el color queda reservado para: 1) este acento,
//    2) los ítems puntualmente destacados (highlight, ver HIGHLIGHT_CLS)
//    y 3) las badges numéricas (rojo/amarillo), que avisan algo pendiente.
const ACTIVE_CLS = "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul border-duo-azul/40";
const INACTIVE_CLS = "text-suave dark:text-suave-dark border-transparent hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark";

// Ítems con `highlight` en menuData.js: `highlight: true` → azul (default);
// `highlight: "verde"` → verde (ej. Gestión de Pagos, el más usado).
const HIGHLIGHT_CLS = {
  azul: "text-duo-azul border-duo-azul/25 hover:bg-duo-azul-soft dark:hover:bg-[var(--color-duo-azul-soft-dark)]",
  verde: "text-duo-verde-sombra dark:text-duo-verde border-duo-verde/25 hover:bg-duo-verde-soft dark:hover:bg-[var(--color-duo-verde-soft-dark)]",
};

export default function Sidebar({
  isOpen,
  onClose,
  onOpen,                    // 🚀 abre el sidebar (lo usa la lengüeta lateral)
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  cuponVencidas = 0,
  renovacionesPendientes = 0,
  bajasPendientes = 0,
  serviciosAlertas = 0,
  siniestrosAbiertos = 0,
  controlDiarioPendientes = 0,   // 🆕 badge de Control diario (tareas de hoy sin hacer)
}) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const isVendedor = user?.perfil?.rol === "VENDEDOR";
  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  const oficinaNombre = user?.perfil?.oficina_nombre || "Sucursal";

  const menuGroups = useMemo(
    () => buildMenuGroups({
      isAdmin, isVendedor, solTotal, renovacionesPendientes,
      cuponVencidas, bajasPendientes, serviciosAlertas, siniestrosAbiertos,
      controlDiarioPendientes,
    }),
    [isAdmin, isVendedor, solTotal, renovacionesPendientes, cuponVencidas, bajasPendientes, serviciosAlertas, siniestrosAbiertos, controlDiarioPendientes]
  );

  // 🧠 Acordeones con memoria: arrancan CERRADOS. Si el usuario abre uno, se
  //    guarda en localStorage y la próxima vez sigue abierto.
  const { isOpen: isGroupOpen, toggleGroup } = useAccordionPrefs();
  const toggle = (id) => toggleGroup(id);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* 🚀 LENGÜETA lateral — aparece cuando el sidebar está CERRADO. */}
      <AnimatePresence>
        {!isOpen && onOpen && (
          <motion.button
            key="side-tab"
            type="button"
            onClick={onOpen}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.22 }}
            aria-label="Abrir menú lateral"
            title="Abrir menú"
            className="group fixed left-0 top-1/2 -translate-y-1/2 z-[45] flex items-center justify-center
                       h-16 w-6 rounded-r-lg bg-duo-azul text-white
                       hover:w-7 transition-all duration-200 active:scale-95"
          >
            <HiChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 🚀 SOLAPA para CERRAR — aparece SOLO cuando el sidebar está ABIERTO. */}
      <AnimatePresence>
        {isOpen && onClose && (
          <motion.button
            key="side-close-tab"
            type="button"
            onClick={onClose}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            aria-label="Cerrar menú lateral"
            title="Cerrar menú"
            className="group fixed left-64 top-1/2 -translate-y-1/2 z-[55] flex items-center justify-center
                       h-16 w-6 rounded-r-lg bg-duo-azul text-white
                       hover:w-7 transition-all duration-200 active:scale-95"
          >
            <HiChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar — 256px, coincide con "lg:ml-64" de App.jsx */}
      <aside className={`
        fixed top-0 left-0 z-50 h-[100dvh] w-64 flex flex-col
        bg-card dark:bg-card-dark border-r border-linea dark:border-linea-dark
        shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-linea dark:border-linea-dark flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-card dark:bg-card-dark border border-linea dark:border-linea-dark flex items-center justify-center shrink-0 p-1.5">
              <img src={logoThames} alt="Thames Seguros" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[13px] font-semibold text-titulo dark:text-titulo-dark truncate leading-tight">Thames Seguros</h1>
              <p className="text-[11px] text-suave dark:text-suave-dark font-medium truncate leading-tight">
                {isVendedor ? "Recomendador" : oficinaNombre}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2.5 px-3 space-y-1.5 scrollbar-hide">
          {menuGroups.map((group, gi) => {
            return (
              <div key={gi} className={gi > 0 ? "mt-2" : ""}>

                {/* Grupo plano */}
                {group.flat ? (
                  <div className="rounded-lg p-1.5">
                    {group.title && (
                      <p className="px-2 pb-1 pt-0.5 text-[11px] font-medium text-suave dark:text-suave-dark">
                        {group.title}
                      </p>
                    )}
                    {group.items.map(item => {
                      const Icon = ICON_MAP[item.icon] || HiHome;
                      return (
                        <NavLink key={item.to} to={item.to} end={item.to === "/"}
                          className={({ isActive }) => `
                            group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
                            transition-colors mb-0.5 border
                            ${isActive
                              ? ACTIVE_CLS
                              : item.highlight
                                ? (HIGHLIGHT_CLS[item.highlight] || HIGHLIGHT_CLS.azul)
                                : INACTIVE_CLS
                            }
                          `}>
                          {({ isActive }) => (
                            <>
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="flex-1 truncate">{item.label}</span>
                              <Badge value={item.badge} tone={item.tone} />
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                ) : (
                  /* Grupo con acordeón */
                  <div className="rounded-lg p-1.5">
                    <button onClick={() => toggle(group.id)}
                      className={`
                        w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                        text-[13px] font-medium transition-colors
                        ${isGroupOpen(group.id)
                          ? "text-titulo dark:text-titulo-dark"
                          : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
                        }
                      `}>
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{group.title}</span>
                        <GroupBadge items={group.items} />
                      </span>
                      <HiChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isGroupOpen(group.id) ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {isGroupOpen(group.id) && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-1 pl-1.5">
                            {group.items.map(item => {
                              const Icon = ICON_MAP[item.icon] || HiHome;
                              return (
                                <NavLink key={item.to} to={item.to} end={item.to === "/"}
                                  className={({ isActive }) => `
                                    group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
                                    transition-colors mb-0.5
                                    ${isActive
                                      ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
                                      : "text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
                                    }
                                  `}>
                                  {({ isActive }) => (
                                    <>
                                      <Icon className="w-3.5 h-3.5 shrink-0" />
                                      <span className="flex-1 truncate">{item.label}</span>
                                      <Badge value={item.badge} tone={item.tone} />
                                    </>
                                  )}
                                </NavLink>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="px-4 py-3 border-t border-linea dark:border-linea-dark shrink-0 space-y-2">
          <ThemeToggle />
          <p className="text-center text-[11px] text-suave dark:text-suave-dark">Thames Seguros © 2026</p>
        </div>
      </aside>
    </>
  );
}

// Badge de conteo
function Badge({ value = 0, tone = "rojo" }) {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  const cls = tone === "amarillo"
    ? "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo"
    : "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo";
  return (
    <span className={`shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium ${cls}`}>
      {v}
    </span>
  );
}

// Mini-badge en el header del grupo (suma de badges de sus items)
function GroupBadge({ items }) {
  const total = (items || []).reduce((acc, it) => acc + (Number(it.badge) || 0), 0);
  if (total <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-medium bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo">
      {total}
    </span>
  );
}