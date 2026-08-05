// src/hooks/useMenuPrefs.js
//
// 🧠 Preferencias del MENÚ con memoria en el navegador + EXCLUSIÓN MUTUA.
//
//    Regla dura (garantizada acá adentro, no en la pantalla):
//      · Pueden estar los DOS cerrados (se ven las dos lengüetas).
//      · Puede estar UNO abierto.
//      · NUNCA los dos abiertos a la vez.
//      · Si abrís uno y el otro estaba abierto, el otro se cierra solo.
//
//    Guarda dos flags independientes pero SIEMPRE consistentes:
//      - sidebarOpen:   sidebar abierto o cerrado
//      - footerVisible: barra inferior visible o escondida
//
//    👉 Clave propia "thames.menu.prefs" (el logout solo borra tokens → sobrevive).
//    👉 Primera vez: sidebar CERRADO, footer VISIBLE.
//    👉 Se sincroniza entre pestañas (evento "storage").
//
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "thames.menu.prefs";

// Primera vez: footer visible, sidebar cerrado (un solo elemento abierto).
const DEFAULTS = { sidebarOpen: false, footerVisible: true };

// 🔒 Corrige cualquier estado inválido (los dos abiertos) → prioriza el sidebar.
function sanear(p) {
  const sidebarOpen = Boolean(p?.sidebarOpen);
  let footerVisible = p?.footerVisible === undefined ? true : Boolean(p.footerVisible);
  if (sidebarOpen && footerVisible) footerVisible = false; // nunca los dos
  return { sidebarOpen, footerVisible };
}

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return sanear(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* incógnito / storage lleno → ignoramos */
  }
}

export function useMenuPrefs() {
  const [prefs, setPrefs] = useState(() => readPrefs());

  useEffect(() => { writePrefs(prefs); }, [prefs]);

  // 🔄 Sincronización entre pestañas
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      setPrefs(readPrefs());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Sidebar ─────────────────────────────────────────────────
  //   Abrir sidebar SIEMPRE cierra el footer (exclusión garantizada acá).
  const openSidebar = useCallback(() => {
    setPrefs(() => ({ sidebarOpen: true, footerVisible: false }));
  }, []);
  const closeSidebar = useCallback(() => {
    setPrefs((p) => ({ ...p, sidebarOpen: false }));
  }, []);
  const setSidebarOpen = useCallback((open) => {
    if (open) openSidebar(); else closeSidebar();
  }, [openSidebar, closeSidebar]);
  const toggleSidebar = useCallback(() => {
    setPrefs((p) => p.sidebarOpen
      ? { ...p, sidebarOpen: false }           // cerrar
      : { sidebarOpen: true, footerVisible: false } // abrir → cierra footer
    );
  }, []);

  // ── Footer ──────────────────────────────────────────────────
  //   Mostrar footer SIEMPRE cierra el sidebar.
  const showFooter = useCallback(() => {
    setPrefs(() => ({ footerVisible: true, sidebarOpen: false }));
  }, []);
  const hideFooter = useCallback(() => {
    setPrefs((p) => ({ ...p, footerVisible: false }));
  }, []);
  const setFooterVisible = useCallback((v) => {
    if (v) showFooter(); else hideFooter();
  }, [showFooter, hideFooter]);
  const toggleFooter = useCallback(() => {
    setPrefs((p) => p.footerVisible
      ? { ...p, footerVisible: false }          // esconder
      : { footerVisible: true, sidebarOpen: false } // mostrar → cierra sidebar
    );
  }, []);

  return {
    // sidebar
    sidebarOpen: prefs.sidebarOpen,
    setSidebarOpen, openSidebar, closeSidebar, toggleSidebar,
    // footer
    footerVisible: prefs.footerVisible,
    setFooterVisible, showFooter, hideFooter, toggleFooter,
  };
}

// ════════════════════════════════════════════════════════════════════
// 🧠 ACORDEONES DEL SIDEBAR con memoria propia.
//    Guarda qué grupos (Cartera, Finanzas, Gerencia) están abiertos.
//    👉 Primera vez: TODOS cerrados (lo que pediste).
//    👉 Si el usuario abre uno, se recuerda y la próxima vez sigue abierto.
//    👉 Clave separada "thames.menu.accordions" (no pisa las prefs del menú).
//    👉 Se sincroniza entre pestañas.
// ════════════════════════════════════════════════════════════════════
const ACC_KEY = "thames.menu.accordions";

// Por defecto: nada abierto (objeto vacío → todos cerrados).
function readAccordions() {
  try {
    const raw = localStorage.getItem(ACC_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccordions(state) {
  try {
    localStorage.setItem(ACC_KEY, JSON.stringify(state || {}));
  } catch {
    /* incógnito / storage lleno → ignoramos */
  }
}

export function useAccordionPrefs() {
  const [openGroups, setOpenGroups] = useState(() => readAccordions());

  useEffect(() => { writeAccordions(openGroups); }, [openGroups]);

  // 🔄 Sincronización entre pestañas
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== ACC_KEY) return;
      setOpenGroups(readAccordions());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ¿Está abierto ese grupo? (por defecto: NO)
  const isOpen = useCallback((id) => Boolean(openGroups[id]), [openGroups]);

  // Abrir/cerrar un grupo y recordar la elección.
  const toggleGroup = useCallback((id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return { openGroups, isOpen, toggleGroup };
}

export default useMenuPrefs;