// src/pages/LegalesDetailPage.jsx
//
// 📄 Ficha de un caso legal (/legales/:id): en qué paso está, qué significa
// (en palabras simples), las fechas importantes, los papeles, el abogado y sus
// turnos, el WhatsApp al cliente (a mano) y la bitácora.
//   - Admin: además «Plata 🔒» (honorarios, comisión, cobrarla, comprobantes).
//   - Abogado: su caso con su plata; cambia el estado, anota, marca fechas.
//   - Oficina: todo menos la plata (el servidor ni siquiera se la manda) y
//     sin cambiar el estado (eso es del abogado).
// En el celu se ordena distinto: primero "Cómo va", el turno y las fechas.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiArrowLeft, HiArrowRight, HiDocumentText, HiLink, HiPencil } from "react-icons/hi";

import useDatosVivos from "../hooks/useDatosVivos";
import { useLegales } from "../components/legales/legalesContext";
import {
  agregarFecha,
  anotar,
  asignarAbogado,
  avisoWhatsapp,
  borrarDocumento,
  borrarFecha,
  cambiarEstado,
  cambiarEstadoTurno,
  cargarHonorarios,
  cobrarComision,
  darTurno,
  deshacerComision,
  editarCaso,
  editarFecha,
  guardarDocumento,
  guardarNovedadEnPartes,
  mensajeError,
  pedirCaso,
  subirArchivo,
} from "../services/legales";
import { Cargando, Demorado, Punto, Seccion } from "../components/gestoria/Piezas";
import { EstadoPill, PasosCaso } from "../components/legales/PiezasLegales";
import { Etiqueta } from "../components/legales/abogado/piezasAbogado";
import ExpedienteDocumentosPanel from "../components/legales/ExpedienteDocumentosPanel";
import {
  ComoVa,
  SeccionAbogado,
  SeccionAvisoCliente,
  SeccionBitacora,
  SeccionCliente,
  SeccionDatos,
  SeccionFechas,
  SeccionPlata,
} from "../components/legales/SeccionesCaso";
import {
  ModalCambiarFecha,
  ModalCobrar,
  ModalDatos,
  ModalEstado,
  ModalHonorarios,
  ModalNovedad,
  ModalTurno,
} from "../components/legales/ModalesCaso";
import { BotonWa } from "../components/legales/PiezasLegales";
import {
  ESTADOS,
  colorOficina,
  ddmm,
  esDemorado,
  linkCaso,
  linkWhatsAppOElegir,
  primerNombre,
  textoConLink,
  volverOIr,
} from "../components/legales/legalesUtils";

const CELU = "(max-width: 1023.5px)";
function useEsCelu() {
  const [celu, setCelu] = useState(() => typeof window !== "undefined" && window.matchMedia(CELU).matches);
  useEffect(() => {
    const mq = window.matchMedia(CELU);
    const cambio = () => setCelu(mq.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return celu;
}

export default function LegalesDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { catalogo, abogados, esAbogado, recargarAbogados } = useLegales();
  const [e, setE] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // "estado" | "novedad" | "honorarios" | "cobrar" | "turno" | "datos" | {tipo: "fecha", v}
  const [estadoInicial, setEstadoInicial] = useState("");
  const celu = useEsCelu();
  const staff = !esAbogado;
  const miOficina = catalogo?.mi_oficina || e?.oficina || null;

  // `enSegundoPlano`: el refresco automático. Si falla por un corte, la ficha
  // queda como estaba (y lo que se está escribiendo no se pierde); se vuelve a
  // intentar en el próximo refresco. Solo un 404 (el caso ya no está a la
  // vista) cambia la pantalla.
  const cargar = useCallback(async ({ enSegundoPlano = false } = {}) => {
    try {
      setE(await pedirCaso(id));
      setError("");
    } catch (err) {
      const no404 = err?.response?.status !== 404;
      if (enSegundoPlano && no404) return;
      setError(no404 ? mensajeError(err, "No se pudo abrir el caso.") : "Ese caso no existe o no está a la vista para tu usuario.");
    }
  }, [id]);

  useEffect(() => {
    setE(null);
    setError("");
    cargar();
  }, [cargar]);

  useDatosVivos(["legales"], () => cargar({ enSegundoPlano: true }));

  // Desde "Para hacer hoy" → "Darle turno": /legales/12?turno=1
  useEffect(() => {
    if (e && params.get("turno") === "1") {
      if (e.puede?.turno) setModal("turno");
      const p = new URLSearchParams(params);
      p.delete("turno");
      setParams(p, { replace: true });
    }
  }, [e, params, setParams]);

  const hacer = async (fn, ok) => {
    try {
      const nuevo = await fn();
      if (nuevo && nuevo.id) setE(nuevo);
      if (ok) toast.success(typeof ok === "function" ? ok(nuevo) : ok);
      recargarAbogados?.();
      return nuevo;
    } catch (err) {
      toast.error(mensajeError(err));
      throw err;
    }
  };
  const intentar = (fn, ok) => hacer(fn, ok).catch(() => {});

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
        <p className="text-[14px] text-titulo dark:text-titulo-dark">{error}</p>
        <Link to="/legales" className="text-[14px] font-semibold text-sky-700 dark:text-sky-400">
          Volver
        </Link>
      </div>
    );
  }
  if (!e) {
    return (
      <div className="flex flex-col gap-3">
        <Cargando alto="h-20" />
        <Cargando alto="h-16" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Cargando alto="h-72" />
          <Cargando alto="h-72" />
        </div>
      </div>
    );
  }

  const sig = e.estados?.siguiente;
  const cerrado = e.estado === "CERRADO" || e.estado === "DESISTIDO";
  const dem = esDemorado(e);
  const docsCliente = (e.documentos || []).filter((d) => d.rol === "CLIENTE" && d.tipo === "PAPEL");
  const ultimoDelCliente = e.cliente_subio_papeles ? docsCliente[0] : null;

  // ── acciones ──
  const abrirEstado = (inicial = "") => {
    setEstadoInicial(inicial);
    setModal("estado");
  };
  const guardarEstado = async (body) => {
    const nuevo = await cambiarEstado(e.id, body);
    setE(nuevo);
    setModal(body.estado === "COBRADO" && nuevo.plata?.puede_cargar && !nuevo.plata?.honorarios ? "honorarios" : null);
    toast.success(`${e.numero} → ${(ESTADOS[body.estado]?.n || body.estado).toUpperCase()}`);
    recargarAbogados?.();
  };
  const guardarNovedad = async (datos, hecho = {}) => {
    const nuevo = await guardarNovedadEnPartes(e, datos, hecho, setE);
    const { estado } = datos;
    setModal(estado === "COBRADO" && nuevo.plata?.puede_cargar && !nuevo.plata?.honorarios ? "honorarios" : null);
    toast.success("Guardado");
  };
  const registrarAviso = (motivo, extra = {}) => {
    avisoWhatsapp(e.id, motivo, extra)
      .then((nuevo) => {
        if (nuevo?.id) setE(nuevo);
        toast.success("Anotado: se le mandó el WhatsApp");
      })
      .catch((err) => toast.error(mensajeError(err, "No se pudo anotar el aviso.")));
  };
  const copiarLink = async () => {
    const link = linkCaso(e);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      window.prompt("Copiá este link:", link);
    }
  };
  const subirPapel = async (file, papel = "") => {
    try {
      const arch = await subirArchivo(file, "legales/papeles");
      await hacer(() => guardarDocumento(e.id, { ...arch, tipo: "PAPEL", papel }), `Subido: ${arch.nombre}`);
    } catch (err) {
      if (!err?.response) toast.error(err?.message || "No se pudo subir el archivo.");
    }
  };
  const subirComprobante = async (file) => {
    try {
      const arch = await subirArchivo(file, "legales/comprobantes");
      await hacer(() => guardarDocumento(e.id, { ...arch, tipo: "COMISION" }), "Comprobante subido");
    } catch (err) {
      if (!err?.response) toast.error(err?.message || "No se pudo subir el archivo.");
    }
  };
  const borrarArchivo = (d) => {
    if (!window.confirm(`¿Borrar «${d.nombre}»? No se puede deshacer.`)) return;
    intentar(() => borrarDocumento(e.id, d.id), "Archivo borrado");
  };
  const cambiarTurno = (t, estado) => {
    const txt = { LLEGO: "llegó", ATENDIDO: "atendido", NO_VINO: "no vino", CANCELADO: "cancelado" }[estado];
    if (estado === "CANCELADO" && !window.confirm("¿Cancelar el turno? El horario queda libre para otro.")) return;
    intentar(async () => {
      await cambiarEstadoTurno(t.id, estado);
      return pedirCaso(e.id);
    }, `Turno: ${txt}`);
  };

  // ── piezas ──
  const cabecera = (
    <div className="flex flex-col gap-3">
      <nav className="flex items-center gap-2 text-[13px] text-suave dark:text-suave-dark">
        <button type="button" onClick={() => volverOIr(navigate)} className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400">
          <HiArrowLeft className="w-4 h-4" /> {esAbogado ? "Mis casos" : "Legales"}
        </button>
        <span>/</span>
        <span>{e.numero}</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1.5">
          <h1 className="text-[22px] sm:text-[26px] font-bold leading-tight text-titulo dark:text-titulo-dark">
            {e.motivo_titulo && celu ? e.persona_nombre : `${e.tema_nombre} · ${e.persona_nombre}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-suave dark:text-suave-dark">
            <EstadoPill estado={e.estado} desde={e.estado_desde} />
            {dem && <Demorado />}
            {celu && <span>{e.tema_nombre} · {e.numero}</span>}
          </div>
          {/* 🆕 05/10: lo que le puso el abogado desde su app (su estado propio, instancia y etiquetas). */}
          {(e.estado_propio && e.estado_propio.nombre !== e.estado_nombre) || e.instancia || (e.etiquetas || []).length ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-suave dark:text-suave-dark">
              <span>El abogado lo tiene en:</span>
              {e.estado_propio && e.estado_propio.nombre !== e.estado_nombre ? <Etiqueta o={e.estado_propio} punto /> : null}
              {e.instancia ? <Etiqueta o={e.instancia} /> : null}
              {(e.etiquetas || []).map((q) => (
                <Etiqueta key={q.id} o={q} />
              ))}
            </div>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-suave dark:text-suave-dark">
            {e.persona_dni && <span>DNI {e.persona_dni}</span>}
            {e.persona_telefono && <span>· {e.persona_telefono}</span>}
            <span className="inline-flex items-center gap-1">
              · <Punto color={colorOficina(e.oficina)} /> {e.propio ? "Caso propio del abogado" : `Oficina ${e.oficina_nombre || "—"}`}
            </span>
            {(e.cliente_polizas || []).length > 0 && (
              <span>
                · Cliente de THAMES:{" "}
                {staff && e.cliente ? (
                  <Link to={`/clientes/${e.cliente}`} className="font-semibold text-sky-700 dark:text-sky-400 underline">
                    {e.cliente_polizas[0]}
                  </Link>
                ) : (
                  <b>{e.cliente_polizas[0]}</b>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={copiarLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 py-2.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark"
          >
            <HiLink className="w-4 h-4" /> Copiar link del cliente
          </button>
          {esAbogado && !cerrado && (
            <button
              type="button"
              onClick={() => setModal("novedad")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-700/50 bg-card dark:bg-card-dark px-3.5 py-2.5 text-[14px] font-semibold text-sky-800 dark:text-sky-300"
            >
              <HiPencil className="w-4 h-4" /> Anotar novedad
            </button>
          )}
          {e.puede?.cambiar_estado && (
            <button
              type="button"
              onClick={() => abrirEstado("")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 py-2.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark"
            >
              Otro estado
            </button>
          )}
          {e.puede?.cambiar_estado && sig && (
            <button
              type="button"
              onClick={() => abrirEstado(sig)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 px-4 py-2.5 text-[14px] font-semibold text-white"
            >
              Pasar a {(ESTADOS[sig]?.n || sig).toUpperCase()} <HiArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const bannerCliente = ultimoDelCliente && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 px-4 py-3 text-[13px] text-sky-900 dark:text-sky-200">
      <span className="inline-flex items-center gap-2">
        <HiDocumentText className="w-4 h-4 shrink-0" />
        <span>
          {primerNombre(e.persona_nombre) || "El cliente"} subió un papel desde su link el {ddmm(ultimoDelCliente.fecha)}: <b>{ultimoDelCliente.nombre}</b>
        </span>
      </span>
      <a href={ultimoDelCliente.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-sky-300 dark:border-sky-500/40 bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-sky-800 dark:text-sky-300">
        Ver el papel
      </a>
    </div>
  );

  const bannerCerrado = cerrado && (
    <div className="rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-3 text-[13px] text-titulo dark:text-titulo-dark">
      Este caso está <b>{e.estado === "CERRADO" ? "cerrado" : "desistido"}</b>. Queda guardado con toda su historia.
      {e.puede?.cambiar_estado ? " Si hace falta, se puede volver a abrir con «Otro estado»." : ""}
    </div>
  );

  const papeles = (
    <Seccion titulo={<h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Papeles · fotos y PDF ({(e.documentos || []).filter((d) => d.tipo === "PAPEL").length})</h2>}>
      <ExpedienteDocumentosPanel
        e={e}
        celu={celu}
        onSubir={subirPapel}
        onBorrar={borrarArchivo}
        onPapeles={(lista) => intentar(() => editarCaso(e.id, { papeles: lista }), "Papeles actualizados")}
      />
    </Seccion>
  );

  const secDatos = (
    <SeccionDatos
      e={e}
      catalogo={catalogo}
      abogados={abogados}
      onAsignar={(abId) => intentar(() => asignarAbogado(e.id, abId), abId ? "Abogado asignado" : "Quedó sin abogado")}
      onEditar={() => setModal("datos")}
    />
  );
  const secFechas = (
    <SeccionFechas
      e={e}
      glosario={catalogo?.glosario}
      staff={staff}
      onAgregar={(body) => hacer(() => agregarFecha(e.id, body), "Fecha agregada")}
      onMarcar={(v, cumplido) => intentar(() => editarFecha(e.id, v.id, { cumplido }), cumplido ? "Marcada como hecha" : "Quedó pendiente")}
      onCambiar={(v) => setModal({ tipo: "fecha", v })}
      onBorrar={(v) => {
        if (window.confirm(`¿Borrar «${v.titulo}»?`)) intentar(() => borrarFecha(e.id, v.id), "Fecha borrada");
      }}
      onAvisado={(v) => registrarAviso("fecha", { fecha: v.id })}
    />
  );
  const secAbogado = (
    <SeccionAbogado e={e} catalogo={catalogo} esAbogado={esAbogado} miOficina={miOficina} onDarTurno={() => setModal("turno")} onTurnoEstado={cambiarTurno} />
  );
  const secAviso = staff ? <SeccionAvisoCliente e={e} onAvisado={registrarAviso} onCopiar={copiarLink} /> : null;
  const secBitacora = <SeccionBitacora e={e} compacta={celu} onAnotar={(body) => hacer(() => anotar(e.id, body), "Anotado")} />;
  const secPlata = e.ve_plata ? (
    <SeccionPlata
      e={e}
      onHonorarios={() => setModal("honorarios")}
      onCobrar={() => setModal("cobrar")}
      onDeshacer={() => {
        if (window.confirm("¿Deshacer el cobro? Se borra el ingreso de Balances y la comisión vuelve a quedar pendiente.")) {
          intentar(() => deshacerComision(e.id), "Cobro deshecho");
        }
      }}
      onSubirComprobante={subirComprobante}
      onBorrarDoc={borrarArchivo}
    />
  ) : null;

  const modales = (
    <>
      <ModalEstado e={e} catalogo={catalogo} abierto={modal === "estado"} inicial={estadoInicial} onCerrar={() => setModal(null)} onGuardar={guardarEstado} />
      <ModalNovedad e={e} abierto={modal === "novedad"} onCerrar={() => setModal(null)} onGuardar={guardarNovedad} />
      <ModalHonorarios
        e={e}
        abierto={modal === "honorarios"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body, pactado) => {
          let nuevo = await cargarHonorarios(e.id, body);
          if (pactado !== null && pactado !== undefined) nuevo = await editarCaso(e.id, { honorarios_pactados: pactado });
          setE(nuevo);
          setModal(null);
          toast.success("Honorarios guardados");
          recargarAbogados?.();
        }}
      />
      <ModalCobrar
        e={e}
        formas={catalogo?.formas_pago || []}
        abierto={modal === "cobrar"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await cobrarComision(e.id, body);
          setE(nuevo);
          setModal(null);
          toast.success("Comisión cobrada · entró a Balances");
          recargarAbogados?.();
        }}
      />
      <ModalTurno
        e={e}
        abogados={abogados}
        temas={catalogo?.temas || []}
        miOficina={miOficina}
        abierto={modal === "turno"}
        onCerrar={() => setModal(null)}
        onDar={async (body) => {
          const r = await darTurno({ expediente: e.id, ...body });
          setE(r.expediente);
          recargarAbogados?.();
          return r.expediente;
        }}
        onAvisado={(turnoId) => registrarAviso("turno", turnoId ? { turno: turnoId } : {})}
      />
      <ModalDatos
        e={e}
        temas={catalogo?.temas || []}
        abierto={modal === "datos"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await editarCaso(e.id, body);
          setE(nuevo);
          setModal(null);
          toast.success("Datos guardados");
        }}
      />
      <ModalCambiarFecha
        v={modal?.tipo === "fecha" ? modal.v : null}
        abierto={modal?.tipo === "fecha"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await editarFecha(e.id, modal.v.id, body);
          setE(nuevo);
          setModal(null);
          toast.success("Fecha cambiada");
        }}
      />
    </>
  );

  if (celu) {
    const textoLink = textoConLink(e.whatsapp_textos?.link || "", e);
    return (
      <div className="flex flex-col gap-3">
        {cabecera}
        <ComoVa e={e} staff={staff} />
        {bannerCerrado}
        {bannerCliente}
        {secAbogado}
        {secFechas}
        {esAbogado && <SeccionCliente e={e} />}
        {papeles}
        {secAviso}
        {secBitacora}
        {secDatos}
        {secPlata}
        <details className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
          <summary className="cursor-pointer text-[14px] font-semibold text-titulo dark:text-titulo-dark">Ver los 7 pasos</summary>
          <div className="mt-3">
            <PasosCaso pasos={e.pasos} vertical />
          </div>
        </details>
        {staff && !cerrado && (
          <div className="grid grid-cols-2 gap-2 border-t border-linea dark:border-linea-dark pt-3">
            <button
              type="button"
              onClick={() => setModal("turno")}
              disabled={!e.puede?.turno}
              className="min-h-[50px] rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[15px] font-bold text-titulo dark:text-titulo-dark disabled:opacity-50"
            >
              {e.proximo_turno ? "Otro turno" : "Pedir turno"}
            </button>
            <BotonWa href={linkWhatsAppOElegir(e.persona_telefono, textoLink)} onEnviado={() => registrarAviso("link")} size="lg">
              Mandarle el link
            </BotonWa>
          </div>
        )}
        {modales}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cabecera}
      <PasosCaso pasos={e.pasos} />
      {staff && (e.significa || e.vos) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {e.significa && (
            <p className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3 text-[14px] text-titulo dark:text-titulo-dark">
              <b className="text-indigo-800 dark:text-indigo-300">¿Qué significa?</b> {e.significa}
            </p>
          )}
          {e.vos && (
            <p className="rounded-xl bg-green-50 dark:bg-green-500/10 px-4 py-3 text-[14px] text-titulo dark:text-titulo-dark">
              <b className="text-green-800 dark:text-green-300">¿Qué hacés vos?</b> {e.vos}
            </p>
          )}
        </div>
      )}
      {bannerCerrado}
      {bannerCliente}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {secDatos}
          {secFechas}
          {papeles}
          {secPlata}
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          {secAbogado}
          {esAbogado && <SeccionCliente e={e} />}
          {secAviso}
          {secBitacora}
        </div>
      </div>
      {modales}
    </div>
  );
}
