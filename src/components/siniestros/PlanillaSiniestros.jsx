// src/components/siniestros/PlanillaSiniestros.jsx
//
// 🚨🎨 SINIESTROS en la PLANILLA DE COLORES (09/10, diseño 3 estilo Monday.com).
// Reemplaza a la tabla de SiniestrosPage.
//
//   Colores: Faltan papeles (ámbar) · Denunciado en la compañía (azul) ·
//            Esperando inspección (violeta) · Por cobrar (turquesa) · Terminados (verde).
//   Tocás el color → «Pasar a…» con lo que sigue primero. Si hace falta un dato lo pregunta:
//     Denunciado → "¿Qué N° de reclamo te dio la compañía?" (si no sabés, vacío)
//     Esperando inspección → "¿Cuándo es la inspección?"
//     Terminado → "¿Cómo terminó?" y "¿Cuánto pagaron?"
//   Cada cambio queda anotado solo en la bitácora (Novedades).
//   Tocás el nombre → panel: Novedades (la bitácora), Datos, Papeles (las fotos) y
//   «Editar todo» (el wizard de siempre). El admin también puede eliminarlo desde ahí.
// props: onEditar(s), onBorrar(s), isWebAdmin  (el «Nuevo siniestro» está arriba, en la página)
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HiOutlineChatBubbleLeftRight, HiOutlineTrash } from "react-icons/hi2";

import useDatosVivos from "../../hooks/useDatosVivos";
import { invalidarCacheSiniestrosCliente } from "../../hooks/useSiniestrosCliente";
import { addEvento, getEventosBySiniestro, getSiniestros, patchSiniestro } from "../../store/slices/siniestrosSlice";
import Planilla from "../planilla/Planilla";
import { BotonPanel, Marca, PatenteChica } from "../planilla/PiezasPlanilla";
import { diasDesde, primerNombre } from "../planilla/planillaUtils";
import { fechaCorta, linkWhatsApp, plata } from "../gestoria/gestoriaUtils";
import SiniestroFotosPanel from "./SiniestroFotosPanel";

const COLOR = "#dc2626";
const CAMINO = ["PENDIENTE", "DENUNCIADO", "INSPECCION", "LIQUIDACION", "CERRADO"];
const DIAS_QUIETO = 15;

const ESTADOS = {
  PENDIENTE: { n: "Faltan papeles", c: "#d97706" },
  DENUNCIADO: { n: "Denunciado en la compañía", c: "#2563eb" },
  INSPECCION: { n: "Esperando inspección", c: "#7c3aed" },
  LIQUIDACION: { n: "Por cobrar", c: "#0891b2" },
  CERRADO: { n: "Terminado", c: "#16a34a" },
  fin: { n: "Terminados", c: "#16a34a" },
};

const TIPO = {
  CHOCO: { ic: "🚗", n: "Nuestro asegurado chocó", corto: "Chocó" },
  CHOCARON: { ic: "💥", n: "Lo chocaron", corto: "Lo chocaron" },
  ROBO: { ic: "🚨", n: "Robo / hurto", corto: "Robo" },
  INCENDIO: { ic: "🔥", n: "Incendio", corto: "Incendio" },
  OTRO: { ic: "📄", n: "Otro", corto: "Otro" },
};
const tipoDe = (s) => TIPO[s.responsabilidad] || { ic: "📄", n: s.responsabilidad_label || "—", corto: s.responsabilidad_label || "—" };
const vehiculoDe = (s) => [s.marca_auto, s.modelo_auto, s.ano_auto].filter(Boolean).join(" ");
const dosDig = (n) => String(n).padStart(2, "0");

/** "2026-10-14T10:30" → "14/10 a las 10:30" */
function cuandoTxt(v) {
  if (!v) return "";
  const [d, h] = String(v).split("T");
  const [, m, dia] = d.split("-");
  return `${dia}/${m}${h ? ` a las ${h.slice(0, 5)}` : ""}`;
}

/** Fecha y hora de ahora para la bitácora (como la manda el detalle). */
function ahora() {
  const x = new Date();
  return `${x.getFullYear()}-${dosDig(x.getMonth() + 1)}-${dosDig(x.getDate())}T${x.toISOString().slice(11, 19)}`;
}

export default function PlanillaSiniestros({ onEditar, onBorrar, isWebAdmin = false }) {
  const dispatch = useDispatch();
  const { siniestros, error: errorStore } = useSelector((s) => s.siniestros);
  const [cargado, setCargado] = useState(false);

  const recargar = useCallback(() => dispatch(getSiniestros()).finally(() => setCargado(true)), [dispatch]);
  useEffect(() => {
    recargar();
  }, [recargar]);
  // 📡 EN VIVO: un siniestro cargado o actualizado en otra oficina aparece solo.
  useDatosVivos(["siniestros"], () => recargar());

  const filas = useMemo(() => (cargado || (siniestros || []).length ? siniestros || [] : null), [cargado, siniestros]);
  const error = !cargado ? "" : errorStore && !(siniestros || []).length ? "No se pudieron traer los siniestros." : "";

  // Los thunks devuelven el error del servidor "pelado": se lo arma como el de axios,
  // así el cartel rojo muestra lo que dijo el servidor (ej: "Estado inválido").
  const correr = useCallback(
    (accion) =>
      dispatch(accion)
        .unwrap()
        .catch((data) => {
          throw Object.assign(new Error("No se pudo guardar."), { response: { data } });
        }),
    [dispatch]
  );
  const anotarEnBitacora = useCallback(
    (id, texto) => correr(addEvento({ siniestro_id: Number(id), fecha_evento: ahora(), descripcion_evento: texto })),
    [correr]
  );

  const a = useMemo(() => {
    // "PEREYRA, Lucas" → "Lucas" · "Lucas Pereyra (5 Esquinas)" → "Lucas"
    const clienteDe = (s) => {
      const base = String(s.cliente_label || "").split("(")[0];
      const nombre = base.includes(",") ? base.split(",")[1] : base;
      return primerNombre(nombre) || "el cliente";
    };
    const quieto = (s) => s.estado !== "CERRADO" && diasDesde(s.fecha_modificacion || s.fecha_creacion) >= DIAS_QUIETO;
    const askDe = (est, s) => {
      if (est === "DENUNCIADO")
        return [{ k: "reclamo", t: "linea", l: "¿Qué N° de reclamo te dio la compañía?", ayuda: "Si todavía no te lo dieron, dejalo vacío", opcional: true, def: s.nro_reclamo_cia || "" }];
      if (est === "INSPECCION") return [{ k: "cuando", t: "fechaHora", l: "¿Cuándo es la inspección?", opcional: true }];
      if (est === "CERRADO")
        return [
          { k: "final", t: "chips", l: "¿Cómo terminó?", ops: ["La compañía pagó", "Lo arreglaron en el taller", "La compañía lo rechazó", "El cliente no siguió"] },
          { k: "monto", t: "plata", l: "¿Cuánto pagaron?", opcional: true },
        ];
      return null;
    };
    return {
      clave: "siniestros",
      titulo: "Siniestros",
      icono: "🚨",
      color: COLOR,
      item: "siniestro",
      items: "siniestros",
      filas,
      error,
      recargar,
      estados: ESTADOS,
      grupos: [...CAMINO.slice(0, 4).map((e) => ({ id: e, n: ESTADOS[e].n, c: ESTADOS[e].c })), { id: "fin", n: "Terminados", c: ESTADOS.CERRADO.c, ic: "🏁" }],
      estadoDe: (s) => (s.estado === "CERRADO" ? "fin" : s.estado),
      etiquetaEstado: (s) => ESTADOS[s.estado]?.n || s.estado_label || s.estado,
      colorEstado: (s) => ESTADOS[s.estado]?.c,
      esTerminado: (s) => s.estado === "CERRADO",
      abierto: () => true,
      nombre: (s) => s.cliente_label || "Sin cliente",
      sub: (s) => [vehiculoDe(s), `#${s.id}`].filter(Boolean).join(" · "),
      subCelu: (s) => [tipoDe(s).corto, s.patente].filter(Boolean).join(" · "),
      marcas: (s) =>
        [
          s.estado !== "CERRADO" && !s.fotos_count && { txt: "Sin fotos", tono: "ambar" },
          s.estado !== "PENDIENTE" && s.estado !== "CERRADO" && !s.nro_reclamo_cia && { txt: "Sin N° de reclamo", tono: "ambar" },
        ].filter(Boolean),
      columnas: [
        {
          titulo: "Qué pasó",
          ancho: "150px",
          render: (s) => (
            <span className="truncate text-[13px] text-titulo dark:text-titulo-dark" title={s.responsabilidad_label || tipoDe(s).n}>
              {tipoDe(s).ic} {tipoDe(s).corto}
            </span>
          ),
        },
        { titulo: "Patente", ancho: "110px", render: (s) => <PatenteChica p={s.patente} /> },
        {
          titulo: "N° de reclamo",
          ancho: "130px",
          render: (s) =>
            s.nro_reclamo_cia ? (
              <span className="truncate font-mono text-[12.5px] font-semibold text-titulo dark:text-titulo-dark">{s.nro_reclamo_cia}</span>
            ) : (
              <span className="text-[12.5px] text-suave dark:text-suave-dark">—</span>
            ),
        },
      ],
      dias: (s) => diasDesde(s.fecha_modificacion || s.fecha_creacion),
      diasTitulo: "Último cambio",
      demorado: quieto,
      buscar: (s) =>
        [s.cliente_label, s.poliza_label, s.patente, s.nro_reclamo_cia, s.marca_auto, s.modelo_auto, `#${s.id}`, s.tercero_nombre, s.tercero_patente, s.tercero_compania].filter(Boolean).join(" "),
      buscarPh: "Buscar cliente, patente o reclamo",
      filtros: [{ id: "tipo", etiqueta: "Qué pasó", opciones: Object.entries(TIPO).map(([k, v]) => [k, v.n]), pasa: (s, v) => s.responsabilidad === v }],

      sigue: (s) => {
        if (s.estado === "PENDIENTE") return s.fotos_count ? "Cuando estén los papeles, denunciarlo en la compañía." : "Pedirle al cliente las fotos y los papeles.";
        if (s.estado === "DENUNCIADO") return s.nro_reclamo_cia ? "Esperar que la compañía mande a inspeccionar." : "Cargar el N° de reclamo de la compañía.";
        if (s.estado === "INSPECCION") return "Esperar que el perito vea el auto.";
        if (s.estado === "LIQUIDACION") return "Esperar el pago o el arreglo, y confirmarlo.";
        return "Terminado.";
      },

      tareas: (s) => {
        const T = [];
        if (s.estado === "CERRADO") return T;
        const d = diasDesde(s.fecha_modificacion || s.fecha_creacion);
        if (s.estado === "PENDIENTE") T.push({ tono: d >= 3 ? "rojo" : "ambar", txt: s.fotos_count ? `Denunciarlo en la compañía (ya hay ${s.fotos_count} foto${s.fotos_count > 1 ? "s" : ""})` : `Pedirle a ${clienteDe(s)} las fotos y los papeles` });
        if (s.estado === "DENUNCIADO" && !s.nro_reclamo_cia) T.push({ tono: "ambar", txt: "Cargar el N° de reclamo de la compañía" });
        if (quieto(s)) T.push({ tono: "rojo", txt: `Hace ${d} días sin novedades: llamá a la compañía` });
        if (s.estado === "INSPECCION" && d >= 7) T.push({ tono: "azul", txt: "¿Ya fue el perito? Preguntá a la compañía" });
        if (s.estado === "LIQUIDACION") T.push({ tono: "azul", txt: "¿Ya pagaron o lo arreglaron? Confirmalo" });
        return T;
      },

      menu: (s) => {
        const i = CAMINO.indexOf(s.estado);
        const sig = CAMINO[i + 1];
        const opciones = CAMINO.filter((e) => e !== s.estado).map((e) => ({
          id: `estado-${e}`,
          a: e,
          txt:
            e === "CERRADO"
              ? "Se termina el siniestro"
              : s.estado === "CERRADO"
                ? "Se vuelve a abrir"
                : CAMINO.indexOf(e) < i
                  ? "Vuelve para atrás"
                  : e === "DENUNCIADO"
                    ? "Ya lo denunciaste en la compañía"
                    : e === "INSPECCION"
                      ? "La compañía mandó a inspeccionar"
                      : e === "LIQUIDACION"
                        ? "Ya lo inspeccionaron: falta que paguen"
                        : "",
          principal: e === sig,
          ask: askDe(e, s),
          preg: `Pasar a «${ESTADOS[e].n}»`,
          confirmar: "Guardar",
          ok: `Pasó a «${ESTADOS[e].n}»`,
        }));
        opciones.sort((x, y) => (y.principal ? 1 : 0) - (x.principal ? 1 : 0));
        const extras = [];
        if (s.estado !== "PENDIENTE") {
          extras.push({
            id: "reclamo",
            ic: "🔢",
            txt: s.nro_reclamo_cia ? "Cambiar el N° de reclamo" : "Cargar el N° de reclamo",
            sub: s.nro_reclamo_cia || "El que da la compañía",
            ask: [{ k: "reclamo", t: "linea", l: "¿Qué N° de reclamo te dio la compañía?", def: s.nro_reclamo_cia || "" }],
            preg: "N° de reclamo de la compañía",
            confirmar: "Guardar",
          });
        }
        extras.push({ id: "nota", ic: "📝", txt: "Anotar en la bitácora", abrirPanel: "nov" });
        extras.push({ id: "fotos", ic: "📷", txt: "Ver o subir fotos", abrirPanel: "pap" });
        if (onEditar) extras.push({ id: "editar", ic: "✏️", txt: "Editar todos los datos", onClick: (x) => onEditar(x) });
        if (isWebAdmin && onBorrar) extras.push({ id: "borrar", ic: "🗑️", txt: "Eliminar el siniestro", peligro: true, onClick: (x) => onBorrar(x) });
        return { opciones, extras };
      },

      ejecutar: async (s, op, vals) => {
        const id = s.id;
        if (op.id === "reclamo") {
          const nro = String(vals.reclamo || "").slice(0, 50);
          await correr(patchSiniestro({ id, cambios: { nro_reclamo_cia: nro } }));
          await anotarEnBitacora(id, `N° de reclamo de la compañía: ${nro}.`).catch(() => {});
          invalidarCacheSiniestrosCliente(s.cliente);
          return "N° de reclamo guardado";
        }
        if (!op.a) throw new Error("Esa opción todavía no está.");
        const cambios = { estado: op.a };
        if (op.a === "DENUNCIADO" && vals.reclamo) cambios.nro_reclamo_cia = String(vals.reclamo).slice(0, 50);
        await correr(patchSiniestro({ id, cambios }));
        // 📒 Queda anotado en la bitácora (para saber quién/cuándo, como un historial).
        const partes = [`Pasó a «${ESTADOS[op.a].n}».`];
        if (cambios.nro_reclamo_cia) partes.push(`N° de reclamo: ${cambios.nro_reclamo_cia}.`);
        if (vals.cuando) partes.push(`Inspección: ${cuandoTxt(vals.cuando)}.`);
        if (vals.final) partes.push(`Terminó: ${vals.final}.`);
        if (Number(vals.monto) > 0) partes.push(`Monto: ${plata(vals.monto)}.`);
        await anotarEnBitacora(id, partes.join(" ")).catch(() => {});
        invalidarCacheSiniestrosCliente(s.cliente);
        return op.ok;
      },

      nuevo: null, // «Nuevo siniestro» ya está arriba de la página
      vistaInicial: "hoy",

      panel: {
        cargar: async (id) => {
          const s = (siniestros || []).find((x) => String(x.id) === String(id));
          if (!s) throw new Error("No encontré ese siniestro (puede que lo hayan borrado).");
          const eventos = await correr(getEventosBySiniestro(s.id));
          return { ...s, eventos: Array.isArray(eventos) ? eventos : [] };
        },
        sub: (s) => [tipoDe(s).n, vehiculoDe(s), s.patente, `#${s.id}`].filter(Boolean).join(" · "),
        novedades: (d) => (d.eventos || []).map((ev) => ({ id: ev.id, autor: "Bitácora", fecha: ev.fecha_evento, texto: ev.descripcion_evento })),
        puedeAnotar: () => true,
        anotar: (d, texto) => anotarEnBitacora(d.id, texto),
        opcionCliente: null,
        phNovedad: "Escribí una novedad (ej: llamé a la compañía, el perito va el lunes)…",
        datos: (d) => [
          ["Cliente", d.cliente_label],
          ["Póliza", d.poliza_label],
          ["Qué pasó", d.responsabilidad_label || tipoDe(d).n],
          ["Fecha del siniestro", d.fecha_siniestro ? fechaCorta(d.fecha_siniestro) : null],
          ["Vehículo", vehiculoDe(d) || null],
          ["Patente", d.patente || null],
          ["N° de reclamo", d.nro_reclamo_cia || <Marca tono="ambar">Sin cargar</Marca>],
          ["Lo que contó", d.descripcion ? <span className="whitespace-pre-line">{d.descripcion}</span> : null],
          ["Tercero", [d.tercero_nombre, d.tercero_telefono].filter(Boolean).join(" · ") || null],
          ["Auto del tercero", d.tercero_patente || null],
          ["Seguro del tercero", [d.tercero_compania, d.tercero_poliza].filter(Boolean).join(" · ") || null],
          ["Fotos", d.fotos_count ? `${d.fotos_count}` : "Ninguna"],
        ],
        papeles: (d) => <SiniestroFotosPanel siniestroId={d.id} />,
        acciones: (d) =>
          linkWhatsApp(d.tercero_telefono)
            ? [
                <BotonPanel key="ter" tono="verde" href={linkWhatsApp(d.tercero_telefono)} icono={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}>
                  WhatsApp al tercero
                </BotonPanel>,
              ]
            : null,
        pie: (d, s) =>
          isWebAdmin && onBorrar ? (
            <button
              type="button"
              onClick={() => onBorrar(s)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-duo-rojo/40 px-3 py-2 text-[13.5px] font-semibold text-duo-rojo hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)]"
            >
              <HiOutlineTrash className="h-4 w-4" /> Eliminar
            </button>
          ) : null,
        ficha: onEditar ? { txt: "Editar todo", onClick: (s) => onEditar(s) } : null,
      },
    };
  }, [filas, error, recargar, siniestros, correr, anotarEnBitacora, onEditar, onBorrar, isWebAdmin]);

  return <Planilla a={a} />;
}
