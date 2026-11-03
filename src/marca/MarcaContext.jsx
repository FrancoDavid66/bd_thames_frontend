// src/marca/MarcaContext.jsx
//
// 🏷️ LA MARCA ACTIVA DE LA APP (THAMES o MALVINAS).
//
//   const marca = useMarca();
//   marca.nombre   → "Thames Seguros" | "Malvinas"
//   marca.logo     → el logo cuadrado
//   marca.id       → "thames" | "malvinas"
//
// ¿De dónde sale?
//   1) Una pantalla puede FORZAR una marca mientras está abierta
//      (el portal del cliente usa la de la oficina del cliente, no la del
//       que tiene la sesión abierta en esa compu).          → useForzarMarca()
//   2) El usuario logueado → la de su oficina.
//   3) Sin usuario (login): la dirección web o la última de esta compu.
//   4) THAMES.
//
// Además, cuando la marca no es THAMES, pinta la app: cambia los colores
// (variables de index.css), el título de la pestaña y el iconito.
// Con THAMES deja todo exactamente como estaba.

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  THAMES,
  marcaDelUsuario,
  marcaDelDominio,
  marcaGuardada,
  guardarMarcaDispositivo,
} from "./marcas";

const MarcaContext = createContext({ marca: THAMES, setForzada: () => {} });

const ESTILO_ID = "marca-colores";

/* 🎨 Arma el CSS de los colores de una marca. Va como <style> aparte:
   gana a los colores de index.css sin tocar ese archivo. */
function cssDeMarca(marca) {
  if (!marca?.colores) return "";
  const bloque = (vars) =>
    Object.entries(vars || {})
      .map(([k, v]) => `${k}:${v};`)
      .join("");
  const sel = `html[data-marca="${marca.id}"]`;
  return `${sel}{${bloque(marca.colores.claro)}}html.dark[data-marca="${marca.id}"]{${bloque(marca.colores.oscuro)}}`;
}

/* 🖼️ Título de la pestaña + iconito + colores. Con THAMES vuelve a lo de siempre. */
function aplicarMarca(marca) {
  if (typeof document === "undefined") return;
  const raiz = document.documentElement;
  const m = marca || THAMES;

  // Colores
  let estilo = document.getElementById(ESTILO_ID);
  const css = cssDeMarca(m);
  if (css) {
    if (!estilo) {
      estilo = document.createElement("style");
      estilo.id = ESTILO_ID;
      document.head.appendChild(estilo);
    }
    estilo.textContent = css;
    raiz.setAttribute("data-marca", m.id);
  } else {
    if (estilo) estilo.remove();
    raiz.removeAttribute("data-marca");
  }

  // Título de la pestaña
  if (m.tituloPestana) document.title = m.tituloPestana;

  // Iconito de la pestaña
  try {
    let icono = document.querySelector('link[rel="icon"]');
    if (!icono) {
      icono = document.createElement("link");
      icono.rel = "icon";
      document.head.appendChild(icono);
    }
    if (m.favicon && icono.getAttribute("href") !== m.favicon) {
      icono.setAttribute("type", "image/svg+xml");
      icono.setAttribute("href", m.favicon);
    }
  } catch {
    /* no es grave: queda el iconito anterior */
  }
}

export function MarcaProvider({ children }) {
  const { user } = useAuth() || {};
  const [forzada, setForzadaState] = useState(null);

  // La marca "de base": la del usuario, o la de la compu/dirección si no hay usuario.
  const base = useMemo(() => {
    if (user) return marcaDelUsuario(user) || THAMES;
    return marcaDelDominio() || marcaGuardada() || THAMES;
  }, [user]);

  // 💾 Recordamos en esta compu la marca del último que entró (para el login).
  //    Solo cuando hay usuario: si no, quedaría pisada por la de fábrica.
  useEffect(() => {
    if (user) guardarMarcaDispositivo(base);
  }, [user, base]);

  const marca = forzada || base;

  // useLayoutEffect: se pinta ANTES de que se vea la pantalla (sin parpadeo).
  useLayoutEffect(() => {
    aplicarMarca(marca);
  }, [marca]);

  const setForzada = useCallback((m) => setForzadaState(m || null), []);
  const valor = useMemo(() => ({ marca, setForzada }), [marca, setForzada]);

  return <MarcaContext.Provider value={valor}>{children}</MarcaContext.Provider>;
}

/** La marca activa (siempre devuelve una: THAMES si no hay otra). */
export function useMarca() {
  return useContext(MarcaContext).marca || THAMES;
}

/**
 * Fuerza una marca mientras el componente está en pantalla.
 * Al salir, vuelve sola la del usuario.
 *   useForzarMarca(marcaDelCliente)  // en el portal
 * Pasarle null no fuerza nada.
 */
export function useForzarMarca(marca) {
  const { setForzada } = useContext(MarcaContext);
  const id = marca?.id || null;
  useEffect(() => {
    if (!id) return undefined;
    setForzada(marca);
    return () => setForzada(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, setForzada]);
}
