// src/hooks/useDatosVivos.js
// ============================================================
// 📡 DATOS EN VIVO — la pantalla se "anota" en el cartero.
//
// Uso:
//   const recargando = useDatosVivos(["caja"], () => recargarEnSilencio());
//
// Mientras la pantalla está abierta, si cambió algo de sus temas (lo guardó
// otra persona u otra oficina), el cartero llama a recargar(). Al salir de la
// pantalla se desanota solo → deja de pedir datos.
//
// Devuelve `recargando` (true mientras dura una recarga EN VIVO, si recargar()
// devuelve una promesa): sirve para NO mostrar el "Cargando…" en esas
// recargas y que la tabla no parpadee.
//
// Opciones:
//   activo: false  → no se anota (ej: todavía no hay nada buscado).
//   siempre: true  → avisa aunque haya un formulario abierto (contadores).
//   cadaMs: 60000  → como mucho 1 recarga por minuto (pantallas pesadas):
//                    los avisos que llegan en el medio se juntan en una sola.
//
// Temas (los mismos del servidor, notificaciones/novedades.py):
//   polizas · cupones · cuotas · pagos · caja · recaudacion · clientes ·
//   solicitudes · siniestros · bajas · tareas · servicios · legales ·
//   mensajes · ranking · cotizaciones
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { suscribir } from "../services/vivo";

export default function useDatosVivos(dominios, recargar, opciones = {}) {
  const fnRef = useRef(recargar);
  fnRef.current = recargar;
  const [recargando, setRecargando] = useState(false);

  const lista = Array.isArray(dominios) ? dominios : [dominios];
  const clave = lista.filter(Boolean).slice().sort().join(",");
  const activo = opciones.activo !== false;
  const siempre = !!opciones.siempre;
  const cadaMs = Number(opciones.cadaMs) || 0;

  useEffect(() => {
    if (!activo || !clave) return undefined;
    let vivo = true;
    let ultima = 0;
    let espera = null;
    let juntados = new Set();

    const correr = () => {
      espera = null;
      const cambiados = [...juntados];
      juntados = new Set();
      ultima = Date.now();
      let r;
      try {
        r = fnRef.current?.(cambiados);
      } catch (e) {
        console.warn("[vivo] error al recargar:", e);
      }
      if (r && typeof r.then === "function") {
        setRecargando(true);
        Promise.resolve(r)
          .catch(() => {})
          .finally(() => {
            if (vivo) setRecargando(false);
          });
      }
    };

    const salir = suscribir(
      clave.split(","),
      (cambiados) => {
        (cambiados || []).forEach((d) => juntados.add(d));
        if (espera) return; // ya hay una recarga programada: se junta ahí
        const falta = cadaMs - (Date.now() - ultima);
        if (falta > 0) espera = setTimeout(correr, falta);
        else correr();
      },
      { siempre }
    );
    return () => {
      vivo = false;
      clearTimeout(espera);
      salir();
    };
  }, [clave, activo, siempre, cadaMs]);

  return recargando;
}

/**
 * 🟢 Marca "NUEVO" las filas que aparecieron por una recarga EN VIVO.
 *
 *   const { nuevos, marcar } = useResaltarNuevos(items, (it) => it.id);
 *   useDatosVivos(["caja"], () => { marcar(); return recargar(); });
 *   ... <tr className={nuevos.has(it.id) ? "bg-duo-verde/10" : ""}>
 *
 * marcar() se llama justo ANTES de recargar: guarda qué filas había. Cuando
 * llegan las filas nuevas, las que no estaban quedan en `nuevos` unos segundos.
 * olvidar() descarta esa foto (ej: la recarga falló, o el usuario cambió de
 * filtro/página): así no se marcan como NUEVO filas que no lo son.
 */
export function useResaltarNuevos(items, getKey, duracionMs = 8000) {
  const [nuevos, setNuevos] = useState(() => new Set());
  const antesRef = useRef(null);
  const timerRef = useRef(null);
  const keyRef = useRef(getKey);
  keyRef.current = getKey;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // marcar() devuelve la "foto" que sacó; olvidar(foto) borra solo esa (así una
  // recarga vieja que falla no le borra la foto a una más nueva). olvidar() sin
  // nada borra cualquiera.
  const marcar = useCallback(() => {
    const lista = Array.isArray(itemsRef.current) ? itemsRef.current : [];
    const foto = { claves: new Set(lista.map((it) => keyRef.current(it))) };
    antesRef.current = foto;
    return foto;
  }, []);

  const olvidar = useCallback((foto) => {
    if (!foto || antesRef.current === foto) antesRef.current = null;
  }, []);

  useEffect(() => {
    const foto = antesRef.current;
    if (!foto) return;
    antesRef.current = null;
    const antes = foto.claves;
    const lista = Array.isArray(items) ? items : [];
    const n = new Set(lista.map((it) => keyRef.current(it)).filter((k) => k != null && !antes.has(k)));
    if (!n.size) return;
    setNuevos(n);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNuevos(new Set()), duracionMs);
  }, [items, duracionMs]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { nuevos, marcar, olvidar };
}
