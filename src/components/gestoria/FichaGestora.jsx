// src/components/gestoria/FichaGestora.jsx
//
// 📄 El trámite como lo ve el GESTOR (29/09, Franco: "hay mucha información y
// no se entiende"). Pensado para el celu, de arriba a abajo:
//   1. En qué está y hace cuánto, qué trámite es y la patente (o el nombre, si
//      es la licencia de conducir).
//   2. «Ahora te toca»: lo que tiene que hacer y EL botón para hacerlo
//      (Lo presenté en el registro · Está LISTO · Observado · Lo presenté otra vez).
//   3. El cliente (nombre, DNI, teléfono), dónde lo retira y el auto, con
//      «Agregar patente» si se cargó sin patente.
//   4. Los papeles: se tocan los que ya están, «Subir foto o PDF» y «Ver archivos».
//   5. 💵 La plata del cliente (con las comisiones prendidas): el precio y cada
//      cobro con su comprobante. «Recibí plata» = cuánto te pagó + la foto (Franco
//      29/09: "cada vez que la gestora reciba plata, que suba el comprobante").
//      Sin al menos uno, no pasa a LISTO.
//   6. «Anotar algo» y el historial (cerrado: se abre si hace falta).
// 🔒 Sin póliza ni la comisión de THAMES (%, monto, lo que debe): la ve solo el
//    admin y el servidor ni siquiera se la manda.
// La oficina y el admin siguen con la ficha completa (FichaTramite.jsx).
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiArrowLeft, HiCamera, HiCheck, HiChevronDown, HiPlus } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
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
import { Archivo, Cargando, Demorado, Etiqueta } from "./Piezas";
import { ModalCobro, ModalObservar, ModalPrecio } from "./ModalesTramite";
import { DatoVehiculo } from "./FichaTramite";
import { ESTADO_GESTOR, ddmm, ddmmhhmm, diasEnEstado, esDemorado, plata, textoDias, textoListoGestor } from "./gestoriaUtils";

const suave = "text-suave dark:text-suave-dark";
const tarjeta = "flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 shadow-sm";
const btnBase =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-4 text-[16px] font-bold text-white transition-colors active:scale-[0.99] disabled:opacity-50";
const BTN = {
  violeta: `${btnBase} bg-duo-violeta hover:bg-duo-violeta-sombra`,
  verde: `${btnBase} bg-duo-verde hover:bg-duo-verde-sombra`,
  naranja: `${btnBase} bg-orange-600 hover:bg-orange-700`,
};

/**
 * 💵 La plata del cliente: el precio y cada cobro con su comprobante («Recibí plata»).
 * Sin la comisión de THAMES (la ve solo el admin). Solo con las comisiones prendidas.
 * Ej: «Precio $ 150.000 · Te pagó $ 50.000 · Falta $ 100.000».
 */
function PlataDelCliente({ t, a, onPrecio, onCobro }) {
  const comprobantes = (t.documentos || []).filter((x) => x.tipo === "COMPROBANTE");
  const cobros = comprobantes.filter((x) => x.monto != null);
  const sinMonto = comprobantes.filter((x) => x.monto == null);
  const precio = t.precio_gestoria != null ? Number(t.precio_gestoria) : null;
  const cobrado = Number(t.cobrado || 0);
  const falta = precio != null ? precio - cobrado : null;
  let sub = "";
  if (falta != null && cobros.length) sub = falta > 0 ? `Falta ${plata(falta)}` : falta === 0 ? "Pagó todo" : "Pagó más que el precio";
  return (
    <section className={tarjeta} aria-label="Plata del cliente">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-titulo dark:text-titulo-dark">Plata del cliente</h2>
        {a.puede_precio && (
          <button type="button" onClick={onPrecio} className="min-h-[40px] rounded-lg px-2 text-[14px] font-bold text-duo-violeta hover:underline">
            {precio == null ? "Cargar precio" : "Cambiar precio"}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5 rounded-xl bg-surface dark:bg-surface-dark px-3 py-2.5">
          <span className={`text-[12px] ${suave}`}>Precio al cliente</span>
          {precio == null ? (
            <strong className="text-[17px] text-duo-amarillo-sombra dark:text-amber-300">Falta</strong>
          ) : (
            <strong className="text-[17px] text-titulo dark:text-titulo-dark">{plata(precio)}</strong>
          )}
        </div>
        <div className="flex flex-col gap-0.5 rounded-xl bg-surface dark:bg-surface-dark px-3 py-2.5">
          <span className={`text-[12px] ${suave}`}>Te pagó</span>
          <strong className="text-[17px] text-titulo dark:text-titulo-dark">{plata(cobrado)}</strong>
          {sub ? <span className={`text-[12px] ${falta < 0 ? "text-duo-amarillo-sombra dark:text-amber-300" : suave}`}>{sub}</span> : null}
        </div>
      </div>
      {cobros.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {cobros.map((x) => (
            <li key={x.id} className="flex items-center gap-2">
              <span className="shrink-0 min-w-[5.5rem] text-center rounded-lg bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-2 py-1 text-[13px] font-bold text-duo-verde-sombra dark:text-green-400">
                {plata(x.monto)}
              </span>
              <div className="flex-1 min-w-0">
                <Archivo d={x} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-2 text-[14px] text-duo-amarillo-sombra dark:text-amber-200">
          Todavía no subiste ningún comprobante. Sin comprobante no se puede pasar a LISTO.
        </p>
      )}
      {sinMonto.map((x) => (
        <div key={x.id} className="flex flex-col gap-2 rounded-xl border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-3">
          <span className="text-[14px] font-semibold text-duo-azul dark:text-blue-200">
            {x.rol === "CLIENTE" ? "El cliente mandó un comprobante:" : "Comprobante sin monto:"}
          </span>
          <Archivo d={x} />
          {a.puede_cobro && (
            <button
              type="button"
              onClick={() => onCobro(x)}
              className="self-start min-h-[40px] rounded-lg bg-duo-azul hover:bg-duo-azul-sombra px-3.5 text-[14px] font-bold text-white"
            >
              Cargar cuánto pagó
            </button>
          )}
        </div>
      ))}
      {a.puede_cobro && (
        <button
          type="button"
          onClick={() => onCobro(null)}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-duo-verde hover:bg-duo-verde-sombra px-4 text-[16px] font-bold text-white active:scale-[0.99]"
        >
          <HiCamera className="w-5 h-5" aria-hidden="true" /> Recibí plata: subir comprobante
        </button>
      )}
      <span className={`text-[13px] ${suave}`}>Cada vez que el cliente te pague, subí el comprobante acá. Lo ve solo la administración de THAMES.</span>
    </section>
  );
}

/** «Ahora te toca»: lo que tiene que hacer el gestor y el botón para hacerlo. */
function AhoraTeToca({ t, ocupado, onAvanzar, onObservar }) {
  const puede = (e) => (t.acciones?.estados || []).includes(e);
  const persona = t.con_vehiculo === false; // licencia: no va al registro automotor
  const faltanN = Math.max(0, (t.papeles_total || 0) - (t.papeles_ok || 0));
  let tono = "violeta";
  let titulo;
  let texto = null;
  let botones = null;

  if (t.estado === "ASIGNADO") {
    titulo = persona ? "Presentarlo" : "Presentarlo en el registro";
    if (faltanN) texto = `Ojo: ${faltanN === 1 ? "falta 1 papel" : `faltan ${faltanN} papeles`} de la lista.`;
    if (puede("EN_REGISTRO")) {
      botones = (
        <button type="button" disabled={ocupado} onClick={() => onAvanzar("EN_REGISTRO")} className={`${BTN.violeta} w-full`}>
          {persona ? "Lo presenté" : "Lo presenté en el registro"}
        </button>
      );
    }
  } else if (t.estado === "EN_REGISTRO") {
    titulo = "Esperar la respuesta";
    texto = "Cuando esté, tocá «Está LISTO». Si pidieron algo más, «Observado».";
    if (t.ve_plata && !t.cobros_n) texto += " Para LISTO vas a necesitar el comprobante de lo que te pagó el cliente.";
    botones = (
      <div className="grid grid-cols-2 gap-2">
        {puede("LISTO") && (
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("LISTO")} className={BTN.verde}>
            Está LISTO
          </button>
        )}
        {puede("OBSERVADO") && (
          <button type="button" disabled={ocupado} onClick={onObservar} className={BTN.naranja}>
            Observado
          </button>
        )}
      </div>
    );
  } else if (t.estado === "OBSERVADO") {
    tono = "naranja";
    titulo = "Conseguir lo que falta y volver a presentarlo";
    if (t.falta) {
      texto = (
        <>
          El registro pidió: <strong>{t.falta}</strong>
        </>
      );
    }
    if (puede("EN_REGISTRO")) {
      botones = (
        <button type="button" disabled={ocupado} onClick={() => onAvanzar("EN_REGISTRO")} className={`${BTN.violeta} w-full`}>
          Lo presenté otra vez
        </button>
      );
    }
  } else if (t.estado === "LISTO") {
    tono = "verde";
    titulo = "¡Listo! No tenés que hacer nada más";
    texto = `Ahora el cliente lo retira en THAMES ${t.oficina_nombre || ""}.`.replace(/ \.$/, ".");
  } else if (t.estado === "ENTREGADO") {
    tono = "neutro";
    titulo = "Entregado";
    texto = t.entregado_en ? `El cliente lo retiró el ${ddmm(t.entregado_en)}.` : null;
  } else if (t.estado === "CANCELADO") {
    tono = "neutro";
    titulo = "Cancelado";
    texto = t.cancelado_en ? `Se canceló el ${ddmm(t.cancelado_en)}.` : null;
  } else {
    tono = "neutro";
    titulo = "Todavía no está asignado";
  }

  const caja = {
    violeta: "border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]",
    naranja: "border-orange-400 dark:border-orange-500/60 bg-orange-50 dark:bg-orange-500/10",
    verde: "border-duo-verde/50 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]",
    neutro: "border-linea dark:border-linea-dark bg-card dark:bg-card-dark",
  }[tono];
  const eti = {
    violeta: "text-duo-violeta dark:text-[#c7c3ff]",
    naranja: "text-orange-700 dark:text-orange-300",
    verde: "text-duo-verde-sombra dark:text-green-400",
    neutro: suave,
  }[tono];
  const cerrado = t.estado === "ENTREGADO" || t.estado === "CANCELADO";

  return (
    <section className={`flex flex-col gap-2.5 rounded-2xl border p-4 ${caja}`} aria-label="Ahora te toca">
      <span className={`text-[12px] font-bold tracking-wide ${eti}`}>{cerrado ? "CERRADO" : "AHORA TE TOCA"}</span>
      <strong className="text-[18px] leading-snug text-titulo dark:text-titulo-dark">{titulo}</strong>
      {texto ? <p className="text-[15px] leading-snug text-titulo dark:text-titulo-dark">{texto}</p> : null}
      {botones}
    </section>
  );
}

export default function FichaGestora() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { catalogo } = useGestoria();
  const avisoListo = textoListoGestor(catalogo);
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // "observar" | "precio" | "precioListo" | "cobro" | "cobroListo"
  const [cobroDoc, setCobroDoc] = useState(null); // comprobante del cliente al que se le carga el monto
  const [ocupado, setOcupado] = useState(false);
  const [subiendo, setSubiendo] = useState(""); // "" | "1" | "2 de 3"
  const [verArchivos, setVerArchivos] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [papelNuevo, setPapelNuevo] = useState("");
  const [nota, setNota] = useState({ txt: "", vis: false, soloAdmin: false });

  // ✅ Papeles: se guardan un ratito después del último toque (3 toques = 1 pedido).
  //    Hasta que el servidor confirma, manda la lista del celu: si en el medio llega
  //    una recarga "en vivo" (o la respuesta de otro botón), no se pierden los tildes.
  const papelesSeq = useRef(0);
  const papelesTimer = useRef(null);
  const papelesPendientes = useRef(null); // esperando el ratito para mandarse
  const sinConfirmar = useRef(null); // la última lista tocada, hasta que el servidor la confirma
  const conMisPapeles = useCallback((nuevo) => {
    const lista = sinConfirmar.current;
    if (!nuevo || !lista) return nuevo;
    return { ...nuevo, papeles: lista, papeles_ok: lista.filter((p) => p.ok).length, papeles_total: lista.length };
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
    setVerArchivos(false);
    setVerHistorial(false);
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

  const hacer = async (fn, ok) => {
    setOcupado(true);
    try {
      const nuevo = await fn();
      if (nuevo && nuevo.id) setT(conMisPapeles(nuevo));
      if (ok) toast.success(typeof ok === "function" ? ok(nuevo) : ok);
      return nuevo;
    } catch (e) {
      toast.error(mensajeError(e));
      throw e;
    } finally {
      setOcupado(false);
    }
  };
  const intentar = (fn, ok) => hacer(fn, ok).catch(() => {});

  if (error && !t) {
    return (
      <div className="mx-auto w-full max-w-2xl flex flex-col items-start gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
        <p className="text-[15px] text-titulo dark:text-titulo-dark">{error}</p>
        <Link to="/gestoria" className="min-h-[44px] inline-flex items-center text-[15px] font-bold text-duo-violeta">
          Volver a Mis trámites
        </Link>
      </div>
    );
  }
  if (!t) {
    return (
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-3">
        <Cargando alto="h-24" />
        <Cargando alto="h-36" />
        <Cargando alto="h-64" />
      </div>
    );
  }

  const a = t.acciones || {};
  const cerrado = t.estado === "ENTREGADO" || t.estado === "CANCELADO";
  const e = ESTADO_GESTOR[t.estado] || ESTADO_GESTOR.RECIBIDO;
  const d = diasEnEstado(t);
  const dem = esDemorado(t);
  const papeles = Array.isArray(t.papeles) ? t.papeles : [];
  const docsPapel = (t.documentos || []).filter((x) => x.tipo === "PAPEL");
  const delCliente = docsPapel.filter((x) => x.rol === "CLIENTE").length;
  const movs = t.movimientos || [];
  const persona = t.con_vehiculo === false;

  const avanzar = (nuevo) => {
    // 💵 Para LISTO: al menos un comprobante de cobro (y el precio). Se piden en la misma ventanita.
    if (nuevo === "LISTO" && t.ve_plata && !t.cobros_n) {
      setCobroDoc(null);
      setModal("cobroListo");
      return;
    }
    if (nuevo === "LISTO" && t.ve_plata && t.precio_gestoria == null) {
      setModal("precioListo");
      return;
    }
    const ok = nuevo === "LISTO" ? avisoListo : nuevo === "EN_REGISTRO" ? "Anotado: está en el registro" : "Guardado";
    intentar(() => cambiarEstado(t.id, { estado: nuevo }), ok);
  };

  const cambiarPapeles = (lista) => {
    sinConfirmar.current = lista;
    setT((x) => ({ ...x, papeles: lista, papeles_ok: lista.filter((p) => p.ok).length, papeles_total: lista.length }));
    const n = ++papelesSeq.current;
    papelesPendientes.current = lista;
    clearTimeout(papelesTimer.current);
    papelesTimer.current = setTimeout(async () => {
      papelesTimer.current = null;
      papelesPendientes.current = null;
      try {
        const nuevo = await editarTramite(t.id, { papeles: lista });
        if (n === papelesSeq.current) {
          sinConfirmar.current = null;
          setT(nuevo);
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

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate("/gestoria")}
        className="self-start inline-flex items-center gap-1.5 min-h-[44px] text-[15px] font-bold text-duo-violeta"
      >
        <HiArrowLeft className="w-5 h-5" aria-hidden="true" /> Mis trámites
      </button>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3.5 py-2.5 text-[14px] text-duo-amarillo-sombra dark:text-amber-200"
        >
          No se pudo actualizar: {error}
        </p>
      )}

      {/* 1 · Qué es y en qué está */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[13px] font-bold ${e.chip}`}>
            {e.txt}
            {!cerrado ? ` · ${textoDias(d)}` : ""}
          </span>
          {dem && <Demorado />}
          <span className={`font-mono text-[12px] ${suave}`}>{t.numero}</span>
        </div>
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-titulo dark:text-titulo-dark">{t.tipo_txt}</h1>
        {persona ? (
          <span className="text-[16px] text-titulo dark:text-titulo-dark">{t.persona_nombre}</span>
        ) : t.patente || t.vehiculo ? (
          <span className="text-[16px] text-titulo dark:text-titulo-dark">
            <strong className="font-mono tracking-wide">{t.patente || "Sin patente"}</strong>
            {t.vehiculo ? <span className={suave}> · {t.vehiculo}</span> : null}
          </span>
        ) : (
          <span className={`text-[15px] ${suave}`}>Sin patente todavía</span>
        )}
      </div>

      {/* 2 · Ahora te toca */}
      <AhoraTeToca t={t} ocupado={ocupado} onAvanzar={avanzar} onObservar={() => setModal("observar")} />

      {/* 3 · Cliente (y el auto) */}
      <section className={tarjeta} aria-label="Cliente">
        <div className="flex flex-col gap-0.5">
          <span className={`text-[12px] ${suave}`}>Cliente</span>
          <strong className="text-[17px] text-titulo dark:text-titulo-dark">{t.persona_nombre || "—"}</strong>
          <span className={`text-[14px] ${suave}`}>
            {[t.persona_dni && `DNI ${t.persona_dni}`, t.persona_telefono].filter(Boolean).map((x, k) => (
              <span key={k} className="whitespace-nowrap">
                {k ? " · " : ""}
                {x}
              </span>
            ))}
            {!t.persona_dni && !t.persona_telefono ? "Sin DNI ni teléfono" : null}
          </span>
          <span className="text-[14px] text-titulo dark:text-titulo-dark">
            Lo retira en <strong>THAMES {t.oficina_nombre || "—"}</strong>
          </span>
          {t.cargado_por_gestor && <span className={`text-[13px] ${suave}`}>Lo cargaste vos el {ddmm(t.creado_en)}.</span>}
        </div>
        {!persona && (
          <div className="border-t border-linea dark:border-linea-dark pt-3">
            <DatoVehiculo
              t={t}
              puede={!!a.puede_vehiculo}
              ocupado={ocupado}
              onGuardar={(body) => hacer(() => editarTramite(t.id, body), body.patente ? `Patente ${body.patente} guardada` : "Vehículo guardado")}
            />
          </div>
        )}
      </section>

      {/* 4 · Papeles */}
      <section className={tarjeta} aria-label="Papeles">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-bold text-titulo dark:text-titulo-dark">Papeles</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[13px] font-bold ${
              papeles.length && t.papeles_ok === papeles.length ? ESTADO_GESTOR.LISTO.chip : ESTADO_GESTOR.RECIBIDO.chip
            }`}
          >
            {t.papeles_ok} de {t.papeles_total}
          </span>
        </div>
        {papeles.length ? (
          <ul className="flex flex-col gap-2">
            {papeles.map((p, i) => (
              <li key={`${p.nombre}-${i}`}>
                <button
                  type="button"
                  aria-pressed={!!p.ok}
                  disabled={!a.puede_papeles}
                  onClick={() => cambiarPapeles(papeles.map((x, j) => (j === i ? { ...x, ok: !x.ok } : x)))}
                  className={`w-full flex items-center gap-3 rounded-xl px-3.5 min-h-[48px] text-left text-[15px] text-titulo dark:text-titulo-dark transition-colors disabled:cursor-default ${
                    p.ok
                      ? "border border-duo-verde/50 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]"
                      : "border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      p.ok ? "bg-duo-verde text-white" : "border-2 border-slate-300 dark:border-slate-600"
                    }`}
                    aria-hidden="true"
                  >
                    {p.ok && <HiCheck className="w-3.5 h-3.5" />}
                  </span>
                  <span className="flex-1 min-w-0 break-words">{p.nombre}</span>
                  {!p.ok && <span className={`shrink-0 text-[12px] ${suave}`}>falta</span>}
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
                className="flex-1 min-w-0 h-12 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta"
                autoFocus
              />
              <button type="submit" className="shrink-0 min-h-[48px] rounded-xl bg-duo-violeta hover:bg-duo-violeta-sombra px-4 text-[15px] font-bold text-white">
                Agregar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="self-start inline-flex items-center gap-1.5 min-h-[40px] text-[14px] font-bold text-duo-violeta"
            >
              <HiPlus className="w-4 h-4" aria-hidden="true" /> Agregar otro papel
            </button>
          ))}
        <div className="flex flex-wrap gap-2 border-t border-linea dark:border-linea-dark pt-3">
          {a.puede_subir_papel && (
            <label
              className={`flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-slate-400 dark:border-slate-500 px-4 text-[15px] font-bold text-titulo dark:text-titulo-dark cursor-pointer hover:bg-surface dark:hover:bg-surface-dark focus-within:ring-2 focus-within:ring-duo-violeta/40 ${
                subiendo ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <HiCamera className="w-5 h-5" aria-hidden="true" />
              {subiendo ? `Subiendo${subiendo === "1" ? "" : ` ${subiendo}`}…` : "Subir foto o PDF"}
              <input type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={subirPapeles} disabled={!!subiendo} />
            </label>
          )}
          {docsPapel.length > 0 && (
            <button
              type="button"
              aria-expanded={verArchivos}
              onClick={() => setVerArchivos((v) => !v)}
              className="min-h-[48px] rounded-xl border border-linea dark:border-linea-dark px-4 text-[14px] font-bold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
            >
              {verArchivos ? "Ocultar archivos" : `Ver ${docsPapel.length} archivo${docsPapel.length > 1 ? "s" : ""}`}
              {!verArchivos && delCliente ? ` (${delCliente} del cliente)` : ""}
            </button>
          )}
        </div>
        {verArchivos && docsPapel.length > 0 && (
          <div className="flex flex-col gap-2">
            {docsPapel.map((x) => (
              <Archivo key={x.id} d={x} etiqueta={x.rol === "CLIENTE" ? <Etiqueta tono="azul">del cliente</Etiqueta> : null} />
            ))}
          </div>
        )}
      </section>

      {/* 5 · La plata del cliente: precio y cobros (solo con las comisiones prendidas) */}
      {t.ve_plata && (
        <PlataDelCliente
          t={t}
          a={a}
          onPrecio={() => setModal("precio")}
          onCobro={(doc) => {
            setCobroDoc(doc);
            setModal("cobro");
          }}
        />
      )}

      {/* 6 · Anotar algo */}
      {a.puede_nota && (
        <form onSubmit={guardarNota} className={tarjeta} aria-label="Anotar algo">
          <label htmlFor="nota-gestor" className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">
            Anotar algo
          </label>
          <div className="flex gap-2 -mt-1.5">
            <input
              id="nota-gestor"
              value={nota.txt}
              maxLength={2000}
              onChange={(ev) => setNota((n) => ({ ...n, txt: ev.target.value }))}
              placeholder="Ej: el registro da turno el jueves"
              className="flex-1 min-w-0 h-12 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta"
            />
            <button
              type="submit"
              disabled={ocupado}
              className="shrink-0 min-h-[48px] rounded-xl bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 px-4 text-[15px] font-bold text-white disabled:opacity-50"
            >
              Anotar
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-2.5 min-h-[36px] text-[14px] text-titulo dark:text-titulo-dark cursor-pointer">
              <input
                type="checkbox"
                checked={nota.vis && !nota.soloAdmin}
                disabled={nota.soloAdmin}
                onChange={(ev) => setNota((n) => ({ ...n, vis: ev.target.checked }))}
                className="w-[18px] h-[18px]"
              />
              Que lo vea el cliente (en su link)
            </label>
            {t.ve_plata && (
              <label className="inline-flex items-center gap-2.5 min-h-[36px] text-[14px] text-titulo dark:text-titulo-dark cursor-pointer">
                <input
                  type="checkbox"
                  checked={nota.soloAdmin}
                  onChange={(ev) => setNota((n) => ({ ...n, soloAdmin: ev.target.checked }))}
                  className="w-[18px] h-[18px]"
                />
                Que no la vea la oficina (notas con plata)
              </label>
            )}
          </div>
        </form>
      )}

      {/* 7 · Historial (cerrado) */}
      <section className="rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm" aria-label="Historial">
        <button
          type="button"
          aria-expanded={verHistorial}
          onClick={() => setVerHistorial((v) => !v)}
          className="w-full flex items-center justify-between gap-2 min-h-[52px] px-4 text-left text-[15px] font-bold text-titulo dark:text-titulo-dark"
        >
          <span>
            Historial <span className={`font-normal ${suave}`}>· {movs.length} movimiento{movs.length === 1 ? "" : "s"}</span>
          </span>
          <HiChevronDown className={`w-5 h-5 shrink-0 transition-transform ${verHistorial ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {verHistorial && (
          <ul className="flex flex-col px-4 pb-3">
            {movs.length ? (
              movs.map((mv) => (
                <li key={mv.id} className="flex flex-col gap-0.5 border-t border-linea/70 dark:border-linea-dark/70 py-2.5">
                  <span className={`text-[12px] ${suave}`}>
                    {ddmmhhmm(mv.fecha)} · {mv.autor || "—"}
                    {mv.visible_cliente && <span className="font-semibold text-duo-azul"> · lo ve el cliente</span>}
                  </span>
                  <span className="text-[14px] text-titulo dark:text-titulo-dark whitespace-pre-line break-words">{mv.texto}</span>
                </li>
              ))
            ) : (
              <li className={`border-t border-linea/70 dark:border-linea-dark/70 py-2.5 text-[14px] ${suave}`}>Todavía no hay movimientos.</li>
            )}
          </ul>
        )}
      </section>

      <ModalPrecio
        t={t}
        abierto={modal === "precio" || modal === "precioListo"}
        luegoListo={modal === "precioListo"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await cargarPrecio(t.id, body);
          setT(conMisPapeles(nuevo));
          setModal(null);
          toast.success(body.pasar_a_listo ? avisoListo : "Precio guardado");
        }}
      />
      <ModalCobro
        t={t}
        abierto={modal === "cobro" || modal === "cobroListo"}
        luegoListo={modal === "cobroListo"}
        documento={cobroDoc}
        onCerrar={() => {
          setModal(null);
          setCobroDoc(null);
        }}
        onGuardar={async (body) => {
          const nuevo = await registrarCobro(t.id, body);
          setT(conMisPapeles(nuevo));
          setModal(null);
          setCobroDoc(null);
          // aviso = se guardó el cobro pero justo no pudo pasar a LISTO (ej: lo marcaron observado).
          if (nuevo.aviso) toast.error(nuevo.aviso, { duration: 7000 });
          else toast.success(body.pasar_a_listo ? avisoListo : "Listo: quedó el comprobante del cobro");
        }}
      />
      <ModalObservar
        abierto={modal === "observar"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await cambiarEstado(t.id, body);
          setT(conMisPapeles(nuevo));
          setModal(null);
          toast.success("Marcado como observado");
        }}
      />
    </div>
  );
}
