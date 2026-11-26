// src/components/legales/DerivarGestoria.jsx
//
// 🚗 GESTORÍA DENTRO DE CONSULTAS (Franco 26/11/2026)
//   La gestora dejó de trabajar con el estudio: las consultas de «Gestoría del auto» las
//   deriva el admin a una gestoría externa por WhatsApp.
//
//   · ModalDerivar: elegir la gestoría (o darla de alta: nombre + WhatsApp), precio y %
//     (opcionales, solo admin) → «Derivar» → quedan los 2 WhatsApp listos:
//       1) a la gestoría, con los datos del cliente (sin la póliza);
//       2) al cliente, avisándole quién lo va a contactar (de usted).
//   · SeccionGestoria: en la ficha del caso. La oficina ve a quién se derivó; el admin,
//     además, el precio y su comisión, y puede cambiar de gestoría o deshacer.
//
//   Ej: Juan pide un 08 en Km 39 → Derivar → «Gestoría López» → WhatsApp → listo.
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { HiCheckCircle, HiLockClosed, HiPlus, HiTruck, HiX } from "react-icons/hi";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import { Seccion } from "../gestoria/Piezas";
import { BotonWa, Chip } from "./PiezasLegales";
import { CartelError, inputCls } from "./ModalesCaso";
import { ddmm, plata } from "./legalesUtils";
import {
  crearGestoria,
  derivarGestoria,
  deshacerDerivacion,
  guardarPlataGestoria,
  mensajeError,
  pedirGestorias,
  quitarGestoria,
} from "../../services/legales";

const labelCls = "flex flex-col gap-1.5 text-[13px] font-semibold text-suave dark:text-suave-dark min-w-0";

/* ───────────────────────── Modal «Derivar» ───────────────────────── */
export function ModalDerivar({ caso, abierto, onCerrar, onDerivado }) {
  const [gestorias, setGestorias] = useState(null);
  const [elegida, setElegida] = useState(null);
  const [nueva, setNueva] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "", comision_pct: "" });
  const [precio, setPrecio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(null); // respuesta del servidor (los WhatsApp)

  useEffect(() => {
    if (!abierto) return;
    setListo(null);
    setError("");
    setNueva(false);
    setForm({ nombre: "", telefono: "", comision_pct: "" });
    setPrecio(caso?.gestoria?.plata?.precio ? String(Math.round(Number(caso.gestoria.plata.precio))) : "");
    setElegida(caso?.gestoria?.gestor_id || null);
    pedirGestorias()
      .then((l) => {
        setGestorias(l || []);
        if (!l?.length) setNueva(true);
      })
      .catch(() => setGestorias([]));
    // Solo al abrir (o si cambia el caso): al derivar, el caso se actualiza y NO hay que borrar la pantalla de «listo».
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, caso?.id]);

  if (!caso) return null;

  const agregar = async () => {
    setError("");
    try {
      const g = await crearGestoria(form);
      setGestorias((l) => [...(l || []).filter((x) => x.id !== g.id), g].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setElegida(g.id);
      setNueva(false);
      setForm({ nombre: "", telefono: "", comision_pct: "" });
    } catch (e) {
      setError(mensajeError(e, "No se pudo agregar la gestoría."));
    }
  };

  const quitar = async (g) => {
    if (!window.confirm(`¿Sacar «${g.nombre}» de la lista? No se borra: deja de aparecer para derivar.`)) return;
    try {
      await quitarGestoria(g.id);
      setGestorias((l) => l.filter((x) => x.id !== g.id));
      if (elegida === g.id) setElegida(null);
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo sacar."));
    }
  };

  const derivar = async () => {
    if (!elegida) return setError("Elegí la gestoría.");
    setGuardando(true);
    setError("");
    try {
      const r = await derivarGestoria(caso.id, { gestor: elegida, ...(precio ? { precio } : {}) });
      setListo(r);
      onDerivado?.(r.caso);
    } catch (e) {
      setError(mensajeError(e, "No se pudo derivar."));
    } finally {
      setGuardando(false);
    }
  };

  const g = (gestorias || []).find((x) => x.id === elegida);

  if (listo) {
    return (
      <ModalDuo
        isOpen={abierto}
        onClose={onCerrar}
        size="sm"
        icon={<HiCheckCircle />}
        iconTono="verde"
        title={`Derivada a ${listo.caso?.gestoria?.gestor_nombre || g?.nombre || "la gestoría"}`}
        subtitle={caso.persona_nombre}
        footer={
          <Boton3D variant="blanco" onClick={onCerrar} full>
            Listo
          </Boton3D>
        }
      >
        <div className="flex flex-col gap-3 text-titulo dark:text-titulo-dark">
          <p className="text-[14px]">Mandá los dos WhatsApp (ya están escritos):</p>
          <div className="flex flex-col gap-1.5 rounded-xl border border-linea dark:border-linea-dark p-3">
            <span className="text-[12px] font-bold tracking-wide text-suave dark:text-suave-dark">1 · A LA GESTORÍA</span>
            <p className="whitespace-pre-line text-[13px] text-suave dark:text-suave-dark line-clamp-6">{listo.mensaje_gestoria}</p>
            {listo.wa_gestoria ? (
              <BotonWa href={listo.wa_gestoria} full>
                Mandar a {listo.caso?.gestoria?.gestor_nombre || "la gestoría"}
              </BotonWa>
            ) : (
              <p className="text-[13px] font-semibold text-duo-rojo">La gestoría no tiene WhatsApp cargado.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-linea dark:border-linea-dark p-3">
            <span className="text-[12px] font-bold tracking-wide text-suave dark:text-suave-dark">2 · AL CLIENTE (opcional)</span>
            <p className="text-[13px] text-suave dark:text-suave-dark">{listo.mensaje_cliente}</p>
            {listo.wa_cliente ? (
              <BotonWa href={listo.wa_cliente} variante="borde" full>
                Avisarle al cliente
              </BotonWa>
            ) : (
              <p className="text-[13px] font-semibold text-duo-rojo">El cliente no tiene WhatsApp cargado.</p>
            )}
          </div>
        </div>
      </ModalDuo>
    );
  }

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiTruck />}
      title={caso.gestoria?.derivada ? "Pasar a otra gestoría" : "Derivar a una gestoría"}
      subtitle={caso.persona_nombre}
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">
            Volver
          </Boton3D>
          <Boton3D variant="verde" onClick={derivar} disabled={guardando || !elegida} className="w-full sm:w-auto">
            {guardando ? "Derivando…" : "Derivar y armar el WhatsApp"}
          </Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {gestorias === null ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface dark:bg-surface-dark" />
        ) : (
          <div role="radiogroup" aria-label="Gestoría" className="flex flex-col gap-2">
            {gestorias.map((x) => (
              <div
                key={x.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  elegida === x.id ? "border-sky-600 bg-sky-50 dark:bg-sky-500/10" : "border-linea dark:border-linea-dark"
                }`}
              >
                <button type="button" role="radio" aria-checked={elegida === x.id} onClick={() => setElegida(x.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span
                    className={`grid h-5 w-5 flex-none place-items-center rounded-full border-2 ${
                      elegida === x.id ? "border-sky-600" : "border-linea dark:border-linea-dark"
                    }`}
                  >
                    {elegida === x.id && <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-[15px] text-titulo dark:text-titulo-dark">{x.nombre}</strong>
                    <span className="block truncate text-[12px] text-suave dark:text-suave-dark">
                      {x.telefono || "Sin WhatsApp"}
                      {x.derivadas ? ` · ${x.derivadas} derivada${x.derivadas === 1 ? "" : "s"}` : ""}
                      {Number(x.comision_pct) > 0 ? ` · ${Number(x.comision_pct)}%` : ""}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => quitar(x)} title="Sacar de la lista" className="grid h-8 w-8 place-items-center rounded-lg text-suave hover:bg-surface dark:hover:bg-surface-dark">
                  <HiX className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {nueva ? (
          <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-sky-600/60 p-3">
            <span className="text-[13px] font-bold text-titulo dark:text-titulo-dark">Gestoría nueva</span>
            <label className={labelCls}>
              Nombre
              <input className={inputCls} value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Gestoría López" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={labelCls}>
                WhatsApp
                <input className={inputCls} inputMode="tel" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="11 5555-0000" />
              </label>
              <label className={labelCls}>
                Tu comisión %
                <input className={inputCls} inputMode="decimal" value={form.comision_pct} onChange={(e) => setForm((f) => ({ ...f, comision_pct: e.target.value }))} placeholder="Ej: 10" />
              </label>
            </div>
            <div className="flex gap-2">
              {gestorias?.length ? (
                <button type="button" onClick={() => setNueva(false)} className="flex-1 min-h-[40px] rounded-lg border border-linea dark:border-linea-dark text-[14px] font-semibold text-titulo dark:text-titulo-dark">
                  Cancelar
                </button>
              ) : null}
              <button type="button" onClick={agregar} className="flex-1 min-h-[40px] rounded-lg bg-sky-700 text-[14px] font-bold text-white hover:bg-sky-800">
                Agregar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setNueva(true)} className="inline-flex items-center gap-1.5 self-start text-[14px] font-semibold text-sky-800 dark:text-sky-300">
            <HiPlus className="h-4 w-4" /> Agregar otra gestoría
          </button>
        )}

        <label className={labelCls}>
          <span className="inline-flex items-center gap-1.5">
            Cuánto le cobra la gestoría al cliente <small className="font-normal">(opcional · solo vos)</small>
          </span>
          <input className={inputCls} inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Ej: 45000 (lo podés cargar después)" />
        </label>
        <p className="text-[12px] text-suave dark:text-suave-dark">
          A la gestoría le llegan el nombre, DNI, WhatsApp y lo que necesita el cliente. Nunca la póliza.
        </p>
        <CartelError texto={error} />
      </div>
    </ModalDuo>
  );
}

/* ───────────────────────── Sección en la ficha del caso ───────────────────────── */
export function SeccionGestoria({ e, onDerivar, onCambio }) {
  const g = e?.gestoria;
  const [editando, setEditando] = useState(false);
  const [precio, setPrecio] = useState("");
  const [pct, setPct] = useState("");
  if (!g) return null;
  const admin = !!g.plata;

  const deshacer = async () => {
    if (!window.confirm(`¿Deshacer la derivación a ${g.gestor_nombre}? Vuelve a «Para derivar».`)) return;
    try {
      onCambio?.(await deshacerDerivacion(e.id));
      toast.success("Volvió a «Para derivar»");
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo deshacer."));
    }
  };
  const abrirPlata = () => {
    setPrecio(g.plata?.precio ? String(Math.round(Number(g.plata.precio))) : "");
    setPct(g.plata?.comision_pct ? String(Number(g.plata.comision_pct)) : "");
    setEditando(true);
  };
  const guardarPlata = async () => {
    try {
      onCambio?.(await guardarPlataGestoria(e.id, { precio, comision_pct: pct }));
      setEditando(false);
      toast.success("Guardado");
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo guardar."));
    }
  };

  return (
    <Seccion
      titulo={
        <span className="inline-flex items-center gap-2">
          <HiTruck className="h-5 w-5 text-sky-700 dark:text-sky-400" />
          <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Gestoría</h2>
          {g.derivada ? <Chip tono="verde">Derivada</Chip> : <Chip tono="ambar">Para derivar</Chip>}
        </span>
      }
      derecha={
        admin ? (
          <button type="button" onClick={onDerivar} className="rounded-lg bg-sky-700 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-sky-800">
            {g.derivada ? "Cambiar gestoría" : "Derivar"}
          </button>
        ) : null
      }
    >
      {g.derivada ? (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] text-titulo dark:text-titulo-dark">
            La lleva <b>{g.gestor_nombre}</b>
            {g.gestor_telefono ? ` (${g.gestor_telefono})` : ""} · derivada el {ddmm(g.derivado_en)}
            {g.derivado_por ? ` por ${g.derivado_por.split(" ")[0]}` : ""}.
          </p>
          {admin && (
            <div className="flex flex-wrap gap-2">
              {g.wa_gestoria && (
                <BotonWa href={g.wa_gestoria} size="sm">
                  Volver a mandarle a la gestoría
                </BotonWa>
              )}
              {g.wa_cliente && (
                <BotonWa href={g.wa_cliente} size="sm" variante="borde">
                  Avisarle al cliente
                </BotonWa>
              )}
              <button type="button" onClick={deshacer} className="text-[13px] font-semibold text-suave underline underline-offset-2 hover:text-duo-rojo">
                Deshacer
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[14px] text-suave dark:text-suave-dark">
          {admin ? "Todavía no se derivó. Tocá «Derivar» y elegí la gestoría." : "Franco la deriva a una gestoría."}
        </p>
      )}
      {g.de_tramite && (
        <p className="text-[12px] text-suave dark:text-suave-dark">
          Venía de la Gestoría vieja ({g.de_tramite}){g.gestor_anterior ? `, con ${g.gestor_anterior}` : ""}
          {g.patente ? ` · patente ${g.patente}` : ""}.
        </p>
      )}

      {admin && (
        <div className="rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-suave dark:text-suave-dark">
              <HiLockClosed className="h-3 w-3" /> PLATA · SOLO VOS
            </span>
            {!editando && (
              <button type="button" onClick={abrirPlata} className="text-[13px] font-semibold text-sky-800 dark:text-sky-300">
                {g.plata?.precio ? "Cambiar" : "Cargar"}
              </button>
            )}
          </div>
          {editando ? (
            <div className="mt-2 grid grid-cols-[1fr_90px_auto] items-end gap-2">
              <label className={labelCls}>
                Cobra la gestoría
                <input className={inputCls} inputMode="numeric" value={precio} onChange={(ev) => setPrecio(ev.target.value)} placeholder="45000" />
              </label>
              <label className={labelCls}>
                Tu %
                <input className={inputCls} inputMode="decimal" value={pct} onChange={(ev) => setPct(ev.target.value)} placeholder="10" />
              </label>
              <button type="button" onClick={guardarPlata} className="h-11 rounded-lg bg-sky-700 px-3 text-[14px] font-bold text-white">
                Guardar
              </button>
            </div>
          ) : (
            <div className="mt-1 grid grid-cols-2 gap-2 text-[14px]">
              <span className="text-suave dark:text-suave-dark">
                Cobra: <b className="text-titulo dark:text-titulo-dark">{g.plata?.precio ? plata(g.plata.precio) : "—"}</b>
              </span>
              <span className="text-suave dark:text-suave-dark">
                Tu comisión{g.plata?.comision_pct ? ` (${Number(g.plata.comision_pct)}%)` : ""}:{" "}
                <b className="text-green-700 dark:text-green-400">{g.plata?.comision ? plata(g.plata.comision) : "—"}</b>
              </span>
            </div>
          )}
        </div>
      )}
    </Seccion>
  );
}
