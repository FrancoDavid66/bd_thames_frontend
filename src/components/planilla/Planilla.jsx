// src/components/planilla/Planilla.jsx
//
// 🎨 PLANILLA DE COLORES (09/10 — Franco eligió el diseño 3, estilo Monday.com).
// La usan Gestoría, Legales y Siniestros (oficina, admin, gestor y abogado).
//
//   - Dos vistas arriba:
//       🔥 Para hoy → lo que necesita algo, en 3 grupos: 🔴 Urgente · 🟠 Para hoy ·
//                     🔵 Para revisar (+ ⏳ Esperando a otros, cerrado).
//       📋 Todos    → agrupado por estado, cada estado con su color (+ Terminados).
//   - Cada fila: nombre · ESTADO (un color fuerte) · columnas de la sección · hace
//     cuánto · lo que sigue.
//   - Tocás el COLOR → sale el menú «Pasar a…» (en la compu un globo, en el celu una
//     hoja de abajo). Si hace falta un dato (ej: "¿Qué pidió el registro?") el mismo
//     menú se convierte en la pregunta. Se guarda ahí mismo, sin abrir nada.
//   - Tocás el NOMBRE → se abre el panel del costado (Novedades · Datos · Papeles) con
//     el botón «Ficha completa». En el celu el panel ocupa toda la pantalla y el botón
//     «Atrás» del celu lo cierra (queda en la dirección: ?ver=12).
//
// Cada sección arma un "adaptador" (a) con sus datos y sus reglas (ver PlanillaGestoria,
// PlanillaLegales y PlanillaSiniestros). Lo que entiende la planilla:
//   a.clave, a.titulo, a.icono, a.color, a.mostrarTitulo, a.item, a.items
//   a.filas (null = cargando), a.error, a.recargar()
//   a.estados {ID: {n, c}}, a.grupos [{id, n, c}], a.estadoDe(it), a.etiquetaEstado(it),
//   a.colorEstado(it), a.abierto(it)  (¿se puede tocar el color?)
//   a.terminados {n, c, cargar(page) → {results, next}}   (grupo «Terminados», se pide al abrirlo)
//   a.claveDe(it), a.nombre(it), a.sub(it), a.marcas(it) → [{txt, tono}]
//   a.columnas [{titulo, ancho, render(it)}], a.dias(it), a.diasTitulo, a.demorado(it)
//   a.sigue(it), a.tareas(it) → [{tono: rojo|ambar|azul, txt}], a.buscar(it) → texto
//   a.filtros [{id, etiqueta, opciones: [[valor, texto]], pasa(it, valor)}]
//   a.menu(it, det) → {aviso, opciones, extras}   ·   a.ejecutar(it, op, vals, det) → Promise
//   a.nuevo {txt, onClick}, a.arriba (un aviso arriba de todo), a.vista / a.onVista,
//   a.derechaTitulo (ej: el botón «Mi perfil» del abogado), a.esTerminado(it), a.subCelu(it)
//   a.panel {cargar, novedades, puedeAnotar, anotar, opcionCliente, datos, papeles, acciones, pie, ficha}
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiChevronDown, HiChevronRight, HiMagnifyingGlass, HiPlus, HiXMark } from "react-icons/hi2";

import { useEsEscritorio } from "../../hooks/useMediaQuery";
import MenuEstado, { campoQueFalta, valorCampo, valoresIniciales } from "./MenuEstado";
import PanelPlanilla from "./PanelPlanilla";
import { BotonEstado, Marca, estadoVisible } from "./PiezasPlanilla";
import { ORDEN_TONO, TONOS, coincide, guardarSesion, leerSesion, mensajeDe, peorTono, textoHace } from "./planillaUtils";

const SIN_FILAS = [];
const claveDe = (a, it) => String(a.claveDe ? a.claveDe(it) : it?.id);

function FilaPC({ a, it, k, color, sigue, plantilla, onAbrir, onMenu, menuActivo }) {
  const dias = a.dias ? a.dias(it) : 0;
  const dem = a.demorado ? a.demorado(it) : false;
  const marcas = a.marcas ? a.marcas(it) || [] : [];
  return (
    <div
      data-fila={k}
      className="grid border-b border-linea dark:border-linea-dark text-[13px] last:border-b-0 hover:bg-surface/60 dark:hover:bg-white/[0.02]"
      style={{ gridTemplateColumns: plantilla, boxShadow: `inset 6px 0 0 ${color}` }}
    >
      <button
        type="button"
        onClick={() => onAbrir(it)}
        className="group flex min-w-0 flex-col justify-center gap-0.5 border-r border-linea dark:border-linea-dark py-2 pl-5 pr-3 text-left hover:bg-surface dark:hover:bg-surface-dark"
        aria-label={`Abrir ${a.nombre(it)}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <b className="truncate text-[14px] text-titulo group-hover:underline dark:text-titulo-dark">{a.nombre(it) || "Sin nombre"}</b>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <small className="truncate text-[12px] text-suave dark:text-suave-dark">{a.sub ? a.sub(it) : ""}</small>
          {marcas.slice(0, 2).map((m) => (
            <Marca key={m.txt} tono={m.tono}>
              {m.txt}
            </Marca>
          ))}
        </span>
      </button>
      <div className="border-r border-linea dark:border-linea-dark">
        <BotonEstado a={a} it={it} onMenu={onMenu} activo={menuActivo} />
      </div>
      {(a.columnas || []).map((c) => (
        <div key={c.titulo} className="flex min-w-0 items-center border-r border-linea dark:border-linea-dark px-3 py-2">
          {c.render(it)}
        </div>
      ))}
      <div className={`flex items-center justify-center border-r border-linea dark:border-linea-dark px-2 text-[12.5px] ${dem ? "font-bold text-duo-rojo" : "text-suave dark:text-suave-dark"}`}>
        {textoHace(dias)}
      </div>
      <div className="flex min-w-0 items-center px-3 py-2 text-[12.5px] leading-snug text-suave dark:text-suave-dark">
        <span className="line-clamp-2">{sigue}</span>
      </div>
    </div>
  );
}

function FilaCelu({ a, it, k, color, sigue, onAbrir, onMenu, menuActivo }) {
  const dias = a.dias ? a.dias(it) : 0;
  const dem = a.demorado ? a.demorado(it) : false;
  const marcas = a.marcas ? a.marcas(it) || [] : [];
  return (
    <div data-fila={k} className="flex items-stretch gap-2 border-b border-linea dark:border-linea-dark py-2 pl-4 pr-2 last:border-b-0" style={{ boxShadow: `inset 5px 0 0 ${color}` }}>
      <button type="button" onClick={() => onAbrir(it)} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left" aria-label={`Abrir ${a.nombre(it)}`}>
        <b className="line-clamp-1 text-[14.5px] text-titulo dark:text-titulo-dark">{a.nombre(it) || "Sin nombre"}</b>
        <small className="line-clamp-1 text-[12.5px] text-suave dark:text-suave-dark">{a.subCelu ? a.subCelu(it) : a.sub ? a.sub(it) : ""}</small>
        {sigue ? <small className="line-clamp-2 text-[12.5px] text-titulo dark:text-titulo-dark">👉 {sigue}</small> : null}
        {marcas.length > 0 && (
          <span className="mt-0.5 flex flex-wrap gap-1">
            {marcas.slice(0, 3).map((m) => (
              <Marca key={m.txt} tono={m.tono}>
                {m.txt}
              </Marca>
            ))}
          </span>
        )}
      </button>
      <div className="flex w-[118px] shrink-0 flex-col items-stretch justify-center gap-1">
        <BotonEstado a={a} it={it} onMenu={onMenu} celu activo={menuActivo} />
        <small className={`text-center text-[11.5px] ${dem ? "font-bold text-duo-rojo" : "text-suave dark:text-suave-dark"}`}>{textoHace(dias)}</small>
      </div>
    </div>
  );
}

function CabeceraGrupo({ g, cerrado, onTocar, a }) {
  const n = g.filas.length;
  return (
    <button type="button" onClick={onTocar} aria-expanded={!cerrado} className="flex w-full items-center gap-2 py-1.5 text-left">
      {cerrado ? <HiChevronRight className="h-4 w-4 shrink-0" style={{ color: g.c }} /> : <HiChevronDown className="h-4 w-4 shrink-0" style={{ color: g.c }} />}
      <b className="text-[15.5px]" style={{ color: g.c }}>
        {g.ic ? `${g.ic} ` : ""}
        {g.n}
      </b>
      <span className="text-[12.5px] font-medium text-suave dark:text-suave-dark">
        {g.lazy && !g.cargado ? (g.total != null ? `${g.total} ${g.total === 1 ? a.item : a.items}` : "tocá para ver") : `${n}${g.hayMas ? "+" : ""} ${n === 1 ? a.item : a.items}`}
      </span>
      {g.sub ? <span className="hidden text-[12.5px] text-suave dark:text-suave-dark sm:inline">· {g.sub}</span> : null}
    </button>
  );
}

function Cargando() {
  return (
    <div className="flex flex-col gap-4" aria-label="Cargando">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-5 w-40 animate-pulse rounded bg-linea dark:bg-linea-dark" />
          <div className="h-[140px] animate-pulse rounded-xl bg-linea/60 dark:bg-linea-dark/60" />
        </div>
      ))}
    </div>
  );
}

/** Dónde va el globo del menú (debajo del color; si no entra, arriba). */
function posicionGlobo(el) {
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  const W = Math.min(340, window.innerWidth - 16);
  const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
  const abajo = window.innerHeight - r.bottom - 14;
  const arriba = r.top - 14;
  if (abajo >= 320 || abajo >= arriba) return { left, top: r.bottom + 6, maxHeight: Math.max(180, abajo), width: W };
  return { left, bottom: window.innerHeight - r.top + 6, maxHeight: Math.max(180, arriba), width: W };
}

export default function Planilla({ a }) {
  const esPC = useEsEscritorio();
  const navigate = useNavigate();
  const location = useLocation();
  const [sp, setSp] = useSearchParams();
  const clave = a.clave || "planilla";

  // ── Vista (🔥 Para hoy / 📋 Todos): la manda la página o se recuerda en la sesión ──
  const [vistaPropia, setVistaPropia] = useState(() => leerSesion(`${clave}:vista`, a.vistaInicial || "hoy"));
  const vista = a.vista || vistaPropia;
  const cambiarVista = (v) => {
    if (a.onVista) a.onVista(v);
    else {
      setVistaPropia(v);
      guardarSesion(`${clave}:vista`, v);
    }
  };

  const [q, setQ] = useState(() => leerSesion(`${clave}:q`, ""));
  const [filtros, setFiltros] = useState(() => leerSesion(`${clave}:filtros`, {}));
  const [cerrados, setCerrados] = useState(() => leerSesion(`${clave}:cerrados`, { fin: true, esperando: true }));
  useEffect(() => guardarSesion(`${clave}:q`, q), [clave, q]);
  useEffect(() => guardarSesion(`${clave}:filtros`, filtros), [clave, filtros]);
  const tocarGrupo = (id) =>
    setCerrados((c) => {
      const n = { ...c, [id]: !c[id] };
      guardarSesion(`${clave}:cerrados`, n);
      return n;
    });

  // ── Terminados (se piden recién al abrir el grupo) ──
  const [fin, setFin] = useState({ lista: [], pagina: 0, next: null, cargando: false, error: "", cargado: false, total: null });
  const cargarFin = useCallback(
    async (pagina = 1) => {
      if (!a.terminados?.cargar) return;
      setFin((f) => ({ ...f, cargando: true, error: "" }));
      try {
        const r = await a.terminados.cargar(pagina);
        setFin((f) => ({
          lista: pagina === 1 ? r.results || [] : [...f.lista, ...(r.results || [])],
          pagina,
          next: r.next || null,
          cargando: false,
          error: "",
          cargado: true,
          total: r.count ?? f.total,
        }));
      } catch (e) {
        setFin((f) => ({ ...f, cargando: false, error: mensajeDe(e, "No se pudieron traer los terminados.") }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a.terminados?.cargar]
  );
  const finAbierto = !!a.terminados && !cerrados.fin && vista === "todos";
  useEffect(() => {
    if (finAbierto && !fin.cargado && !fin.cargando && !fin.error) cargarFin(1);
  }, [finAbierto, fin.cargado, fin.cargando, fin.error, cargarFin]);

  // ── Filtrar ──
  const filas = a.filas || SIN_FILAS;
  const pasa = useCallback(
    (it) => {
      if (q.trim() && !coincide(a.buscar ? a.buscar(it) : a.nombre(it), q)) return false;
      for (const f of a.filtros || []) {
        const v = filtros[f.id];
        if (v && !f.pasa(it, v)) return false;
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, filtros, a.filtros, a.buscar]
  );
  const visibles = useMemo(() => filas.filter(pasa), [filas, pasa]);
  // Los terminados que vienen en la misma lista (Siniestros: CERRADO) no van a «Para hoy».
  const abiertos = useMemo(() => (a.esTerminado ? visibles.filter((it) => !a.esTerminado(it)) : visibles), [visibles, a]);
  const porDias = useCallback((x, y) => (a.dias ? a.dias(y) - a.dias(x) : 0), [a]);

  // ── Tareas de hoy (cada fila va al grupo de su tarea más urgente) ──
  const conTareas = useMemo(
    () =>
      abiertos.map((it) => {
        const t = a.tareas ? a.tareas(it) || [] : [];
        const tono = peorTono(t);
        return { it, tono, txt: tono ? t.find((x) => x.tono === tono)?.txt : "" };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [abiertos, a.tareas]
  );
  const nHoy = conTareas.filter((x) => x.tono).length;

  const grupos = useMemo(() => {
    if (vista === "hoy") {
      const G = ORDEN_TONO.map((t) => ({
        id: t,
        n: TONOS[t].n,
        ic: TONOS[t].ic,
        c: TONOS[t].c,
        filas: conTareas.filter((x) => x.tono === t).map((x) => x.it).sort(porDias),
        sigue: Object.fromEntries(conTareas.filter((x) => x.tono === t).map((x) => [claveDe(a, x.it), x.txt])),
      })).filter((g) => g.filas.length);
      const espera = conTareas.filter((x) => !x.tono);
      if (espera.length) {
        G.push({
          id: "esperando",
          n: "Esperando a otros",
          ic: "⏳",
          c: "#94a3b8",
          sub: "no hay que hacer nada",
          filas: espera.map((x) => x.it).sort(porDias),
        });
      }
      return G;
    }
    const G = (a.grupos || []).map((g) => ({ ...g, filas: visibles.filter((it) => a.estadoDe(it) === g.id).sort(porDias) }));
    if (a.terminados) {
      G.push({
        id: "fin",
        n: a.terminados.n || "Terminados",
        c: a.terminados.c || "#94a3b8",
        ic: "🏁",
        lazy: true,
        cargado: fin.cargado,
        total: fin.total,
        hayMas: !!fin.next,
        filas: fin.lista.filter(pasa),
      });
    }
    return G;
  }, [vista, conTareas, visibles, a, porDias, fin, pasa]);

  // ── Panel del costado (?ver=12 en la dirección) ──
  const verId = sp.get("ver");
  const [panel, setPanel] = useState({ id: null, it: null, det: null, cargando: false, error: "" });
  const [tab, setTab] = useState("nov");
  const buscarIt = useCallback((id) => filas.find((x) => claveDe(a, x) === id) || fin.lista.find((x) => claveDe(a, x) === id) || null, [filas, fin.lista, a]);
  const pedidoPanel = useRef(0);
  const cargarPanel = useCallback(
    async (id, silencioso = false) => {
      if (!a.panel?.cargar || !id) return;
      const n = ++pedidoPanel.current;
      if (!silencioso) setPanel((p) => ({ ...p, cargando: true, error: "" }));
      try {
        const det = await a.panel.cargar(id);
        if (n !== pedidoPanel.current) return;
        setPanel((p) => (p.id === id ? { ...p, det, cargando: false, error: "" } : p));
      } catch (e) {
        if (n !== pedidoPanel.current) return;
        setPanel((p) => (p.id === id ? { ...p, cargando: false, error: silencioso && p.det ? "" : mensajeDe(e, "No se pudo abrir.") } : p));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a.panel?.cargar]
  );
  useEffect(() => {
    if (!verId) {
      setPanel((p) => (p.id ? { id: null, it: null, det: null, cargando: false, error: "" } : p));
      return;
    }
    setPanel((p) => {
      if (p.id === verId) {
        const it = buscarIt(verId);
        return it && it !== p.it ? { ...p, it } : p;
      }
      return { id: verId, it: buscarIt(verId), det: null, cargando: true, error: "" };
    });
  }, [verId, buscarIt]);
  useEffect(() => {
    if (panel.id) cargarPanel(panel.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.id]);
  // Si la lista cambió (en vivo), el panel abierto se pone al día sin parpadear.
  const filasAntes = useRef(a.filas);
  useEffect(() => {
    if (filasAntes.current !== a.filas && panel.id && panel.det) cargarPanel(panel.id, true);
    filasAntes.current = a.filas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.filas]);

  const abrirPanel = (it, pestana = "nov") => {
    const id = claveDe(a, it);
    setTab(pestana);
    if (verId === id) return;
    const p = new URLSearchParams(sp);
    p.set("ver", id);
    // Si ya había uno abierto, se reemplaza (así «Atrás» vuelve a la lista, no al anterior).
    setSp(p, { replace: !!verId, state: { planilla: true } });
  };
  const cerrarPanel = () => {
    setMenu(null);
    if (location.state?.planilla) navigate(-1);
    else {
      const p = new URLSearchParams(sp);
      p.delete("ver");
      setSp(p, { replace: true });
    }
  };

  // ── Menú del color ──
  const [menu, setMenu] = useState(null); // {id, it, el, desde, op?, vals?, enviando?}
  const menuRef = useRef(null);
  menuRef.current = menu;
  const globoRef = useRef(null);
  const [, setTick] = useState(0);
  const abrirMenu = (it, el, desde = "fila") => {
    const id = claveDe(a, it);
    if (menu && menu.id === id && menu.desde === desde && !menu.op) return setMenu(null);
    setMenu({ id, it, el, desde });
  };
  const cerrarMenu = () => {
    if (menuRef.current?.enviando) return;
    setMenu(null);
  };
  // Globo de la compu: sigue al color si se mueve la página; si se va de la vista (sin pregunta abierta), se cierra.
  useEffect(() => {
    if (!menu || !esPC) return undefined;
    const mover = (e) => {
      if (globoRef.current && e?.target instanceof Node && globoRef.current.contains(e.target)) return;
      const m = menuRef.current;
      if (!m) return;
      const r = m.el?.isConnected ? m.el.getBoundingClientRect() : null;
      if (!m.op && (!r || r.bottom < 0 || r.top > window.innerHeight)) setMenu(null);
      else setTick((n) => n + 1);
    };
    window.addEventListener("scroll", mover, true);
    window.addEventListener("resize", mover);
    return () => {
      window.removeEventListener("scroll", mover, true);
      window.removeEventListener("resize", mover);
    };
  }, [menu, esPC]);

  // Esc: cierra el menú; si no hay menú, el panel (si hay una ventanita abierta encima, no hace nada).
  useEffect(() => {
    const tecla = (e) => {
      if (e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-planilla])')) return;
      if (menuRef.current) cerrarMenu();
      else if (verId) cerrarPanel();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // Celu: con el panel o la hoja abiertos, la página de atrás no se mueve.
  const tapa = (!esPC && (!!verId || !!menu)) || (esPC && !!verId);
  useEffect(() => {
    if (!tapa) return undefined;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [tapa]);

  const detDe = (id) => (panel.id === id ? panel.det : null);

  const ejecutar = async (it, op, vals) => {
    const id = claveDe(a, it);
    setMenu((m) => (m ? { ...m, enviando: true } : m));
    try {
      const r = await a.ejecutar(it, op, vals, detDe(id));
      setMenu(null);
      if (r !== false) toast.success(typeof r === "string" ? r : op.ok || "¡Listo! Guardado");
      await Promise.resolve(a.recargar?.()).catch(() => {});
      if (panel.id === id) cargarPanel(id, true);
      if (fin.cargado) cargarFin(1); // pudo entrar o salir de «Terminados»
    } catch (e) {
      setMenu((m) => (m ? { ...m, enviando: false } : m));
      toast.error(mensajeDe(e), { duration: 6000 });
    }
  };

  const elegir = (op) => {
    const m = menuRef.current;
    if (!m) return;
    if (op.deshabilitado) {
      toast(op.deshabilitado, { icon: "👉" });
      return;
    }
    if (op.abrirPanel) {
      // «Anotar algo», «Subir un papel», «Avisar por WhatsApp»: se hace en el panel.
      setMenu(null);
      abrirPanel(m.it, op.abrirPanel === true ? "nov" : op.abrirPanel);
      return;
    }
    if (op.onClick) {
      setMenu(null);
      op.onClick(m.it, detDe(m.id));
      return;
    }
    if (op.ask?.length) {
      setMenu({ ...m, op, vals: valoresIniciales(op) });
      return;
    }
    ejecutar(m.it, op, {});
  };
  const confirmar = () => {
    const m = menuRef.current;
    if (!m?.op || m.enviando) return;
    const falta = campoQueFalta(m.op, m.vals);
    if (falta) {
      toast.error(`Falta: ${String(falta.l).replace(/[¿?]/g, "")}`);
      return;
    }
    const vals = Object.fromEntries((m.op.ask || []).map((c) => [c.k, valorCampo(c, m.vals)]));
    ejecutar(m.it, m.op, vals);
  };

  // ── Lo que se ve ──
  const cols = a.columnas || [];
  const plantilla = `minmax(230px,2.4fr) 178px ${cols.map((c) => c.ancho || "140px").join(" ")} 124px minmax(170px,2fr)`;
  const minAncho = 230 + 178 + cols.reduce((s, c) => s + (parseInt(c.ancho, 10) || 140), 0) + 124 + 170;
  const estilo = { "--acc": a.color || "#5b52e6" };

  const menuIt = menu ? buscarIt(menu.id) || menu.it : null;
  const menuCuerpo = menu && menuIt && (
    <MenuEstado
      a={a}
      it={menuIt}
      det={detDe(menu.id)}
      menu={menu}
      onElegir={elegir}
      onVals={(fn) => setMenu((m) => (m ? { ...m, vals: fn(m.vals || {}) } : m))}
      onConfirmar={confirmar}
      onCancelar={() => setMenu((m) => (m ? { ...m, op: null, vals: null } : m))}
    />
  );
  const globo = esPC && menu ? posicionGlobo(menu.el) : null;


  return (
    <div className="flex flex-col gap-3" style={estilo}>
      {a.mostrarTitulo && (
        <div className="flex items-center gap-2.5 px-0.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[18px] text-white" style={{ background: a.color }} aria-hidden="true">
            {a.icono}
          </span>
          <h1 className="text-[21px] font-extrabold text-titulo dark:text-titulo-dark">{a.titulo}</h1>
          {a.filas && <span className="text-[13px] text-suave dark:text-suave-dark">· {a.esTerminado ? a.filas.filter((x) => !a.esTerminado(x)).length : a.filas.length} abiertos</span>}
          {a.derechaTitulo ? <div className="ml-auto">{a.derechaTitulo}</div> : null}
        </div>
      )}

      {a.arriba || null}

      {/* Vistas + buscar + filtros + nuevo */}
      <div className="flex flex-col gap-2 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 pt-1.5 shadow-sm lg:flex-row lg:items-center lg:gap-3 lg:py-1.5">
        <div className="flex items-center gap-1">
          <div role="tablist" aria-label="Vista" className="flex flex-1 gap-1">
            {[
              ["hoy", "🔥 Para hoy", nHoy],
              ["todos", "📋 Todos", abiertos.length],
            ].map(([v, txt, n]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                onClick={() => cambiarVista(v)}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-[3px] px-2.5 py-2.5 text-[14px] font-bold transition-colors lg:mb-0 ${
                  vista === v ? "border-[var(--acc)] text-titulo dark:text-titulo-dark" : "border-transparent text-suave hover:text-titulo dark:text-suave-dark dark:hover:text-titulo-dark"
                }`}
              >
                {txt}
                {a.filas && <span className="rounded-full bg-surface dark:bg-surface-dark px-1.5 text-[11.5px] font-extrabold text-suave dark:text-suave-dark">{n}</span>}
              </button>
            ))}
          </div>
          {a.nuevo && (
            <button
              type="button"
              onClick={a.nuevo.onClick}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--acc)] px-3 py-2 text-[13.5px] font-bold text-white shadow-sm hover:brightness-110 lg:hidden"
            >
              <HiPlus className="h-4 w-4" aria-hidden="true" /> Nuevo
            </button>
          )}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 pb-2.5 lg:justify-end lg:pb-0">
          <label className="relative flex min-w-0 basis-full items-center lg:max-w-[300px] lg:flex-1 lg:basis-auto">
            <HiMagnifyingGlass className="pointer-events-none absolute left-3 h-4 w-4 text-suave dark:text-suave-dark" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={a.buscarPh || "Buscar"}
              aria-label="Buscar"
              className="w-full rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark py-2 pl-9 pr-3 text-[14px] text-titulo dark:text-titulo-dark outline-none placeholder:text-suave dark:placeholder:text-suave-dark focus:border-[var(--acc)]"
            />
          </label>
          {(a.filtros || []).map((f) => (
            <select
              key={f.id}
              value={filtros[f.id] || ""}
              onChange={(e) => setFiltros((x) => ({ ...x, [f.id]: e.target.value }))}
              aria-label={f.etiqueta}
              className={`min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-[13.5px] font-semibold outline-none lg:max-w-[200px] lg:flex-none ${
                filtros[f.id] ? "border-[var(--acc)] bg-[var(--acc)]/10 text-titulo dark:text-titulo-dark" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark"
              }`}
            >
              <option value="">{f.etiqueta}: todos</option>
              {f.opciones.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          ))}
          {(q || Object.values(filtros).some(Boolean)) && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setFiltros({});
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-[13px] font-semibold text-suave hover:text-titulo dark:text-suave-dark dark:hover:text-titulo-dark"
            >
              <HiXMark className="h-4 w-4" aria-hidden="true" /> Limpiar
            </button>
          )}
          {a.nuevo && (
            <button
              type="button"
              onClick={a.nuevo.onClick}
              className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-[var(--acc)] px-3.5 py-2 text-[14px] font-bold text-white shadow-sm hover:brightness-110 lg:inline-flex"
            >
              <HiPlus className="h-4 w-4" aria-hidden="true" /> {a.nuevo.txt}
            </button>
          )}
        </div>
      </div>

      {/* La planilla */}
      {a.error && !a.filas ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-4 text-[14px] text-duo-rojo">
          {a.error}
          <button type="button" onClick={() => a.recargar?.()} className="rounded-lg border border-duo-rojo/40 bg-card dark:bg-card-dark px-3 py-1.5 font-semibold">
            Probar de nuevo
          </button>
        </div>
      ) : !a.filas ? (
        <Cargando />
      ) : (
        <div className="flex flex-col gap-4">
          {vista === "hoy" && nHoy === 0 && (
            <div className="rounded-xl border border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-4 py-3 text-[14px] font-semibold text-duo-verde-sombra dark:text-duo-verde">
              🎉 {q || Object.values(filtros).some(Boolean) ? "Con esta búsqueda no hay nada para hacer hoy." : `Todo al día: ningún ${a.item} necesita algo hoy.`}
            </div>
          )}
          {grupos.map((g) => {
            const cerrado = !!cerrados[g.id];
            return (
              <section key={g.id} className="flex flex-col gap-1">
                <CabeceraGrupo g={g} a={a} cerrado={cerrado} onTocar={() => tocarGrupo(g.id)} />
                {!cerrado && (
                  <div className="overflow-hidden rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm">
                    <div className={esPC ? "overflow-x-auto" : ""}>
                      <div style={esPC ? { minWidth: minAncho } : undefined}>
                        {esPC && g.filas.length > 0 && (
                          <div
                            aria-hidden="true"
                            className="grid border-b border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[11.5px] font-bold uppercase tracking-wide text-suave dark:text-suave-dark"
                            style={{ gridTemplateColumns: plantilla, boxShadow: `inset 6px 0 0 ${g.c}` }}
                          >
                            <span className="truncate py-2 pl-5">{a.item}</span>
                            <span className="truncate py-2 text-center">Estado</span>
                            {cols.map((c) => (
                              <span key={c.titulo} className="truncate px-3 py-2">
                                {c.titulo}
                              </span>
                            ))}
                            <span className="truncate px-1 py-2 text-center">{a.diasTitulo || "Hace"}</span>
                            <span className="truncate px-3 py-2">{vista === "hoy" && g.id !== "esperando" ? "Qué hay que hacer" : "Lo que sigue"}</span>
                          </div>
                        )}
                        {g.filas.map((it) => {
                          const k = claveDe(a, it);
                          const sigue = g.sigue?.[k] || (a.sigue ? a.sigue(it) : "");
                          const props = { a, it, k, color: g.c, sigue, onAbrir: (x) => abrirPanel(x), onMenu: (x, el) => abrirMenu(x, el, "fila"), menuActivo: !!menu && menu.id === k && menu.desde === "fila" };
                          return esPC ? <FilaPC key={k} {...props} plantilla={plantilla} /> : <FilaCelu key={k} {...props} />;
                        })}
                      </div>
                    </div>
                    {g.filas.length === 0 && !(g.lazy && fin.cargando) && !(g.lazy && fin.error) && (
                      <p className="px-5 py-3 text-[13px] text-suave dark:text-suave-dark" style={{ boxShadow: `inset 6px 0 0 ${g.c}55` }}>
                        {g.lazy && q ? "Ninguno con esta búsqueda (entre los que se ven)." : "Nada acá 👌"}
                      </p>
                    )}
                    {g.lazy && fin.cargando && <p className="px-5 py-3 text-[13px] text-suave dark:text-suave-dark">Cargando…</p>}
                    {g.lazy && fin.error && (
                      <p className="flex flex-wrap items-center gap-2 px-5 py-3 text-[13px] text-duo-rojo">
                        {fin.error}
                        <button type="button" onClick={() => cargarFin(fin.pagina + 1 || 1)} className="font-bold underline">
                          Probar de nuevo
                        </button>
                      </p>
                    )}
                    {g.lazy && fin.next && !fin.cargando && (
                      <button type="button" onClick={() => cargarFin(fin.next)} className="w-full border-t border-linea dark:border-linea-dark px-5 py-2.5 text-left text-[13px] font-bold text-[var(--acc)] hover:bg-surface dark:hover:bg-surface-dark">
                        Ver más terminados
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* 🗂️ El panel del costado */}
      {verId &&
        createPortal(
          <div style={estilo}>
            {esPC && <div className="fixed inset-0 z-[85] bg-slate-900/25" onClick={cerrarPanel} aria-hidden="true" />}
            <PanelPlanilla
              a={a}
              it={panel.it}
              id={verId}
              det={panel.det}
              cargando={panel.cargando}
              error={panel.error}
              tab={tab}
              setTab={setTab}
              esPC={esPC}
              onCerrar={cerrarPanel}
              onReintentar={() => cargarPanel(verId)}
              onRecargar={async () => {
                await cargarPanel(verId, true);
                await Promise.resolve(a.recargar?.()).catch(() => {});
              }}
              onMenu={(it, el) => abrirMenu(it, el, "panel")}
              menuActivo={!!menu && menu.desde === "panel"}
            />
          </div>,
          document.body
        )}

      {/* 🎨 El menú del color: globo (compu) u hoja de abajo (celu) */}
      {menu &&
        menuCuerpo &&
        createPortal(
          esPC ? (
            <div style={estilo}>
              <div className="fixed inset-0 z-[94]" onClick={cerrarMenu} aria-hidden="true" />
              {globo && (
                <div
                  ref={globoRef}
                  role="menu"
                  className="fixed z-[95] overflow-y-auto rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-2.5 shadow-[0_14px_36px_rgba(15,23,42,.25)]"
                  style={globo}
                >
                  {menuCuerpo}
                </div>
              )}
            </div>
          ) : (
            <div style={estilo}>
              <div className="fixed inset-0 z-[96] bg-black/40" onClick={cerrarMenu} aria-hidden="true" />
              <div
                role="dialog"
                aria-label="Cambiar estado"
                className="fixed inset-x-0 bottom-0 z-[97] flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-xl"
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
              >
                <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-linea dark:bg-linea-dark" aria-hidden="true" />
                <div className="flex items-start gap-2 px-4 pb-2 pt-2">
                  <div className="min-w-0 flex-1">
                    <b className="line-clamp-1 text-[16px] text-titulo dark:text-titulo-dark">{a.nombre(menuIt)}</b>
                    <p className="text-[12.5px] text-suave dark:text-suave-dark">
                      Ahora: <b>{estadoVisible(a, menuIt).txt}</b>
                    </p>
                  </div>
                  <button type="button" onClick={cerrarMenu} aria-label="Cerrar" className="rounded-full p-1.5 text-suave hover:bg-surface dark:text-suave-dark dark:hover:bg-surface-dark">
                    <HiXMark className="h-5 w-5" />
                  </button>
                </div>
                <div className="overflow-y-auto px-4 pb-2">{menuCuerpo}</div>
              </div>
            </div>
          ),
          document.body
        )}
    </div>
  );
}
