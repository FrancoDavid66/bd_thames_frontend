// src/components/renovaciones/RenovacionConPdfModal.jsx
//
// 🎟️ RENOVAR CON LA PÓLIZA NUEVA — wizard de 4 pasos.
//
// ── POR QUÉ ESTE MODAL Y NO EL DE SIEMPRE ─────────────────────────────
// El modal normal (RenovacionModal) copia los datos de la póliza vieja y
// arma cuotas de $0 con fechas calculadas. Para NRE está bien: sus cuotas
// son regulares y el sistema las sabe calcular.
//
// Para AMCA y La Equidad NO alcanza. Sus cuotas tienen fechas e importes
// irregulares que solo están en el papel, y sus cupones traen código de
// barras e imagen recortada. Renovando "a ciegas" el portal del cliente
// queda con cuotas en cero, sin cupones para pagar y sin el "qué cubre".
//
// Es como mudar a alguien copiando los muebles pero olvidando la heladera,
// la luz y las llaves.
//
// ── LOS 4 PASOS ────────────────────────────────────────────────────────
//   1. El PDF          → se sube y el lector saca todo
//   2. Cliente y auto  → lo que leyó, EDITABLE (el lector se puede equivocar)
//   3. Cuotas y cupones→ fechas, importes y las imágenes recortadas
//   4. Lo que ve el cliente → qué cubre, la letra chica, la grúa
//
// Revisar antes de crear evita el trabajo peor: descubrir el error cuando
// el cliente ya está en la caja de Rapipago.
//
// ── QUÉ NO FRENA ──────────────────────────────────────────────────────
// Si un cupón quedó sin imagen recortada, AVISA pero deja seguir. Mejor
// tener la póliza cargada y la imagen después, que no poder renovar.

import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  HiTicket, HiUpload, HiExclamation, HiCheckCircle, HiPhotograph,
  HiArrowLeft, HiArrowRight, HiDocumentText, HiShieldCheck,
} from "react-icons/hi";
import toast from "react-hot-toast";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import InputDuo from "../ui/InputDuo";
import LoaderPantalla from "../ui/LoaderPantalla";
import api from "../../services/api";
import { uploadToCloudinary } from "../../utils/cloudinary.js";
import { cx, fmtMoney, getCompania } from "./utils";

const PASOS = ["El PDF", "Cliente y auto", "Cuotas y cupones", "Lo que ve el cliente"];

// Lo que el loader va contando mientras el backend trabaja. No están medidos
// contra el proceso real: son la secuencia honesta de lo que pasa.
const PASOS_LECTOR = [
  "Leyendo el PDF",
  "Buscando la hoja de cupones",
  "Recortando cada cupón",
  "Subiendo las imágenes",
  "Armando los datos",
];

const fmtFecha = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

/* ═══════════ Piezas chicas ═══════════ */

function Barra({ paso }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {PASOS.map((p, i) => (
        <div key={p} className="flex-1">
          <div
            className={cx(
              "h-2 rounded-full transition-colors",
              i < paso ? "bg-duo-verde" : i === paso ? "bg-duo-violeta" : "bg-linea dark:bg-linea-dark"
            )}
          />
          <div
            className={cx(
              "mt-1.5 text-[10px] font-black uppercase tracking-wide truncate",
              i === paso ? "text-duo-violeta" : "text-suave dark:text-suave-dark"
            )}
          >
            {p}
          </div>
        </div>
      ))}
    </div>
  );
}

function Dato({ label, valor, alerta = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-linea dark:border-linea-dark last:border-0">
      <span className="text-[12px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark shrink-0">
        {label}
      </span>
      <span
        className={cx(
          "text-sm font-black text-right min-w-0",
          alerta ? "text-duo-amarillo-sombra dark:text-duo-amarillo" : "text-titulo dark:text-titulo-dark"
        )}
      >
        {valor}
      </span>
    </div>
  );
}

function Aviso({ tono = "amarillo", children }) {
  const c =
    tono === "verde"
      ? "border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
      : "border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo";
  return (
    <div className={cx("flex items-start gap-2.5 rounded-2xl border-2 p-3", c)}>
      {tono === "verde" ? (
        <HiCheckCircle className="mt-0.5 shrink-0 text-lg" />
      ) : (
        <HiExclamation className="mt-0.5 shrink-0 text-lg" />
      )}
      <div className="text-[12.5px] font-bold leading-relaxed">{children}</div>
    </div>
  );
}

/* ═══════════ Componente principal ═══════════ */

export default function RenovacionConPdfModal({
  open,
  item,
  onClose,
  onSubmit,       // (payload) => void  — lo dispara el paso 4
  submitting = false,
}) {
  const [paso, setPaso] = useState(0);
  const [leyendo, setLeyendo] = useState(false);
  const [datos, setDatos] = useState(null);   // lo que devolvió el lector
  const [avisos, setAvisos] = useState([]);
  const [pdf, setPdf] = useState(null);       // {url, public_id, nombre}
  const [form, setForm] = useState({});       // campos editables del paso 2
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPaso(0);
    setDatos(null);
    setAvisos([]);
    setPdf(null);
    setForm({});
  }, [open]);

  const cia = getCompania(item);

  /* ---------- Leer el PDF ---------- */
  const leerPdf = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLeyendo(true);
    try {
      const fd = new FormData();
      fd.append("archivos", file);
      const res = await api.post("/polizas/lector-pdf/", fd);
      if (!res?.data?.ok) throw new Error("El lector no pudo procesar el archivo.");

      const d = res.data.datos || {};
      setDatos(d);
      setAvisos(res.data.avisos || []);

      const veh = d.vehiculo || {};
      const pol = d.poliza || {};
      setForm({
        marca: veh.marca || "",
        modelo: veh.modelo || "",
        anio: veh.anio || "",
        patente: veh.patente || item?.patente || "",
        tipo: veh.tipo || item?.tipo || "",
        numero_poliza: pol.numero || "",
        cobertura: pol.cobertura || "",
        compania: pol.compania || cia || "",
      });

      // 📎 El PDF se guarda como documento de la póliza nueva. Sin esto, el
      //    cliente no puede ver su cuponera completa en el portal.
      try {
        const up = await uploadToCloudinary(file, "polizas/renovaciones");
        setPdf({ url: up.secure_url, public_id: up.public_id, nombre: file.name, mime: up.mime });
      } catch {
        toast("Los datos se leyeron, pero no se pudo guardar el PDF. Subilo después.", { icon: "📎" });
      }

      setPaso(1);
    } catch (err) {
      console.error("[renovacion-pdf]", err);
      toast.error("No se pudo leer el PDF. Revisá que sea el archivo correcto.");
    } finally {
      setLeyendo(false);
    }
  }, [cia, item]);

  /* ---------- Datos derivados ---------- */
  const cupones = datos?.cupones || [];
  const extra = datos?.datos_extra || {};
  const cobertura = extra.cobertura || {};
  const asistencia = extra.asistencia || null;
  const sinImagen = cupones.filter((c) => !c.imagen_url).length;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const confirmar = () => {
    onSubmit?.({
      // Lo que el backend necesita para armar la póliza nueva COMPLETA.
      nuevaCompania: form.compania || undefined,
      nuevoNumero: form.numero_poliza || undefined,
      cobertura: form.cobertura || undefined,
      tipo: form.tipo || undefined,
      marca: form.marca || undefined,
      modelo: form.modelo || undefined,
      anio: form.anio || undefined,
      nuevaFecha: datos?.poliza?.vigencia_desde || undefined,
      // 🎟️ Las cuotas EXACTAS del papel, con su imagen y su código de barras.
      cupones: cupones.map((c) => ({
        numero: c.numero,
        vencimiento: c.vencimiento,
        importe: c.importe,
        imagen_url: c.imagen_url || "",
        codigo_barras: c.codigo_barras || "",
      })),
      // 📦 Qué cubre, la letra chica, la grúa, la clave de pago.
      datos_extra: extra,
      documento_pdf: pdf || undefined,
    });
  };

  /* ---------- Footer según el paso ---------- */
  const footer = (
    <>
      {paso > 0 ? (
        <Boton3D variant="blanco" onClick={() => setPaso((p) => p - 1)} disabled={submitting}>
          <HiArrowLeft /> Atrás
        </Boton3D>
      ) : (
        <Boton3D variant="blanco" onClick={onClose} disabled={submitting}>
          Cancelar
        </Boton3D>
      )}

      {paso === 0 ? null : paso < 3 ? (
        <Boton3D variant="violeta" onClick={() => setPaso((p) => p + 1)}>
          Siguiente <HiArrowRight />
        </Boton3D>
      ) : (
        <Boton3D variant="verde" onClick={confirmar} disabled={submitting}>
          {submitting ? "Creando…" : "Crear renovación"}
        </Boton3D>
      )}
    </>
  );

  const subtitle = item?.patente
    ? `${item.patente} · ${cia}${item?.cliente ? ` · ${item.cliente.apellido}, ${item.cliente.nombre}` : ""}`
    : cia;

  return (
    <>
      <LoaderPantalla
        visible={leyendo}
        titulo="Leyendo la póliza"
        pasos={PASOS_LECTOR}
        tono="violeta"
      />

      <ModalDuo
        isOpen={open}
        onClose={submitting || leyendo ? () => {} : onClose}
        title="Renovar con la póliza nueva"
        subtitle={subtitle}
        icon={<HiTicket />}
        iconTono="violeta"
        size="md"
        footer={footer}
      >
        <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={leerPdf} />
        <Barra paso={paso} />

        {/* ═══ PASO 1 — El PDF ═══ */}
        {paso === 0 && (
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-3xl border-[3px] border-dashed border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] p-8 text-center transition-all hover:brightness-105 cursor-pointer"
            >
              <HiDocumentText className="mx-auto text-5xl text-duo-violeta" />
              <div className="mt-2 text-[15px] font-black text-duo-violeta flex items-center justify-center gap-2">
                <HiUpload /> Subir la póliza nueva
              </div>
              <div className="mt-1 text-[12px] font-bold text-suave dark:text-suave-dark">
                {String(cia).toUpperCase().includes("EQUIDAD")
                  ? "La póliza completa de La Equidad (el PDF largo)"
                  : "La propuesta completa de AMCA (la que trae los cupones)"}
              </div>
            </button>

            <Aviso>
              <strong className="block text-[13px] font-black mb-0.5">
                Esta compañía no se renueva sola
              </strong>
              Las fechas, los importes y los cupones con su código de barras
              solo están en el papel. Sin el PDF, el cliente vería cuotas en cero
              y no podría pagar desde el portal.
            </Aviso>
          </div>
        )}

        {/* ═══ PASO 2 — Cliente y auto ═══ */}
        {paso === 1 && (
          <div className="grid gap-4">
            <Aviso tono="verde">
              Datos leídos del PDF. Revisalos: si el lector se equivocó en algo,
              corregilo acá antes de crear la póliza.
            </Aviso>

            <div className="grid gap-3 sm:grid-cols-2">
              <InputDuo label="Marca" value={form.marca} onChange={set("marca")} />
              <InputDuo label="Modelo" value={form.modelo} onChange={set("modelo")} />
              <InputDuo label="Año" value={form.anio} onChange={set("anio")} />
              <InputDuo label="Patente" value={form.patente} onChange={set("patente")} />
              <InputDuo label="Tipo" value={form.tipo} onChange={set("tipo")} placeholder="Auto / Camioneta…" />
              <InputDuo label="Cobertura" value={form.cobertura} onChange={set("cobertura")} placeholder="C7 / CLM…" />
              <InputDuo label="N° de póliza" value={form.numero_poliza} onChange={set("numero_poliza")} />
              <InputDuo label="Compañía" value={form.compania} onChange={set("compania")} />
            </div>

            <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-2">
              <Dato label="Vigencia" valor={`${fmtFecha(datos?.poliza?.vigencia_desde)} — ${fmtFecha(datos?.poliza?.vigencia_hasta)}`} />
              <Dato label="Asegurado" valor={datos?.cliente?.nombre || "—"} />
              <Dato label="Motor" valor={datos?.vehiculo?.motor || "—"} />
              <Dato label="Chasis" valor={datos?.vehiculo?.chasis || "—"} />
            </div>

            {avisos.length ? (
              <Aviso>
                {avisos.map((a, i) => (
                  <div key={i}>{a}</div>
                ))}
              </Aviso>
            ) : null}
          </div>
        )}

        {/* ═══ PASO 3 — Cuotas y cupones ═══ */}
        {paso === 2 && (
          <div className="grid gap-4">
            {cupones.length ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
                    {cupones.length} {cupones.length === 1 ? "cuota" : "cuotas"}
                  </span>
                  <span className="text-[12px] font-black text-duo-violeta">
                    {cupones.length - sinImagen} con imagen
                  </span>
                </div>

                <div className="grid gap-3">
                  {cupones.map((c, i) => (
                    <div
                      key={c.numero ?? i}
                      className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="h-9 w-9 rounded-xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta flex items-center justify-center text-sm font-black shrink-0">
                          {c.numero ?? i + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-black text-titulo dark:text-titulo-dark">
                            Vence {fmtFecha(c.vencimiento)}
                          </span>
                          <span className="block text-[11px] font-bold text-suave dark:text-suave-dark truncate">
                            {c.codigo_barras ? `Código ${c.codigo_barras.slice(0, 12)}…` : "Sin código de barras"}
                          </span>
                        </span>
                        <span className="text-sm font-black text-titulo dark:text-titulo-dark shrink-0">
                          {fmtMoney(c.importe) || "$0"}
                        </span>
                      </div>

                      {/* 🖼️ La imagen recortada: es lo que el cliente le muestra
                             al cajero. Verla acá evita descubrir que falta
                             cuando ya está en la caja. */}
                      {c.imagen_url ? (
                        <div className="border-t-2 border-linea dark:border-linea-dark bg-white p-2">
                          <img
                            src={c.imagen_url}
                            alt={`Cupón ${c.numero ?? i + 1}`}
                            className="w-full rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="border-t-2 border-linea dark:border-linea-dark px-4 py-2.5 flex items-center gap-2 text-[12px] font-bold text-duo-amarillo-sombra dark:text-duo-amarillo">
                          <HiPhotograph className="shrink-0" />
                          Sin imagen recortada. Se puede cargar después desde el panel del portal.
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {sinImagen ? (
                  <Aviso>
                    {sinImagen === cupones.length
                      ? "Ningún cupón se pudo recortar. La póliza se crea igual, pero el cliente va a ver el PDF entero en la caja."
                      : `${sinImagen} de ${cupones.length} cupones quedaron sin imagen. No frena la renovación.`}
                  </Aviso>
                ) : (
                  <Aviso tono="verde">
                    Todos los cupones se recortaron. El cliente va a ver uno por
                    uno en su portal.
                  </Aviso>
                )}
              </>
            ) : (
              <Aviso>
                <strong className="block text-[13px] font-black mb-0.5">
                  El PDF no trajo cupones
                </strong>
                Casi seguro es el archivo equivocado. Volvé atrás y subí la
                propuesta / póliza completa, la que tiene la hoja de Rapipago.
              </Aviso>
            )}
          </div>
        )}

        {/* ═══ PASO 4 — Lo que ve el cliente ═══ */}
        {paso === 3 && (
          <div className="grid gap-4">
            <div className="rounded-2xl border-2 border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] p-4">
              <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wide text-duo-violeta mb-2">
                <HiShieldCheck /> Qué cubre
              </div>
              {(cobertura.que_cubre || []).length ? (
                <div className="grid gap-1.5">
                  {cobertura.que_cubre.map((x, i) => (
                    <div key={i} className="flex items-start gap-2 text-[13px] font-bold text-titulo dark:text-titulo-dark">
                      <HiCheckCircle className="mt-0.5 shrink-0 text-duo-verde" />
                      <span>{x}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] font-bold text-suave dark:text-suave-dark">
                  El PDF no trae el detalle de cobertura. El portal va a mostrar
                  solo el código.
                </p>
              )}
            </div>

            {(cobertura.ojo_con || []).length ? (
              <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4">
                <div className="text-[12px] font-black uppercase tracking-wide text-suave dark:text-suave-dark mb-2">
                  Tené en cuenta
                </div>
                <div className="grid gap-1.5">
                  {cobertura.ojo_con.map((x, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12.5px] font-bold text-suave dark:text-suave-dark">
                      <span className="shrink-0">·</span>
                      <span>{x}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-2">
              <Dato label="Cobertura" valor={cobertura.codigo || form.cobertura || "—"} />
              <Dato label="Cuotas" valor={cupones.length || "—"} />
              <Dato label="Grúa" valor={asistencia?.telefono || "—"} alerta={!asistencia} />
              <Dato label="Clave de pago" valor={extra?.pago?.clave_pmc || extra?.pago?.codigo_link || "—"} />
              <Dato label="PDF guardado" valor={pdf ? "Sí" : "No"} alerta={!pdf} />
            </div>

            <Aviso>
              Al confirmar, la póliza actual pasa a <strong>FINALIZADA</strong> y
              se crea la nueva <strong>ACTIVA</strong> con todo esto. El portal
              del cliente se actualiza solo.
            </Aviso>
          </div>
        )}
      </ModalDuo>
    </>
  );
}