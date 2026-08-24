// src/pages/PanelPortalPage.jsx
//
// 🛠️ PANEL DEL PORTAL — el espejo de lo que ve el cliente, con las
//    herramientas al lado.
//
// ── POR QUÉ EXISTE ────────────────────────────────────────────────────
// El cliente llama: "no me figura el pago". Hasta ahora había que abrir
// cuatro pantallas para resolverlo, y ninguna mostraba QUÉ está viendo él.
//
// Acá está todo junto:
//   · Ver su portal tal cual lo ve él (o copiarle el link)
//   · Marcar una cuota pagada / corregir la fecha
//   · Subir el recibo que mandó por WhatsApp
//   · Confirmar o rechazar el comprobante que subió desde el portal
//   · Cargar la imagen de un cupón que quedó sin recortar
//
// ── LO QUE NO HACE ────────────────────────────────────────────────────
// No reimplementa nada. Marcar pagada, cambiar fecha y confirmar
// comprobante llaman a los endpoints de siempre. Si mañana cambia la regla
// de pago, cambia en un solo lado y esta pantalla la hereda.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  HiArrowLeft, HiExternalLink, HiClipboardCopy, HiCheck, HiX,
  HiUpload, HiPhotograph, HiCalendar, HiExclamation, HiEye, HiRefresh,
} from "react-icons/hi";

import api from "../services/api";
import { uploadToCloudinary } from "../utils/cloudinary.js";

/* ═══════════════ helpers ═══════════════ */

const money = (n) =>
  Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const fecha = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

// Colores del estado de un cupón. El punto de la izquierda se lee de un
// vistazo: verde pagado, ámbar esperando revisión, gris pendiente.
const TONO_CUPON = {
  PAGADA: { punto: "bg-duo-verde", texto: "Pagada" },
  REPORTADO: { punto: "bg-duo-amarillo", texto: "Reportada por el cliente" },
  VENCIDA: { punto: "bg-duo-rojo", texto: "Vencida" },
  PENDIENTE: { punto: "bg-linea dark:bg-linea-dark", texto: "Pendiente" },
};

/* ═══════════════ componente ═══════════════ */

export default function PanelPortalPage() {
  const { clienteId } = useParams();

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(null); // id de la fila que está trabajando

  // Un input de archivo escondido, reusado para todo lo que se sube.
  // `destino` guarda qué se está subiendo y para qué cupón.
  const fileRef = useRef(null);
  const [destino, setDestino] = useState(null); // {tipo:"recibo"|"imagen", cuponId}

  // 🖼️ Input APARTE para la imagen del cupón: solo acepta fotos.
  //    El de arriba acepta PDF porque un recibo bien puede serlo. Pero la
  //    imagen del cupón la muestra el portal con <img>, y un <img> no dibuja
  //    un PDF: el cliente vería una imagen rota justo al ir a pagar.
  const imgCuponRef = useRef(null);
  const [cuponImagen, setCuponImagen] = useState(null); // id del cupón elegido

  // 🔄 Reprocesar el PDF. Input APARTE del de arriba: este solo acepta PDF y
  //    lleva la póliza a la que hay que aplicárselo. Mezclarlos en uno solo
  //    llevaba a subir el recibo de un cliente como si fuera su póliza.
  const pdfRef = useRef(null);
  const [polizaReproc, setPolizaReproc] = useState(null); // id de la póliza elegida
  const [reprocesando, setReprocesando] = useState(null); // id mientras trabaja

  // 📅 Modal de cambio de fecha. Es el MISMO de la pantalla de Pagos: mismo
  //    diseño, mismo checkbox de "ajustar las siguientes". Si el operador ya
  //    lo usó allá, acá no tiene que aprender nada nuevo.
  const [modalFecha, setModalFecha] = useState(null);  // la cuota elegida
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [ajustarSiguientes, setAjustarSiguientes] = useState(false);
  const [guardandoFecha, setGuardandoFecha] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get(`/polizas/panel-portal/${clienteId}/`);
      setData(res.data);
    } catch (e) {
      console.error("[panel-portal]", e);
      toast.error("No se pudo cargar el portal de este cliente.");
    } finally {
      setCargando(false);
    }
  }, [clienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  /* ---------- acciones ---------- */

  const copiarLink = () => {
    if (!data?.portal_url) return;
    navigator.clipboard?.writeText(data.portal_url);
    toast.success("Link copiado");
  };

  // 💵 Marcar una cuota como pagada. Usa el endpoint de SIEMPRE
  //    (cuotas/<id>/pagar/): ahí vive toda la lógica de balance e ingresos.
  const marcarPagada = async (cuota) => {
    if (cuota.pagado) return;
    setOcupado(`cuota-${cuota.id}`);
    try {
      await api.patch(`/cuotas/${cuota.id}/pagar/`, {
        fecha_pago: dayjs().format("YYYY-MM-DD"),
      });
      toast.success(`Cuota ${cuota.cuota_nro} marcada como pagada`);
      cargar();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo marcar la cuota.");
    } finally {
      setOcupado(null);
    }
  };

  const abrirModalFecha = (cuota) => {
    setModalFecha(cuota);
    setNuevaFecha(String(cuota.fecha_vencimiento || dayjs().format("YYYY-MM-DD")).slice(0, 10));
    // Por defecto NO arrastra las siguientes: acá casi siempre se corrige UNA
    // cuota mal cargada, no se corre todo el plan de pago.
    setAjustarSiguientes(false);
  };

  const cerrarModalFecha = () => {
    if (guardandoFecha) return;
    setModalFecha(null);
  };

  const guardarFecha = async () => {
    if (!modalFecha || !nuevaFecha) return;
    setGuardandoFecha(true);
    try {
      const res = await api.patch(`/cuotas/${modalFecha.id}/cambiar-fecha/`, {
        nueva_fecha: nuevaFecha,
        ajustar_siguientes: ajustarSiguientes,
      });
      toast.success(`Listo. ${res?.data?.cuotas_modificadas || 1} cuota(s) actualizada(s).`);
      setModalFecha(null);
      cargar();
    } catch (e) {
      toast.error(
        e?.response?.data?.nueva_fecha || e?.response?.data?.detail || "No se pudo cambiar la fecha."
      );
    } finally {
      setGuardandoFecha(false);
    }
  };

  // ✅ Confirmar / rechazar el comprobante que subió el CLIENTE desde el
  //    portal. Mismo endpoint que usa Tareas del Día.
  const resolverComprobante = async (cupon, aprobado) => {
    setOcupado(`cupon-${cupon.id}`);
    try {
      await api.post("/tareas/confirmar-comprobante/", {
        cupon_id: cupon.id,
        aprobado,
      });
      toast.success(aprobado ? "Pago confirmado" : "Comprobante rechazado");
      cargar();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo registrar.");
    } finally {
      setOcupado(null);
    }
  };

  // 📲 Subir el recibo que llegó por WhatsApp. Acepta foto o PDF: el cliente
  //    manda lo que tiene a mano y esto no lo ve nadie más que la oficina.
  const pedirArchivo = (tipo, cuponId) => {
    setDestino({ tipo, cuponId });
    fileRef.current?.click();
  };

  // 🖼️ Elegir la imagen de un cupón (cargar la que falta o cambiar la que
  //    quedó mal recortada).
  const pedirImagenCupon = (cuponId) => {
    setCuponImagen(cuponId);
    imgCuponRef.current?.click();
  };

  const subirImagenCupon = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const cuponId = cuponImagen;
    setCuponImagen(null);
    if (!file || !cuponId) return;

    // Freno temprano: avisar ACÁ es mucho más claro que dejar que suba a
    // Cloudinary y que después el backend lo rebote.
    if (!String(file.type || "").startsWith("image/")) {
      toast.error("Tiene que ser una foto (jpg o png). Un PDF no se ve en el portal.");
      return;
    }

    setOcupado(`cupon-${cuponId}`);
    try {
      const up = await uploadToCloudinary(file, "polizas/cupones");
      const res = await api.post("/polizas/panel-portal/imagen-cupon/", {
        cupon_id: cuponId,
        url: up.secure_url,
        public_id: up.public_id,
      });
      toast.success(res?.data?.detail || "Imagen del cupón guardada.");
      cargar();
    } catch (err) {
      console.error("[panel-portal] imagen cupón:", err);
      toast.error(err?.response?.data?.detail || "No se pudo subir la imagen.");
    } finally {
      setOcupado(null);
    }
  };

  const subirArchivo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !destino) return;

    // Este input quedó SOLO para recibos. La imagen del cupón tiene el suyo
    // (`subirImagenCupon`), porque son cosas distintas: una la ve la oficina,
    // la otra la ve el cliente en pantalla.
    const { cuponId } = destino;
    setDestino(null);
    setOcupado(`cupon-${cuponId}`);
    try {
      const up = await uploadToCloudinary(file, "comprobantes");
      await api.post("/polizas/panel-portal/subir-recibo/", {
        cupon_id: cuponId,
        url: up.secure_url,
        public_id: up.public_id,
      });
      toast.success("Recibo guardado y pago confirmado");
      cargar();
    } catch (err) {
      console.error("[panel-portal] subir:", err);
      toast.error("No se pudo subir el archivo.");
    } finally {
      setOcupado(null);
    }
  };

  /* ---------- 🔄 reprocesar el PDF ---------- */

  const pedirPdf = (polizaId) => {
    setPolizaReproc(polizaId);
    pdfRef.current?.click();
  };

  // Dos pasos, a propósito:
  //   1. El PDF va al LECTOR de siempre (`/polizas/lector-pdf/`), que ya sabe
  //      leerlo, recortar los cupones y subirlos a Cloudinary.
  //   2. El resultado se manda al panel, que lo aplica a la póliza.
  //
  // Así el panel no reimplementa nada: el día que cambie el formato de una
  // compañía se toca el lector y esta pantalla se entera sola.
  const reprocesarPdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const polizaId = polizaReproc;
    setPolizaReproc(null);
    if (!file || !polizaId) return;

    setReprocesando(polizaId);
    const aviso = toast.loading("Leyendo el PDF y recortando los cupones…");
    try {
      const fd = new FormData();
      fd.append("archivos", file);
      const lectura = await api.post("/polizas/lector-pdf/", fd);
      if (!lectura?.data?.ok) throw new Error("El lector no pudo con el archivo.");

      const res = await api.post("/polizas/panel-portal/reprocesar/", {
        poliza_id: polizaId,
        datos: lectura.data.datos || {},
      });

      // Resumen en una línea: solo lo que efectivamente cambió.
      const r = res?.data?.resumen || {};
      const partes = [];
      const suma = (a, b) => (r[a] || 0) + (r[b] || 0);
      if (suma("cuotas_actualizadas", "cuotas_creadas"))
        partes.push(`${suma("cuotas_actualizadas", "cuotas_creadas")} cuota(s)`);
      if (r.cuotas_borradas) partes.push(`${r.cuotas_borradas} cuota(s) de más borrada(s)`);
      if (suma("cupones_actualizados", "cupones_creados"))
        partes.push(`${suma("cupones_actualizados", "cupones_creados")} cupón(es)`);
      if (r.imagenes) partes.push(`${r.imagenes} imagen(es)`);
      if (r.intocables) partes.push(`${r.intocables} pagado(s) sin tocar`);

      toast.success(partes.length ? `Listo: ${partes.join(" · ")}` : "El PDF ya coincidía. Nada que cambiar.", { id: aviso });
      cargar();
    } catch (err) {
      console.error("[panel-portal] reprocesar:", err);
      toast.error(
        err?.response?.data?.detail || "No se pudo reprocesar el PDF.",
        { id: aviso }
      );
    } finally {
      setReprocesando(null);
    }
  };

  /* ---------- render ---------- */

  const cli = data?.cliente;
  const polizas = useMemo(() => data?.polizas || [], [data]);

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark px-4 py-6 sm:px-6 lg:px-8">
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={subirArchivo} />
      {/* 🖼️ Solo fotos: el portal muestra esto con <img>. */}
      <input ref={imgCuponRef} type="file" accept="image/*" className="hidden" onChange={subirImagenCupon} />
      {/* 🔄 Solo PDF: es la póliza completa que manda la compañía. */}
      <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={reprocesarPdf} />

      <div className="max-w-3xl mx-auto">

        {/* ── Cabecera ── */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            to={`/clientes/${clienteId}`}
            className="w-10 h-10 shrink-0 rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark inline-flex items-center justify-center"
            aria-label="Volver al cliente"
          >
            <HiArrowLeft className="w-5 h-5 text-titulo dark:text-titulo-dark" />
          </Link>
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-wide text-suave dark:text-suave-dark">
              Portal del asegurado
            </div>
            <div className="text-lg font-black truncate text-titulo dark:text-titulo-dark">
              {cargando ? "Cargando…" : (cli?.nombre_completo || "—")}
            </div>
          </div>
          <button
            onClick={cargar}
            aria-label="Actualizar"
            className="cursor-pointer ml-auto shrink-0 w-10 h-10 rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark inline-flex items-center justify-center text-suave dark:text-suave-dark"
          >
            <HiRefresh className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Acceso al portal ──
            🔑 "Ver como el cliente" abre el MISMO link que le llegó por
               WhatsApp. Es la forma más rápida de entender un reclamo:
               en vez de imaginarte qué ve, lo ves. */}
        {data ? (
          <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 mb-4">
            {data.portal_activo ? (
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={data.portal_url}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer flex-1 min-w-[150px] h-11 rounded-2xl bg-duo-azul text-white shadow-[0_3px_0_var(--color-duo-azul-sombra)] active:translate-y-0.5 inline-flex items-center justify-center gap-1.5 text-sm font-black transition-all"
                >
                  <HiEye className="w-4 h-4" /> Ver como el cliente
                </a>
                <button
                  onClick={copiarLink}
                  className="cursor-pointer h-11 px-4 rounded-2xl border-2 border-linea dark:border-linea-dark inline-flex items-center justify-center gap-1.5 text-sm font-black text-titulo dark:text-titulo-dark"
                >
                  <HiClipboardCopy className="w-4 h-4" /> Copiar link
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-suave dark:text-suave-dark">
                <HiExclamation className="w-5 h-5 shrink-0 text-duo-amarillo" />
                <span>
                  Este cliente todavía no tiene portal. Se le crea cuando se le manda
                  la bienvenida.
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* ── Pólizas ── */}
        {!cargando && !polizas.length ? (
          <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-6 py-12 text-center">
            <div className="text-base font-black text-titulo dark:text-titulo-dark">Sin pólizas activas</div>
            <div className="mt-1 text-sm text-suave dark:text-suave-dark">
              El cliente no tiene nada para ver en el portal.
            </div>
          </div>
        ) : null}

        {polizas.map((p) => (
          <div key={p.id} className="mb-5">

            {/* Encabezado de la póliza */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[15px] font-black text-titulo dark:text-titulo-dark">
                {[p.marca, p.modelo].filter(Boolean).join(" ") || "Vehículo"}
              </span>
              {p.patente ? (
                <span className="rounded-md bg-duo-azul/15 text-duo-azul px-1.5 py-0.5 text-[11px] font-mono font-bold">
                  {p.patente}
                </span>
              ) : null}
              <span className="text-xs font-bold text-suave dark:text-suave-dark">
                {p.compania} · {p.cobertura}
              </span>

              {/* 🔄 La salida cuando la póliza entró mal. Vuelve a leer el PDF
                     y acomoda fechas, montos e imágenes. Lo pagado no se toca. */}
              <button
                onClick={() => pedirPdf(p.id)}
                disabled={reprocesando === p.id}
                title="Volver a subir el PDF de la compañía y acomodar cuotas y cupones"
                className="cursor-pointer text-xs font-black px-3 py-1.5 rounded-xl border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark inline-flex items-center gap-1 disabled:opacity-50"
              >
                <HiRefresh className={`w-3.5 h-3.5 ${reprocesando === p.id ? "animate-spin" : ""}`} />
                {reprocesando === p.id ? "Procesando…" : "Reprocesar PDF"}
              </button>

              <Link
                to={`/polizas/${p.id}`}
                className="ml-auto text-xs font-black text-duo-azul inline-flex items-center gap-1"
              >
                Abrir póliza <HiExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* ⚠️ Lo que está mal o falta.
                Es la lista de "por qué te va a llamar este cliente". */}
            {p.problemas?.length ? (
              <div className="rounded-2xl border-2 border-duo-amarillo bg-duo-amarillo/10 px-4 py-3 mb-2">
                {p.problemas.map((x, i) => (
                  <div key={i} className="flex items-start gap-2 text-[13px] font-bold text-titulo dark:text-titulo-dark py-0.5">
                    <HiExclamation className="w-4 h-4 shrink-0 mt-0.5 text-duo-amarillo" />
                    <span>{x}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* ── Cupones (lo que el cliente paga) ── */}
            {p.cupones?.length ? (
              <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden mb-2">
                {p.cupones.map((c, i) => {
                  const tono = TONO_CUPON[c.estado] || TONO_CUPON.PENDIENTE;
                  const trabajando = ocupado === `cupon-${c.id}`;
                  return (
                    <div
                      key={c.id}
                      className={`px-4 py-3 flex items-center gap-3 flex-wrap ${i ? "border-t-2 border-linea dark:border-linea-dark" : ""}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tono.punto}`} />

                      {/* 🖼️ MINIATURA DEL RECORTE.
                          Es lo que el cliente le muestra al cajero. Verlo acá
                          evita el ida y vuelta de abrir el portal para revisar
                          si quedó bien cortado. Se abre en grande al tocarla. */}
                      {c.imagen_url ? (
                        <a
                          href={c.imagen_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Ver el cupón en grande"
                          className="cursor-pointer shrink-0 w-16 h-10 rounded-lg overflow-hidden border-2 border-linea dark:border-linea-dark bg-white"
                        >
                          <img
                            src={c.imagen_url}
                            alt="Cupón"
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ) : null}

                      <span className="flex-1 min-w-[110px]">
                        <span className="block text-sm font-black text-titulo dark:text-titulo-dark">
                          Vence {fecha(c.fecha_vencimiento)}
                        </span>
                        <span className="block text-xs font-bold text-suave dark:text-suave-dark">
                          {tono.texto}
                          {c.monto ? ` · ${money(c.monto)}` : ""}
                          {c.imagen_url ? "" : " · sin imagen"}
                        </span>
                      </span>

                      {c.comprobante_url ? (
                        <a
                          href={c.comprobante_url}
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer text-xs font-black px-3 py-1.5 rounded-xl border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark"
                        >
                          Ver recibo
                        </a>
                      ) : null}

                      {/* El cliente subió algo y espera respuesta */}
                      {c.estado === "REPORTADO" ? (
                        <>
                          <button
                            onClick={() => resolverComprobante(c, false)}
                            disabled={trabajando}
                            aria-label="Rechazar comprobante"
                            className="cursor-pointer w-9 h-9 rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark inline-flex items-center justify-center disabled:opacity-50"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => resolverComprobante(c, true)}
                            disabled={trabajando}
                            aria-label="Confirmar pago"
                            className="cursor-pointer w-9 h-9 rounded-xl bg-duo-verde text-white shadow-[0_3px_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 inline-flex items-center justify-center disabled:opacity-50"
                          >
                            <HiCheck className="w-5 h-5" />
                          </button>
                        </>
                      ) : null}

                      {/* 📲 El caso más común: el recibo llegó por WhatsApp */}
                      {c.estado !== "PAGADA" && c.estado !== "REPORTADO" ? (
                        <button
                          onClick={() => pedirArchivo("recibo", c.id)}
                          disabled={trabajando}
                          className="cursor-pointer text-xs font-black px-3 py-1.5 rounded-xl border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <HiUpload className="w-3.5 h-3.5" /> Subir recibo
                        </button>
                      ) : null}

                      {/* 🖼️ Cargar la imagen que falta o CAMBIAR la que quedó
                          mal recortada. Antes el botón desaparecía apenas
                          había una imagen, así que un recorte torcido no había
                          forma de arreglarlo desde acá. */}
                      <button
                        onClick={() => pedirImagenCupon(c.id)}
                        disabled={trabajando}
                        title={c.imagen_url
                          ? "Cambiar la foto del cupón"
                          : "Cargar la foto del cupón"}
                        className={`cursor-pointer h-9 rounded-xl border-2 border-linea dark:border-linea-dark inline-flex items-center justify-center gap-1 disabled:opacity-50 ${
                          c.imagen_url
                            ? "w-9 text-suave dark:text-suave-dark"
                            : "px-3 text-xs font-black text-titulo dark:text-titulo-dark"
                        }`}
                      >
                        <HiPhotograph className="w-4 h-4" />
                        {c.imagen_url ? null : "Foto"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* ── Cuotas (lo que el sistema cobra) ── */}
            {p.cuotas?.length ? (
              <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden">
                {p.cuotas.map((c, i) => {
                  const trabajando = ocupado === `cuota-${c.id}`;
                  return (
                    <div
                      key={c.id}
                      className={`px-4 py-3 flex items-center gap-3 flex-wrap ${i ? "border-t-2 border-linea dark:border-linea-dark" : ""}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.pagado ? "bg-duo-verde" : "bg-linea dark:bg-linea-dark"}`} />
                      <span className="flex-1 min-w-[110px]">
                        <span className="block text-sm font-black text-titulo dark:text-titulo-dark">
                          Cuota {c.cuota_nro} · {fecha(c.fecha_vencimiento)}
                        </span>
                        <span className="block text-xs font-bold text-suave dark:text-suave-dark">
                          {c.pagado ? `Pagada ${fecha(c.fecha_pago)}` : "Pendiente"}
                          {c.monto ? ` · ${money(c.monto)}` : ""}
                        </span>
                      </span>

                      <button
                        onClick={() => abrirModalFecha(c)}
                        disabled={trabajando}
                        aria-label="Cambiar fecha"
                        className="cursor-pointer w-9 h-9 rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark inline-flex items-center justify-center disabled:opacity-50"
                      >
                        <HiCalendar className="w-4 h-4" />
                      </button>

                      {!c.pagado ? (
                        <button
                          onClick={() => marcarPagada(c)}
                          disabled={trabajando}
                          className="cursor-pointer text-xs font-black px-3 py-1.5 rounded-xl bg-duo-verde text-white shadow-[0_3px_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 disabled:opacity-50"
                        >
                          Marcar pagada
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

          </div>
        ))}

      </div>

      {/* 📅 MODAL DE CAMBIAR VENCIMIENTO (el mismo de la pantalla de Pagos) */}
      <AnimatePresence>
        {modalFecha ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center px-3"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={guardandoFecha ? undefined : cerrarModalFecha}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[71] w-full max-w-sm rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-5 py-5 sm:px-6 sm:py-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-black text-titulo dark:text-titulo-dark">
                  Cambiar vencimiento
                </h3>
                <button
                  onClick={cerrarModalFecha}
                  disabled={guardandoFecha}
                  aria-label="Cerrar"
                  className="cursor-pointer h-8 w-8 rounded-xl border-2 flex items-center justify-center text-titulo dark:text-titulo-dark bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-titulo dark:text-titulo-dark">
                  Cuota <span className="font-black text-duo-verde">#{modalFecha.cuota_nro}</span>
                </p>

                <div>
                  <label className="block text-sm font-black text-suave dark:text-suave-dark mb-1">
                    Nueva fecha
                  </label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark font-bold outline-none focus:border-duo-azul dark:[color-scheme:dark]"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer mt-2 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-3 rounded-xl border-2 border-duo-azul/30">
                  <input
                    type="checkbox"
                    checked={ajustarSiguientes}
                    onChange={(e) => setAjustarSiguientes(e.target.checked)}
                    className="mt-1 accent-duo-azul w-4 h-4"
                  />
                  <span className="text-sm font-bold text-titulo dark:text-titulo-dark">
                    Ajustar también los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).
                  </span>
                </label>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={cerrarModalFecha}
                    disabled={guardandoFecha}
                    className="cursor-pointer h-11 px-4 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-sm text-titulo dark:text-titulo-dark font-black"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarFecha}
                    disabled={guardandoFecha || !nuevaFecha}
                    className="cursor-pointer h-11 px-4 rounded-xl bg-duo-azul text-sm font-black text-white flex items-center gap-2 shadow-[0_4px_0_var(--color-duo-azul-sombra)] active:shadow-[0_0_0_var(--color-duo-azul-sombra)] active:translate-y-0.5 disabled:opacity-50"
                  >
                    {guardandoFecha ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}