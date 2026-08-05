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

export default useMenuPrefs;