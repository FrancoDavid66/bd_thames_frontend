// src/components/gestoria/FichaGestora.jsx
//
// 📄 El trámite como lo ve la GESTORA (rediseño 30/09, app estilo Envíos Flex).
// De arriba a abajo:
//   1. ‹ Inicio (o Trámites / Cobros) y el número del trámite;
//   2. en qué está y hace cuánto, qué trámite es y la patente (dibujada como la chapa);
//   3. si lo observaron: "El registro pidió …"; los pasos (Recibido → En el registro →
//      Listo → Entregado: "la entrega al cliente la marca la oficina") y, si ya lo
//      presentó, "Lo presentaste ayer";
//   4. el cliente (con WhatsApp y Llamar) y en qué oficina de THAMES lo retira;
//   5. Papeles, 💵 Plata y Notas e historial: se abren y se cierran (arrancan abiertos
//      cuando hay algo para hacer ahí);
//   6. ABAJO, fijo, EL botón del paso:
//        Para presentar → «Lo presenté en el registro»
//        En el registro → «Está LISTO» y «El registro lo observó»
//        Observado      → «Lo presenté otra vez»
//      Al pasar a LISTO sale la pantalla "¡Listo!" con lo que sigue (ListoGestora).
// 💵 Con las comisiones prendidas, para LISTO hace falta el precio y al menos un
//    comprobante de cobro: si faltan, se piden ahí mismo («Para pasarlo a LISTO»).
// AppGestora la monta con key = id: cada trámite arranca de cero (nada del anterior
// se cuela si se pasa de uno a otro con «Lo que sigue»).
// 🔒 Sin póliza ni la comisión de THAMES: la ve solo el admin (el servidor ni se la manda).
// La oficina y el admin siguen con la ficha completa (FichaTramite.jsx).
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiOutlineArrowLeft,
  HiOutlineBanknotes,
  HiOutlineBuildingLibrary,
  HiOutlineBuildingStorefront,
  HiOutlineCamera,
  HiOutlineChatBubbleOvalLeft,
  HiOutlineCheck,
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineIdentification,
  HiOutlineLockClosed,
  HiOutlinePencilSquare,
  HiOutlinePhone,
  HiOutlinePlus,
  HiOutlineXMark,
} from "react-icons/hi2";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
import { useGestora } from "./gestora/gestoraContext";
import {
  anotar,
  cambiarEstado,
  cargarPrecio,
  editarTramite,
  guardarDocumento,
  mensajeError,
  pedirTramite,
  registrarCobro,
  subirArchivo,
} from "../../services/gestoria";
import { Archivo, Cargando, Etiqueta } from "./Piezas";
import { ModalVehiculo } from "./ModalesTramite";
import CobroGestora from "./gestora/CobroGestora";
import HojaObservado from "./gestora/HojaObservado";
import ListoGestora from "./gestora/ListoGestora";
import PrecioGestora from "./gestora/PrecioGestora";
import { Boton, ChipEstado, Patente, Tarjeta } from "./gestora/piezas";
import {
  MONO,
  TONO_CAJA,
  TONO_TEXTO,
  cuando,
  demoradoGestora,
  esDePersona,
  foco,
  loQueSigue,
  papelesQueFaltan,
  plataDe,
  suave,
} from "./gestora/gestoraUtils";
import { ddmm, ddmmhhmm, diasEnEstado, linkTel, linkWhatsApp, plata, textoDias } from "./gestoriaUtils";

const DESDE = { inicio: "Inicio", tramites: "Trámites", cobros: "Cobros" };
const CERRADOS = ["ENTREGADO", "CANCELADO"];

const minuscula = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : "");

/** Una sección que se abre y se cierra (Papeles, Plata, Notas e historial). */
function Desplegable({ id, icono, titulo, resumen = null, abierto, onCambiar, children }) {
  const Icono = icono;
  return (
    <section className="overflow-hidden rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
      <h2>
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={id}
          onClick={onCambiar}
          className={`flex min-h-[60px] w-full items-center gap-3 px-4 text-left ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
        >
          <Icono className={`h-[21px] w-[21px] shrink-0 ${suave}`} strokeWidth={2} aria-hidden="true" />
          <span className="flex-1 text-[16px] font-bold text-titulo dark:text-titulo-dark">{titulo}</span>
          {resumen ? <span className={`text-right text-[14px] font-bold ${TONO_TEXTO[resumen.tono] || suave}`}>{resumen.txt}</span> : null}
          <HiOutlineChevronDown
            className={`h-[18px] w-[18px] shrink-0 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </h2>
      <div id={id} className={abierto ? "flex flex-col gap-3 border-t border-slate-100 dark:border-slate-700/70 px-4 pb-4 pt-3" : "hidden"}>
        {children}
      </div>
    </section>
  );
}

/** Los 4 pasos, como un seguimiento de envío. */
function Pasos({ t }) {
  const e = t.estado;
  const persona = esDePersona(t);
  const pasos = [
    { txt: "Recibido", st: e === "RECIBIDO" ? "cur" : "hecho" },
    {
      txt: e === "OBSERVADO" ? "Observado" : persona ? "Presentado" : "En el registro",
      st: ["RECIBIDO", "ASIGNADO"].includes(e) ? "sigue" : e === "EN_REGISTRO" ? "cur" : e === "OBSERVADO" ? "obs" : "hecho",
    },
    { txt: "Listo", st: e === "LISTO" ? "listo" : e === "ENTREGADO" ? "hecho" : "no" },
    { txt: "Entregado", st: e === "ENTREGADO" ? "hecho" : e === "LISTO" ? "sigue" : "no" },
  ];
  const leer = { hecho: "hecho", cur: "ahora", listo: "ahora", obs: "ahora", sigue: "lo que sigue", no: "todavía no" };
  return (
    <ol className="grid grid-cols-4" aria-label="En qué paso está">
      {pasos.map((p, i) => {
        let bola;
        let texto = "font-semibold text-suave dark:text-suave-dark";
        if (p.st === "hecho") {
          bola = (
            <span className="relative z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-duo-violeta text-white">
              <HiOutlineCheck className="h-4 w-4" strokeWidth={3} />
            </span>
          );
          texto = "font-bold text-titulo dark:text-titulo-dark";
        } else if (p.st === "cur") {
          bola = (
            <span className="relative z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-duo-violeta text-white ring-[5px] ring-duo-violeta-soft dark:ring-[var(--color-duo-violeta-soft-dark)]">
              <HiOutlineBuildingLibrary className="h-[15px] w-[15px]" strokeWidth={2.4} />
            </span>
          );
          texto = "font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff]";
        } else if (p.st === "listo") {
          bola = (
            <span className="relative z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-duo-verde-sombra text-white ring-[5px] ring-duo-verde-soft dark:ring-[var(--color-duo-verde-soft-dark)]">
              <HiOutlineCheck className="h-4 w-4" strokeWidth={3} />
            </span>
          );
          texto = "font-extrabold text-duo-verde-sombra dark:text-green-400";
        } else if (p.st === "obs") {
          bola = (
            <span className="relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-amber-300 ring-[5px] ring-[#fff7e6] dark:ring-[var(--color-duo-amarillo-soft-dark)]">
              <HiOutlineExclamationTriangle className="h-[14px] w-[14px]" strokeWidth={2.6} />
            </span>
          );
          texto = "font-extrabold text-duo-amarillo-sombra dark:text-amber-300";
        } else if (p.st === "sigue") {
          bola = (
            <span className="relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-[2.5px] border-duo-violeta bg-card dark:bg-card-dark">
              <span className="h-2 w-2 rounded-full bg-duo-violeta" />
            </span>
          );
          texto = "font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff]";
        } else {
          bola = <span className="relative z-[1] block h-7 w-7 rounded-full border-[2.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark" />;
        }
        const linea =
          p.st === "hecho" || p.st === "cur" || p.st === "listo"
            ? "bg-duo-violeta"
            : p.st === "obs"
              ? "bg-duo-amarillo"
              : "bg-slate-300 dark:bg-slate-600";
        return (
          <li key={p.txt} className="relative flex flex-col items-center gap-[7px] text-center">
            {i > 0 ? <span className={`absolute right-1/2 top-[13px] h-[2.5px] w-full ${linea}`} aria-hidden="true" /> : null}
            <span className="flex" aria-hidden="true">
              {bola}
            </span>
            <span className={`text-[12.5px] leading-tight ${texto}`}>
              {p.txt}
              <span className="sr-only"> ({leer[p.st]})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** La miniatura de un comprobante (la foto, o un ícono si es PDF). */
function Miniatura({ d }) {
  const esFoto = String(d?.mime || "").startsWith("image/");
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-slate-100 dark:bg-slate-700/60">
      {esFoto ? (
        <img src={d.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <HiOutlineDocumentText className={`h-5 w-5 ${suave}`} strokeWidth={2} aria-hidden="true" />
      )}
    </span>
  );
}

export default function FichaGestora() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const desde = DESDE[location.state?.desde] ? location.state.desde : null;
  const { catalogo } = useGestoria();
  const { lista, cargar: recargarLista } = useGestora();
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  // "observar" | "precio" | "precioListo" | "cobro" | "cobroListo" | "vehiculo"
  const [modal, setModal] = useState(null);
  const [cobroDoc, setCobroDoc] = useState(null); // comprobante del cliente al que se le carga el monto
  const [ocupado, setOcupado] = useState(false);
  const [recien, setRecien] = useState(""); // "Anotado: está en el registro" (un ratito, en vez de los botones)
  const [listo, setListo] = useState(null); // el trámite recién pasado a LISTO → pantalla "¡Listo!"
  const [abiertos, setAbiertos] = useState({}); // lo que abrió o cerró a mano (si no, según el estado)
  const [subiendo, setSubiendo] = useState(""); // "" | "1" | "2 de 3"
  const [verArchivos, setVerArchivos] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [papelNuevo, setPapelNuevo] = useState("");
  const [nota, setNota] = useState({ txt: "", vis: false, soloAdmin: false });

  // 👇 Lo que ocupa la barra de abajo (con 1 o 2 botones y el aviso de arriba): el
  //    final de la ficha queda siempre a la vista, en cualquier celu.
  const [altoPie, setAltoPie] = useState(0);
  const observaPie = useRef(null);
  const pieRef = useCallback((el) => {
    observaPie.current?.disconnect();
    observaPie.current = null;
    if (!el) {
      setAltoPie(0);
      return;
    }
    const medir = () => setAltoPie(el.offsetHeight);
    medir();
    if (typeof ResizeObserver !== "undefined") {
      observaPie.current = new ResizeObserver(medir);
      observaPie.current.observe(el);
    }
  }, []);

  // ✅ Papeles: se guardan un ratito después del último toque (3 toques = 1 pedido).
  //    Hasta que el servidor confirma, manda la lista del celu: si en el medio llega
  //    una recarga "en vivo" (o la respuesta de otro botón), no se pierden los tildes.
  const papelesSeq = useRef(0);
  const papelesTimer = useRef(null);
  const papelesPendientes = useRef(null); // esperando el ratito para mandarse
  const sinConfirmar = useRef(null); // la última lista tocada, hasta que el servidor la confirma
  const conMisPapeles = useCallback((nuevo) => {
    const lst = sinConfirmar.current;
    if (!nuevo || !lst) return nuevo;
    return { ...nuevo, papeles: lst, papeles_ok: lst.filter((p) => p.ok).length, papeles_total: lst.length };
  }, []);

  const cargar = useCallback(async () => {
    try {
      const nuevo = await pedirTramite(id);
      setT(conMisPapeles(nuevo));
      setError("");
    } catch (e) {
      if (e?.response?.status === 404) {
        setT(null);
        setError("Ese trámite no existe o ya no está a tu cargo.");
      } else {
        // Si ya estaba a la vista, sigue a la vista (ej: se cortó internet un ratito).
        setError(mensajeError(e, "No se pudo abrir el trámite."));
      }
    }
  }, [id, conMisPapeles]);

  useEffect(() => {
    setT(null);
    setError("");
    setModal(null);
    setListo(null);
    setRecien("");
    setAbiertos({});
    setVerArchivos(false);
    setAgregando(false);
    sinConfirmar.current = null;
    cargar();
  }, [cargar]);

  useDatosVivos(["gestoria"], () => cargar());

  useEffect(
    () => () => {
      // Si salís antes de que se guarde, se guarda igual.
      if (papelesTimer.current && papelesPendientes.current) {
        clearTimeout(papelesTimer.current);
        editarTramite(id, { papeles: papelesPendientes.current }).catch(() => {});
      }
    },
    [id]
  );

  // "Anotado: está en el registro" se ve un ratito y vuelven los botones
  // (así un segundo toque rápido no aprieta el botón que aparece después).
  useEffect(() => {
    if (!recien) return undefined;
    const k = setTimeout(() => setRecien(""), 1800);
    return () => clearTimeout(k);
  }, [recien]);

  const volver = () => (desde ? navigate(-1) : navigate("/gestoria"));

  const hacer = async (fn, ok) => {
    setOcupado(true);
    try {
      const nuevo = await fn();
      if (nuevo && nuevo.id) setT(conMisPapeles(nuevo));
      if (ok) toast.success(typeof ok === "function" ? ok(nuevo) : ok);
      recargarLista?.();
      return nuevo;
    } catch (e) {
      toast.error(mensajeError(e));
      throw e;
    } finally {
      setOcupado(false);
    }
  };
  const intentar = (fn, ok) => hacer(fn, ok).catch(() => {});

  const barra = (
    <header
      className="sticky top-0 z-30 border-b border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 pl-2 pr-4">
        <button
          type="button"
          onClick={volver}
          className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-[16px] font-bold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark ${foco}`}
        >
          <HiOutlineArrowLeft className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
          {DESDE[desde] || "Inicio"}
        </button>
        {t?.numero ? (
          <span className={`text-[13px] ${suave}`} style={MONO}>
            {t.numero}
          </span>
        ) : null}
      </div>
    </header>
  );

  if (error && !t) {
    return (
      <>
        {barra}
        <main className="mx-auto flex w-full max-w-2xl flex-col px-4 pt-4">
          <Tarjeta className="items-start gap-3 p-5">
            <p className="text-[15px] text-titulo dark:text-titulo-dark">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/gestoria")}
              className={`min-h-[44px] rounded-xl px-2 text-[15px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}
            >
              Volver al inicio
            </button>
          </Tarjeta>
        </main>
      </>
    );
  }
  if (!t) {
    return (
      <>
        {barra}
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-4">
          <Cargando alto="h-28" />
          <Cargando alto="h-24" />
          <Cargando alto="h-36" />
          <Cargando alto="h-40" />
        </main>
      </>
    );
  }

  const a = t.acciones || {};
  const puede = (e) => (a.estados || []).includes(e);
  const persona = esDePersona(t);
  const cerrado = CERRADOS.includes(t.estado);
  const d = diasEnEstado(t);
  const dem = demoradoGestora(t);
  const papeles = Array.isArray(t.papeles) ? t.papeles : [];
  const faltanN = papelesQueFaltan(t);
  const docsPapel = (t.documentos || []).filter((x) => x.tipo === "PAPEL");
  const delCliente = docsPapel.filter((x) => x.rol === "CLIENTE").length;
  const movs = t.movimientos || [];
  const comprobantes = (t.documentos || []).filter((x) => x.tipo === "COMPROBANTE");
  const cobros = comprobantes.filter((x) => x.monto != null);
  const sinMonto = comprobantes.filter((x) => x.monto == null);
  const pl = plataDe(t);

  // Qué arranca abierto: lo que tiene algo para hacer.
  const abierto = {
    papeles: abiertos.papeles ?? (!cerrado && (t.estado === "ASIGNADO" || t.estado === "OBSERVADO" || faltanN > 0)),
    plata: abiertos.plata ?? (!cerrado && (t.estado === "EN_REGISTRO" || sinMonto.length > 0)),
    notas: abiertos.notas ?? false,
  };
  const cambiarAbierto = (k) => setAbiertos((x) => ({ ...x, [k]: !abierto[k] }));

  // 💵 Lo que dice la fila de la plata cuando está cerrada.
  let resumenPlata;
  if (pl.precio == null) resumenPlata = { txt: "Falta el precio", tono: "ambar" };
  else if (!cobros.length) resumenPlata = { txt: `${plata(pl.precio)} · sin comprobante`, tono: "ambar" };
  else if (pl.falta > 0) resumenPlata = { txt: `Falta ${plata(pl.falta)}`, tono: "ambar" };
  else if (pl.falta === 0) resumenPlata = { txt: "Pagó todo", tono: "verde" };
  else resumenPlata = { txt: "Pagó de más", tono: "ambar" };

  // ── Acciones ──
  const avanzar = (nuevo) => {
    if (ocupado || recien) return;
    // 💵 Para LISTO: al menos un comprobante de cobro (y el precio). Se piden ahí mismo.
    if (nuevo === "LISTO" && t.ve_plata && !t.cobros_n) {
      setCobroDoc(null);
      setModal("cobroListo");
      return;
    }
    if (nuevo === "LISTO" && t.ve_plata && t.precio_gestoria == null) {
      setModal("precioListo");
      return;
    }
    hacer(() => cambiarEstado(t.id, { estado: nuevo }))
      .then((r) => {
        if (r?.estado === "LISTO") setListo(r);
        else if (nuevo === "EN_REGISTRO") setRecien(persona ? "Anotado: lo presentaste" : "Anotado: está en el registro");
      })
      .catch(() => {});
  };

  const cambiarPapeles = (lst) => {
    sinConfirmar.current = lst;
    setT((x) => ({ ...x, papeles: lst, papeles_ok: lst.filter((p) => p.ok).length, papeles_total: lst.length }));
    const n = ++papelesSeq.current;
    papelesPendientes.current = lst;
    clearTimeout(papelesTimer.current);
    papelesTimer.current = setTimeout(async () => {
      papelesTimer.current = null;
      papelesPendientes.current = null;
      try {
        const nuevo = await editarTramite(t.id, { papeles: lst });
        if (n === papelesSeq.current) {
          sinConfirmar.current = null;
          setT(nuevo);
          recargarLista?.();
        }
      } catch (err) {
        toast.error(mensajeError(err));
        if (n === papelesSeq.current) {
          sinConfirmar.current = null;
          cargar();
        }
      }
    }, 450);
  };

  // Fotos o PDF de los papeles (se pueden elegir varios).
  const subirPapeles = async (ev) => {
    const archivos = Array.from(ev.target.files || []);
    ev.target.value = "";
    if (!archivos.length || subiendo) return;
    let ok = 0;
    for (let k = 0; k < archivos.length; k += 1) {
      setSubiendo(archivos.length > 1 ? `${k + 1} de ${archivos.length}` : "1");
      try {
        const arch = await subirArchivo(archivos[k], "gestoria/papeles");
        const nuevo = await guardarDocumento(t.id, { ...arch, tipo: "PAPEL" });
        if (nuevo && nuevo.id) setT(conMisPapeles(nuevo));
        ok += 1;
      } catch (err) {
        toast.error(err?.response ? mensajeError(err) : err?.message || "No se pudo subir.");
      }
    }
    setSubiendo("");
    if (ok) {
      toast.success(ok === 1 ? "Archivo subido" : `${ok} archivos subidos`);
      setVerArchivos(true);
    }
  };

  const agregarPapel = (ev) => {
    ev.preventDefault();
    const n = papelNuevo.trim();
    if (!n) return;
    setPapelNuevo("");
    setAgregando(false);
    cambiarPapeles([...papeles, { nombre: n, ok: false }]);
  };

  const guardarNota = (ev) => {
    ev.preventDefault();
    const txt = nota.txt.trim();
    if (!txt) {
      toast.error("Escribí algo para anotar");
      return;
    }
    const soloAdmin = t.ve_plata && nota.soloAdmin;
    intentar(
      () =>
        anotar(t.id, { texto: txt, visible_cliente: nota.vis && !soloAdmin, solo_admin: soloAdmin }).then((r) => {
          setNota({ txt: "", vis: false, soloAdmin: false });
          return r;
        }),
      soloAdmin ? "Anotado (la oficina no lo ve)" : nota.vis ? "Anotado (lo ve el cliente en su link)" : "Anotado"
    );
  };

  const abrirCobro = (doc) => {
    setCobroDoc(doc);
    setModal("cobro");
  };
  const cerrarModal = () => {
    setModal(null);
    setCobroDoc(null);
  };

  // 📲 Contacto con el cliente.
  const primerNombre = String(t.persona_nombre || "").trim().split(/\s+/)[0] || "";
  const textoWa = `Hola${primerNombre ? ` ${primerNombre}` : ""}! Te escribo por el trámite de ${minuscula(t.tipo_corto || t.tipo_txt)}${
    t.patente && !persona ? ` (${t.patente})` : ""
  }.`;
  const wa = linkWhatsApp(t.persona_telefono, textoWa);
  const tel = linkTel(t.persona_telefono);

  // ── El botón del paso (abajo, fijo) ──
  let botones = null;
  let pista = null;
  if (t.estado === "ASIGNADO" && puede("EN_REGISTRO")) {
    if (faltanN) pista = { txt: `Ojo: ${faltanN === 1 ? "falta 1 papel" : `faltan ${faltanN} papeles`} de la lista.`, tono: "ambar" };
    botones = (
      <Boton tono="violeta" icono={HiOutlineBuildingLibrary} disabled={ocupado} onClick={() => avanzar("EN_REGISTRO")}>
        {persona ? "Lo presenté" : "Lo presenté en el registro"}
      </Boton>
    );
  } else if (t.estado === "EN_REGISTRO" && (puede("LISTO") || puede("OBSERVADO"))) {
    if (t.ve_plata && !t.cobros_n && puede("LISTO")) pista = { txt: "Para LISTO te vamos a pedir el comprobante del cobro.", tono: "suave" };
    botones = (
      <>
        {puede("LISTO") && (
          <Boton tono="verde" icono={HiOutlineCheck} disabled={ocupado} onClick={() => avanzar("LISTO")}>
            Está LISTO
          </Boton>
        )}
        {puede("OBSERVADO") && (
          <Boton tono="ambarBorde" chico icono={HiOutlineExclamationTriangle} disabled={ocupado} onClick={() => setModal("observar")}>
            {persona ? "Me pidieron algo más" : "El registro lo observó"}
          </Boton>
        )}
      </>
    );
  } else if (t.estado === "OBSERVADO" && puede("EN_REGISTRO")) {
    botones = (
      <Boton tono="violeta" icono={HiOutlineBuildingLibrary} disabled={ocupado} onClick={() => avanzar("EN_REGISTRO")}>
        Lo presenté otra vez
      </Boton>
    );
  }
  // Lo de abajo de la ficha: lo que mide la barra (con 1 o 2 botones) + un respiro.
  const abajo = botones && altoPie ? { paddingBottom: altoPie + 20 } : { paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" };

  // ── Qué está pasando (debajo de los pasos) ──
  let estadoTxt = null;
  if (t.estado === "EN_REGISTRO") {
    const veces = t.veces_observado ? ` Tuvo ${t.veces_observado} observación${t.veces_observado > 1 ? "es" : ""}.` : "";
    estadoTxt = { tono: "violeta", icono: HiOutlineBuildingLibrary, txt: `Lo presentaste ${cuando(t.en_registro_en || t.estado_desde)}.${veces}` };
  } else if (t.estado === "LISTO") {
    estadoTxt = {
      tono: "verde",
      icono: HiOutlineCheckCircle,
      txt: `Listo ${cuando(t.listo_en || t.estado_desde)}. Lo retira el cliente en THAMES ${t.oficina_nombre || ""}`.trim() + ".",
    };
  } else if (t.estado === "ENTREGADO") {
    estadoTxt = { tono: "neutro", icono: HiOutlineCheckCircle, txt: `El cliente lo retiró ${cuando(t.entregado_en)}.` };
  } else if (t.estado === "CANCELADO") {
    estadoTxt = { tono: "neutro", icono: HiOutlineXMark, txt: `Se canceló ${cuando(t.cancelado_en)}.` };
  }

  return (
    <>
      {/* Con el "¡Listo!" arriba, la ficha de atrás no se puede tocar ni leer (inert). */}
      <div inert={listo ? true : undefined}>
        {barra}
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-3.5 px-4 pt-4" style={abajo}>
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3.5 py-2.5 text-[14px] text-duo-amarillo-sombra dark:text-amber-200"
            >
              No se pudo actualizar: {error}
            </p>
          ) : null}

          {/* 1 · Qué es y en qué está */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ChipEstado t={t} extra={cerrado ? "" : textoDias(d)} />
              {dem ? (
                <span className="rounded-md bg-duo-rojo px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide text-white">DEMORADO</span>
              ) : null}
            </div>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.3px] text-titulo dark:text-titulo-dark">{t.tipo_txt}</h1>
            {persona ? (
              <span className="flex items-center gap-2 text-[17px] font-bold text-titulo dark:text-titulo-dark">
                <HiOutlineIdentification className={`h-[22px] w-[22px] shrink-0 ${suave}`} strokeWidth={2} aria-hidden="true" />
                {t.persona_nombre}
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {t.patente ? (
                  <Patente p={t.patente} grande />
                ) : (
                  <span className={`rounded-lg border-[1.5px] border-dashed border-slate-300 dark:border-slate-600 px-2.5 py-1 text-[14px] font-bold ${suave}`}>
                    Sin patente
                  </span>
                )}
                {t.vehiculo ? <span className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">{t.vehiculo}</span> : null}
                {a.puede_vehiculo ? (
                  t.patente ? (
                    <button
                      type="button"
                      onClick={() => setModal("vehiculo")}
                      aria-label="Cambiar la patente o el vehículo"
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${suave} hover:bg-surface dark:hover:bg-surface-dark ${foco}`}
                    >
                      <HiOutlinePencilSquare className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModal("vehiculo")}
                      className={`flex min-h-[44px] items-center gap-1 rounded-xl px-1.5 text-[15px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}
                    >
                      <HiOutlinePlus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
                      Agregar patente
                    </button>
                  )
                ) : null}
              </div>
            )}
          </div>

          {/* 2 · Lo que pidió el registro */}
          {t.estado === "OBSERVADO" ? (
            <section className="flex gap-3 rounded-2xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-4 text-[#78350f] dark:text-amber-100">
              <HiOutlineExclamationTriangle className="mt-px h-6 w-6 shrink-0 text-duo-amarillo-sombra dark:text-amber-300" strokeWidth={2} aria-hidden="true" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <h2 className="text-[17px] font-extrabold">{persona ? "Te pidieron" : "El registro pidió"}</h2>
                <span className="break-words text-[16px] font-bold">{t.falta || "Algo más (no se anotó qué)."}</span>
                <span className="text-[14.5px]">Cuando lo tengas, volvé a presentarlo.</span>
              </div>
            </section>
          ) : null}

          {/* 3 · Los pasos */}
          {t.estado !== "CANCELADO" ? (
            <Tarjeta className="gap-3 p-4">
              <Pasos t={t} />
              <span className={`text-center text-[12.5px] ${suave}`}>La entrega al cliente la marca la oficina.</span>
            </Tarjeta>
          ) : null}
          {estadoTxt ? (
            <div className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-[14.5px] font-semibold ${TONO_CAJA[estadoTxt.tono]}`}>
              <estadoTxt.icono className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>{estadoTxt.txt}</span>
            </div>
          ) : null}

          {/* 4 · El cliente y dónde lo retira */}
          <Tarjeta className="gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-[12px] font-extrabold uppercase tracking-[0.6px] ${suave}`}>Cliente</span>
                <span className="break-words text-[17px] font-extrabold text-titulo dark:text-titulo-dark">{t.persona_nombre || "—"}</span>
                <span className={`text-[14px] ${suave}`}>
                  {[t.persona_dni && `DNI ${t.persona_dni}`, t.persona_telefono].filter(Boolean).join(" · ") || "Sin DNI ni teléfono"}
                </span>
              </div>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Escribirle por WhatsApp a ${t.persona_nombre || "el cliente"}`}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-green-400 ${foco}`}
                >
                  <HiOutlineChatBubbleOvalLeft className="h-[21px] w-[21px]" strokeWidth={2} aria-hidden="true" />
                </a>
              ) : null}
              {tel ? (
                <a
                  href={tel}
                  aria-label={`Llamar a ${t.persona_nombre || "el cliente"}`}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/60 text-titulo dark:text-titulo-dark ${foco}`}
                >
                  <HiOutlinePhone className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </a>
              ) : null}
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-700/70" />
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px]">
              <HiOutlineBuildingStorefront className={`h-5 w-5 shrink-0 ${suave}`} strokeWidth={2} aria-hidden="true" />
              <span className={suave}>Lo retira en</span>
              <strong className="font-extrabold text-titulo dark:text-titulo-dark">THAMES {t.oficina_nombre || "—"}</strong>
            </div>
            {t.cargado_por_gestor ? <span className={`text-[13px] ${suave}`}>Lo cargaste vos el {ddmm(t.creado_en)}.</span> : null}
          </Tarjeta>

          {/* 5 · Papeles */}
          <Desplegable
            id="ficha-papeles"
            icono={HiOutlineDocumentText}
            titulo="Papeles"
            resumen={
              papeles.length
                ? { txt: `${t.papeles_ok} de ${t.papeles_total}`, tono: faltanN ? "ambar" : "verde" }
                : docsPapel.length
                  ? { txt: `${docsPapel.length} archivo${docsPapel.length > 1 ? "s" : ""}`, tono: "suave" }
                  : null
            }
            abierto={abierto.papeles}
            onCambiar={() => cambiarAbierto("papeles")}
          >
            {t.cliente_subio_papeles ? (
              <span className={`self-start rounded-lg px-2.5 py-1 text-[13px] font-extrabold ${TONO_CAJA.azul}`}>El cliente mandó fotos hace poco</span>
            ) : null}
            {papeles.length ? (
              <ul className="flex flex-col">
                {papeles.map((p, i) => (
                  <li key={`${p.nombre}-${i}`}>
                    <button
                      type="button"
                      aria-pressed={!!p.ok}
                      disabled={!a.puede_papeles}
                      onClick={() => cambiarPapeles(papeles.map((x, j) => (j === i ? { ...x, ok: !x.ok } : x)))}
                      className={`flex min-h-[46px] w-full items-center gap-3 rounded-lg px-0.5 text-left text-titulo dark:text-titulo-dark disabled:cursor-default ${foco}`}
                    >
                      <span
                        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md ${
                          p.ok ? "bg-duo-verde-sombra text-white" : "border-2 border-slate-300 dark:border-slate-500"
                        }`}
                        aria-hidden="true"
                      >
                        {p.ok ? <HiOutlineCheck className="h-4 w-4" strokeWidth={3} /> : null}
                      </span>
                      <span className={`min-w-0 flex-1 break-words text-[15px] ${p.ok ? "font-semibold" : "font-bold"}`}>{p.nombre}</span>
                      {!p.ok ? (
                        <span className={`shrink-0 rounded-full px-[9px] py-[3px] text-[12px] font-extrabold ${TONO_CAJA.ambar}`}>Falta</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <span className={`text-[14px] ${suave}`}>No hay papeles en la lista.</span>
            )}
            {a.puede_papeles &&
              (agregando ? (
                <form onSubmit={agregarPapel} className="flex gap-2">
                  <input
                    value={papelNuevo}
                    maxLength={120}
                    onChange={(ev) => setPapelNuevo(ev.target.value)}
                    placeholder="¿Qué papel?"
                    aria-label="Nombre del papel"
                    className="h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark px-3.5 text-[16px] text-titulo dark:text-titulo-dark outline-none placeholder:text-suave dark:placeholder:text-suave-dark focus:border-duo-violeta"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className={`min-h-[48px] shrink-0 rounded-xl bg-duo-violeta px-4 text-[15px] font-extrabold text-white hover:bg-duo-violeta-sombra ${foco}`}
                  >
                    Agregar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAgregando(true)}
                  className={`flex min-h-[40px] items-center gap-1.5 self-start rounded-lg text-[14.5px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}
                >
                  <HiOutlinePlus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> Agregar otro papel
                </button>
              ))}
            {a.puede_subir_papel ? (
              <label
                className={`flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark px-4 text-[15px] font-extrabold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark focus-within:ring-2 focus-within:ring-duo-violeta ${
                  subiendo ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <HiOutlineCamera className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                {subiendo ? `Subiendo${subiendo === "1" ? "" : ` ${subiendo}`}…` : "Subir foto o PDF"}
                <input type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={subirPapeles} disabled={!!subiendo} />
              </label>
            ) : null}
            {docsPapel.length > 0 ? (
              <button
                type="button"
                aria-expanded={verArchivos}
                onClick={() => setVerArchivos((v) => !v)}
                className={`self-start rounded-lg text-left text-[14px] ${suave} ${foco}`}
              >
                {docsPapel.length === 1 ? "1 archivo subido" : `${docsPapel.length} archivos subidos`}
                {delCliente ? ` (${delCliente} del cliente)` : ""} ·{" "}
                <span className="font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff]">{verArchivos ? "Ocultar" : "Ver"}</span>
              </button>
            ) : null}
            {verArchivos && docsPapel.length > 0 ? (
              <div className="flex flex-col gap-2">
                {docsPapel.map((x) => (
                  <Archivo key={x.id} d={x} etiqueta={x.rol === "CLIENTE" ? <Etiqueta tono="azul">del cliente</Etiqueta> : null} />
                ))}
              </div>
            ) : null}
          </Desplegable>

          {/* 6 · 💵 La plata del cliente (solo con las comisiones prendidas) */}
          {t.ve_plata ? (
            <Desplegable
              id="ficha-plata"
              icono={HiOutlineBanknotes}
              titulo="Plata"
              resumen={resumenPlata}
              abierto={abierto.plata}
              onCambiar={() => cambiarAbierto("plata")}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className={`text-[13px] ${suave}`}>Precio</span>
                  {pl.precio == null ? (
                    <strong className={`text-[19px] font-extrabold ${TONO_TEXTO.ambar}`}>Falta</strong>
                  ) : (
                    <strong className="text-[21px] font-extrabold text-titulo dark:text-titulo-dark">{plata(pl.precio)}</strong>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-[13px] ${suave}`}>Te pagó</span>
                  <strong className={`text-[21px] font-extrabold ${cobros.length ? TONO_TEXTO.verde : "text-titulo dark:text-titulo-dark"}`}>
                    {plata(pl.cobrado)}
                  </strong>
                </div>
              </div>
              {cobros.length ? (
                <ul className="flex flex-col gap-2">
                  {cobros.map((x) => (
                    <li key={x.id}>
                      <a
                        href={x.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2.5 rounded-xl ${foco}`}
                        aria-label={`Comprobante de ${plata(x.monto)} del ${ddmm(x.fecha)}`}
                      >
                        <Miniatura d={x} />
                        <span className="min-w-0 flex-1 truncate text-[14px] text-slate-600 dark:text-slate-300">{x.nombre || "comprobante"}</span>
                        <span className={`shrink-0 text-[14px] font-extrabold ${TONO_TEXTO.verde}`}>{plata(x.monto)}</span>
                        <span className={`shrink-0 text-[12.5px] ${suave}`}>{ddmm(x.fecha)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`rounded-xl px-3 py-2 text-[14px] font-semibold ${TONO_CAJA.ambar}`}>
                  Todavía no subiste ningún comprobante. Sin comprobante no pasa a LISTO.
                </p>
              )}
              {sinMonto.map((x) => (
                <div key={x.id} className="flex flex-col gap-2 rounded-xl border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-3">
                  <span className="text-[14px] font-bold text-duo-azul-sombra dark:text-blue-200">
                    {x.rol === "CLIENTE" ? "El cliente mandó un comprobante:" : "Comprobante sin monto:"}
                  </span>
                  <Archivo d={x} />
                  {a.puede_cobro ? (
                    <button
                      type="button"
                      onClick={() => abrirCobro(x)}
                      className={`min-h-[44px] self-start rounded-xl bg-duo-azul px-3.5 text-[14px] font-extrabold text-white hover:bg-duo-azul-sombra ${foco}`}
                    >
                      Cargar cuánto pagó
                    </button>
                  ) : null}
                </div>
              ))}
              {a.puede_cobro ? (
                <button
                  type="button"
                  onClick={() => abrirCobro(null)}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-[15.5px] font-extrabold text-duo-verde-sombra dark:text-green-400 hover:brightness-95 ${foco}`}
                >
                  <HiOutlineCamera className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  Recibí plata
                </button>
              ) : null}
              {a.puede_precio ? (
                <button
                  type="button"
                  onClick={() => setModal("precio")}
                  className={`min-h-[40px] self-start rounded-lg text-[14.5px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`}
                >
                  {pl.precio == null ? "Cargar el precio" : "Cambiar el precio"}
                </button>
              ) : null}
              <p className={`flex items-center gap-1.5 text-[13px] ${suave}`}>
                <HiOutlineLockClosed className="h-[15px] w-[15px] shrink-0" strokeWidth={2} aria-hidden="true" />
                Lo ven solo vos y la administración de THAMES.
              </p>
            </Desplegable>
          ) : null}

          {/* 7 · Notas e historial */}
          <Desplegable
            id="ficha-notas"
            icono={HiOutlineClock}
            titulo="Notas e historial"
            resumen={{ txt: String(movs.length), tono: "suave" }}
            abierto={abierto.notas}
            onCambiar={() => cambiarAbierto("notas")}
          >
            {a.puede_nota ? (
              <form onSubmit={guardarNota} className="flex flex-col gap-2" aria-label="Anotar algo">
                <div className="flex gap-2">
                  <input
                    id="nota-gestora"
                    value={nota.txt}
                    maxLength={2000}
                    onChange={(ev) => setNota((n) => ({ ...n, txt: ev.target.value }))}
                    placeholder="Anotar algo (ej: turno el jueves)"
                    aria-label="Anotar algo"
                    className="h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark px-3.5 text-[16px] text-titulo dark:text-titulo-dark outline-none placeholder:text-suave dark:placeholder:text-suave-dark focus:border-duo-violeta"
                  />
                  <button
                    type="submit"
                    disabled={ocupado}
                    className={`min-h-[48px] shrink-0 rounded-xl bg-slate-700 px-4 text-[15px] font-extrabold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500 ${foco}`}
                  >
                    Anotar
                  </button>
                </div>
                <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-[14px] text-titulo dark:text-titulo-dark">
                  <input
                    type="checkbox"
                    checked={nota.vis && !nota.soloAdmin}
                    disabled={nota.soloAdmin}
                    onChange={(ev) => setNota((n) => ({ ...n, vis: ev.target.checked }))}
                    className="h-5 w-5 shrink-0 accent-duo-violeta"
                  />
                  Que lo vea el cliente (en su link)
                </label>
                {t.ve_plata ? (
                  <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-[14px] text-titulo dark:text-titulo-dark">
                    <input
                      type="checkbox"
                      checked={nota.soloAdmin}
                      onChange={(ev) => setNota((n) => ({ ...n, soloAdmin: ev.target.checked }))}
                      className="h-5 w-5 shrink-0 accent-duo-violeta"
                    />
                    Que no la vea la oficina (notas con plata)
                  </label>
                ) : null}
              </form>
            ) : null}
            <ul className="flex flex-col">
              {movs.length ? (
                movs.map((mv) => (
                  <li key={mv.id} className="flex flex-col gap-0.5 border-t border-slate-100 dark:border-slate-700/70 py-2.5 first:border-t-0">
                    <span className={`text-[12px] ${suave}`}>
                      {ddmmhhmm(mv.fecha)} · {mv.autor || "—"}
                      {mv.visible_cliente ? <span className="font-semibold text-duo-azul dark:text-blue-300"> · lo ve el cliente</span> : null}
                    </span>
                    <span className="whitespace-pre-line break-words text-[14px] text-titulo dark:text-titulo-dark">{mv.texto}</span>
                  </li>
                ))
              ) : (
                <li className={`py-2.5 text-[14px] ${suave}`}>Todavía no hay movimientos.</li>
              )}
            </ul>
          </Desplegable>
        </main>

        {/* 👇 EL botón del paso (fijo abajo, a mano del pulgar) */}
        {botones ? (
          <footer
            ref={pieRef}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 pb-3.5 pt-3">
              {recien ? (
                <div
                  aria-hidden="true"
                  className={`flex min-h-[56px] items-center justify-center gap-2 rounded-[14px] text-[16px] font-extrabold ${TONO_CAJA.verde}`}
                >
                  <HiOutlineCheckCircle className="h-[22px] w-[22px]" strokeWidth={2} />
                  {recien}
                </div>
              ) : (
                <>
                  {pista ? <p className={`text-center text-[13.5px] font-semibold ${TONO_TEXTO[pista.tono] || suave}`}>{pista.txt}</p> : null}
                  {botones}
                </>
              )}
            </div>
          </footer>
        ) : null}
        {/* Para el lector de pantalla: siempre está, así anuncia "Anotado: …" cuando cambia. */}
        <p role="status" className="sr-only">
          {recien}
        </p>
      </div>

      {/* Ventanitas */}
      <HojaObservado
        t={t}
        abierto={modal === "observar"}
        onCerrar={cerrarModal}
        onGuardar={async (body) => {
          const nuevo = await cambiarEstado(t.id, body);
          setT(conMisPapeles(nuevo));
          cerrarModal();
          recargarLista?.();
          toast.success("Marcado como observado");
        }}
      />
      <CobroGestora
        t={t}
        abierto={modal === "cobro" || modal === "cobroListo"}
        luegoListo={modal === "cobroListo"}
        documento={cobroDoc}
        onCerrar={cerrarModal}
        onGuardar={async (body) => {
          const nuevo = await registrarCobro(t.id, body);
          setT(conMisPapeles(nuevo));
          cerrarModal();
          recargarLista?.();
          // aviso = se guardó el cobro pero justo no pudo pasar a LISTO (ej: lo marcaron observado).
          if (nuevo?.aviso) toast.error(nuevo.aviso, { duration: 7000 });
          else if (body.pasar_a_listo && nuevo?.estado === "LISTO") setListo(nuevo);
          else toast.success("Listo: quedó el comprobante del cobro");
        }}
      />
      <PrecioGestora
        t={t}
        abierto={modal === "precio" || modal === "precioListo"}
        luegoListo={modal === "precioListo"}
        onCerrar={cerrarModal}
        onGuardar={async (body) => {
          const nuevo = await cargarPrecio(t.id, body);
          setT(conMisPapeles(nuevo));
          cerrarModal();
          recargarLista?.();
          if (body.pasar_a_listo && nuevo?.estado === "LISTO") setListo(nuevo);
          else toast.success("Precio guardado");
        }}
      />
      {modal === "vehiculo" ? (
        <ModalVehiculo
          t={t}
          onCerrar={cerrarModal}
          onGuardar={async (body) => {
            const nuevo = await editarTramite(t.id, body);
            setT(conMisPapeles(nuevo));
            cerrarModal();
            recargarLista?.();
            toast.success(body.patente ? `Patente ${body.patente} guardada` : "Vehículo guardado");
          }}
        />
      ) : null}

      {/* ✅ ¡Listo! */}
      {listo ? (
        <ListoGestora
          t={listo}
          catalogo={catalogo}
          siguiente={loQueSigue(lista, listo.id)}
          desde={desde}
          onInicio={() => (desde === "inicio" ? navigate(-1) : navigate("/gestoria", { replace: true }))}
        />
      ) : null}
    </>
  );
}
