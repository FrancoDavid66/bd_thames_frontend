// src/components/gestoria/ModalesTramite.jsx
//
// 🪟 Ventanitas de la ficha:
//   - ModalPrecio:    el gestor carga cuánto le cobra al cliente (el admin, además, el %).
//                     🔒 Al gestor no se le muestra la comisión (la ve solo el admin, 29/09).
//   - ModalCobro:     💵 "Recibí plata": cuánto pagó el cliente + la foto del comprobante
//                     (si falta el precio, se carga acá también).
//   - ModalObservar:  qué pidió el registro.
//   - ModalCancelar:  motivo.
//   - ModalCobrar:    el admin marca cobrada la comisión (+ comprobante opcional).
//   - ModalMensajes:  los WhatsApp que se le mandaron al cliente (a mano o automáticos).
import { useEffect, useRef, useState } from "react";
import { HiCamera, HiCash, HiChatAlt2, HiDocumentText, HiExclamation, HiX } from "react-icons/hi";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import { subirArchivo, mensajeError } from "../../services/gestoria";
import { calcComision, ddmm, fmtPct, hhmm, plata } from "./gestoriaUtils";

const inputCls =
  "w-full h-10 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[14px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta [color-scheme:light] dark:[color-scheme:dark]";

function CartelError({ texto }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-lg border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[13px] font-semibold text-duo-rojo">
      {texto}
    </p>
  );
}

/**
 * props: t (trámite), abierto, onCerrar, onGuardar({precio_gestoria, comision_pct?, pasar_a_listo}),
 *        luegoListo (true si se abrió al querer pasar a LISTO sin precio)
 */
export function ModalPrecio({ t, abierto, onCerrar, onGuardar, luegoListo = false }) {
  const esGestor = !!t?.acciones?.es_gestor;
  const conPct = !!t?.acciones?.puede_pct;
  const [precio, setPrecio] = useState("");
  const [pct, setPct] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto || !t) return;
    setPrecio(t.precio_gestoria != null ? String(Math.round(Number(t.precio_gestoria))) : "");
    setPct(t.comision_pct != null ? String(Number(t.comision_pct)) : "");
    setError("");
  }, [abierto, t]);

  if (!t) return null;
  const p = Number(precio);
  const c = conPct ? Number(pct) : Number(t.comision_pct);
  let calc;
  if (t.comision_cobrada) calc = `Comisión para THAMES: ${plata(t.comision)} (ya cobrada, no cambia)`;
  else if (!t.gestor) calc = "La comisión se calcula cuando lo tome un gestor (con su %).";
  else if (conPct && (pct === "" || !(c >= 0))) calc = "Comisión para THAMES: poné el %";
  else if (!(p > 0)) calc = `Comisión para THAMES (${fmtPct(c)}): se calcula con el precio`;
  else calc = `Comisión para THAMES (${fmtPct(c)}): ${plata(calcComision(p, c))}`;

  const guardar = async () => {
    if (!(p > 0)) return setError("Poné el precio en pesos (mayor a cero).");
    if (conPct && (pct === "" || !(c >= 0 && c <= 100))) return setError("El % tiene que ir de 0 a 100.");
    setGuardando(true);
    setError("");
    try {
      const body = { precio_gestoria: Math.round(p), pasar_a_listo: luegoListo };
      if (conPct) body.comision_pct = c;
      await onGuardar(body);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiCash />}
      iconTono="amarillo"
      title={luegoListo ? "Falta el precio" : esGestor ? "¿Cuánto le cobrás al cliente?" : "Precio y comisión"}
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <Boton3D variant="violeta" onClick={guardar} disabled={guardando} className="w-full sm:w-auto">
            {guardando ? "Guardando…" : luegoListo ? "Guardar y pasar a LISTO" : "Guardar"}
          </Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        {luegoListo && (
          <p className="rounded-lg bg-orange-50 dark:bg-orange-500/10 px-3 py-2 text-[13px] font-medium text-orange-700 dark:text-orange-300">
            Para pasarlo a LISTO primero cargá cuánto {esGestor ? "le cobrás" : "le cobra la gestoría"} al cliente.
          </p>
        )}
        <p className="text-[13px] text-suave dark:text-suave-dark">
          {esGestor
            ? "Lo que le cobrás al cliente por todo el trámite. Solo lo ve THAMES (la administración), no las oficinas."
            : "El precio lo cobra la gestoría (para THAMES es un dato). La comisión es el % de ese precio."}
        </p>
        <div className={`grid gap-3 ${conPct ? "grid-cols-2" : "grid-cols-1"}`}>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">
            {esGestor ? "Precio al cliente" : "Precio de la gestoría"}
            <input
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              placeholder="Ej: 250000"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </label>
          {conPct && (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">
              % de comisión
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                className={inputCls}
              />
            </label>
          )}
        </div>
        {/* 🔒 La comisión la ve solo el admin (29/09): al gestor no se le muestra. */}
        {!esGestor && <p className="text-[13px] font-semibold text-titulo dark:text-titulo-dark">{calc}</p>}
      </div>
    </ModalDuo>
  );
}

/**
 * 💵 "Recibí plata" (Franco 29/09: "cada vez que la gestora reciba plata, que suba
 * el comprobante en la app"): cuánto pagó el cliente + la foto o el PDF.
 * Si todavía no hay precio, también pide cuánto le cobra en total (sale igual a
 * lo que pagó; se cambia si fue una seña).
 * props: t, abierto, onCerrar, onGuardar(body), luegoListo (se abrió al querer pasar
 *        a LISTO), documento (un comprobante que mandó el cliente: solo falta el monto).
 * body: {monto, archivo | documento, precio_gestoria?, pasar_a_listo}
 */
export function ModalCobro({ t, abierto, onCerrar, onGuardar, luegoListo = false, documento = null }) {
  const esGestor = !!t?.acciones?.es_gestor;
  const [monto, setMonto] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioTocado, setPrecioTocado] = useState(false);
  const [archivo, setArchivo] = useState(null); // {url, public_id, nombre, mime, tamano} ya en Cloudinary
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const pedido = useRef(0); // si se cierra mientras sube, esa subida ya no cuenta

  useEffect(() => {
    if (!abierto) return;
    pedido.current += 1;
    setMonto("");
    setPrecio("");
    setPrecioTocado(false);
    setArchivo(null);
    setSubiendo(false);
    setError("");
  }, [abierto]);

  if (!t) return null;
  const pidePrecio = t.precio_gestoria == null;
  const m = Number(monto);
  const precioEf = precioTocado ? precio : monto; // si pagó todo, el precio es lo mismo
  const p = pidePrecio ? Number(precioEf) : Number(t.precio_gestoria);
  const yaCobrado = Number(t.cobrado || 0);
  const pasa = m > 0 && p > 0 && yaCobrado + m > p;

  const elegir = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const n = ++pedido.current;
    setSubiendo(true);
    setError("");
    try {
      const arch = await subirArchivo(f, "gestoria/comprobantes");
      if (n === pedido.current) setArchivo(arch);
    } catch (err) {
      if (n === pedido.current) setError(err?.message || "No se pudo subir el archivo.");
    } finally {
      if (n === pedido.current) setSubiendo(false);
    }
  };

  const guardar = async () => {
    if (!(m > 0)) return setError(esGestor ? "Poné cuánto te pagó el cliente (en pesos)." : "Poné cuánto pagó el cliente (en pesos).");
    if (!documento && !archivo) return setError("Subí la foto o el PDF del comprobante.");
    if (pidePrecio && !(Number(precioEf) > 0)) return setError("Poné cuánto se le cobra en total por el trámite.");
    setGuardando(true);
    setError("");
    try {
      const body = { monto: Math.round(m), pasar_a_listo: luegoListo };
      if (documento) body.documento = documento.id;
      else body.archivo = archivo;
      if (pidePrecio) body.precio_gestoria = Math.round(Number(precioEf));
      await onGuardar(body);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const campo = `${inputCls} h-12 text-[16px]`;
  const etiqueta = "flex flex-col gap-1.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark";
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiCash />}
      iconTono="verde"
      title={luegoListo ? "Para pasarlo a LISTO" : esGestor ? "Recibí plata" : "Registrar un cobro"}
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <Boton3D variant="verde" onClick={guardar} disabled={guardando || subiendo} className="w-full sm:w-auto">
            {guardando ? "Guardando…" : subiendo ? "Subiendo…" : luegoListo ? "Guardar y pasar a LISTO" : "Guardar"}
          </Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CartelError texto={error} />
        <p className="text-[14px] text-suave dark:text-suave-dark">
          {luegoListo
            ? esGestor
              ? "Primero cargá lo que te pagó el cliente y la foto del comprobante."
              : `Falta el comprobante de lo que pagó el cliente. Normalmente lo sube ${t.gestor_nombre || "el gestor"} desde su usuario; si lo tenés vos, cargalo acá.`
            : esGestor
              ? "Cada vez que el cliente te paga: cuánto y la foto del comprobante (transferencia o recibo)."
              : "Lo que el cliente le pagó a la gestoría, con su comprobante."}
          {esGestor ? " Lo ve solo la administración de THAMES, no las oficinas." : ""}
        </p>
        <label className={etiqueta}>
          {esGestor ? "¿Cuánto te pagó?" : "¿Cuánto pagó el cliente?"}
          <input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            placeholder="Ej: 100000"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={campo}
            autoFocus
          />
        </label>
        {documento ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">Comprobante</span>
            <a
              href={documento.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2.5 text-[14px] font-medium text-duo-azul hover:underline"
            >
              <HiDocumentText className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{documento.nombre || "comprobante"}</span>
            </a>
            <span className="text-[12px] text-suave dark:text-suave-dark">Lo mandó el cliente desde su link: solo falta el monto.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">Foto o PDF del comprobante</span>
            {archivo ? (
              <div className="flex items-center gap-2 rounded-lg border border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3 py-2.5">
                <HiDocumentText className="w-5 h-5 shrink-0 text-duo-verde-sombra dark:text-duo-verde" aria-hidden="true" />
                <a href={archivo.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-[14px] font-medium text-titulo dark:text-titulo-dark hover:underline">
                  {archivo.nombre}
                </a>
                <label className="shrink-0 cursor-pointer text-[13px] font-semibold text-duo-violeta hover:underline">
                  Cambiar
                  <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={elegir} />
                </label>
              </div>
            ) : (
              <label
                className={`flex items-center justify-center gap-2 min-h-[52px] rounded-xl border-2 border-dashed border-duo-violeta/50 px-4 text-[15px] font-bold text-duo-violeta dark:text-[#a5a0ff] cursor-pointer hover:bg-duo-violeta-soft dark:hover:bg-[var(--color-duo-violeta-soft-dark)] focus-within:ring-2 focus-within:ring-duo-violeta/40 ${
                  subiendo ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                <HiCamera className="w-5 h-5" aria-hidden="true" />
                {subiendo ? "Subiendo…" : "Sacar foto o subir archivo"}
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={elegir} disabled={subiendo} />
              </label>
            )}
          </div>
        )}
        {pidePrecio && (
          <label className={etiqueta}>
            {esGestor ? "¿Cuánto le cobrás en total por el trámite?" : "¿Cuánto cobra la gestoría en total?"}
            <input
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              placeholder="Ej: 150000"
              value={precioEf}
              onChange={(e) => {
                setPrecio(e.target.value);
                setPrecioTocado(true);
              }}
              className={campo}
            />
            <span className="text-[12px] font-normal text-suave dark:text-suave-dark">
              {esGestor ? "Si te pagó todo, es lo mismo." : "Si pagó todo, es lo mismo."} Si fue una seña, poné el total.
            </span>
          </label>
        )}
        {pasa && (
          <p className="rounded-lg bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-2 text-[13px] font-medium text-duo-amarillo-sombra dark:text-amber-200">
            Ojo: con esto suma {plata(yaCobrado + m)}, más que el precio ({plata(p)}). Fijate que esté bien.
          </p>
        )}
      </div>
    </ModalDuo>
  );
}

export function ModalObservar({ abierto, onCerrar, onGuardar }) {
  const [falta, setFalta] = useState("");
  const [vis, setVis] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setFalta("");
      setVis(true);
      setError("");
    }
  }, [abierto]);

  const guardar = async () => {
    if (!falta.trim()) return setError("Contá qué falta.");
    setGuardando(true);
    try {
      await onGuardar({ estado: "OBSERVADO", falta: falta.trim(), visible_cliente: vis });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiExclamation />}
      iconTono="amarillo"
      title="Marcar observado"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="w-full sm:w-auto rounded-lg bg-orange-600 hover:bg-orange-700 px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Marcar observado"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <p className="text-[13px] text-suave dark:text-suave-dark">El registro pidió algo más. Contá qué falta: lo ve la oficina en el tablero.</p>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">
          ¿Qué falta?
          <textarea
            rows={3}
            value={falta}
            onChange={(e) => setFalta(e.target.value)}
            placeholder="Ej: firma del vendedor en el 08"
            className="w-full rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2 text-[14px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta"
            autoFocus
          />
        </label>
        <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark cursor-pointer">
          <input type="checkbox" checked={vis} onChange={(e) => setVis(e.target.checked)} className="w-4 h-4" />
          Que el cliente lo vea en su link
        </label>
      </div>
    </ModalDuo>
  );
}

export function ModalCancelar({ abierto, onCerrar, onGuardar, conPlata = false }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setMotivo("");
      setError("");
    }
  }, [abierto]);

  const guardar = async () => {
    setGuardando(true);
    try {
      await onGuardar({ estado: "CANCELADO", motivo: motivo.trim() });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiX />}
      iconTono="rojo"
      title="Cancelar el trámite"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <Boton3D variant="rojo" onClick={guardar} disabled={guardando} className="w-full sm:w-auto">
            {guardando ? "Cancelando…" : "Cancelar trámite"}
          </Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <p className="text-[13px] text-suave dark:text-suave-dark">
          Deja de figurar en el tablero{conPlata ? " y ya no se espera la comisión" : ""}.
        </p>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">
          Motivo
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: el cliente desistió" className={inputCls} autoFocus />
        </label>
      </div>
    </ModalDuo>
  );
}

export function ModalCobrar({ t, abierto, formas = [], onCerrar, onGuardar }) {
  const [forma, setForma] = useState("TRANSFERENCIA");
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setForma("TRANSFERENCIA");
      setArchivo(null);
      setError("");
    }
  }, [abierto]);

  if (!t) return null;

  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      const body = { forma_pago: forma };
      if (archivo) body.comprobante = await subirArchivo(archivo, "gestoria/comisiones");
      await onGuardar(body);
    } catch (e) {
      setError(e?.response ? mensajeError(e) : e?.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiCash />}
      iconTono="verde"
      title="Cobrar la comisión"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <Boton3D variant="verde" onClick={guardar} disabled={guardando} className="w-full sm:w-auto">
            {guardando ? "Guardando…" : "Cobrada: anotar en la caja"}
          </Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <p className="text-[14px] text-titulo dark:text-titulo-dark">
          {t.gestor_nombre || "La gestoría"} nos paga <strong>{plata(t.comision_pendiente)}</strong> por este trámite. Entra a
          Balances como ingreso «Comisión gestoría», <strong>sin oficina</strong> (así no aparece en la caja de la oficina).
        </p>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">
          Forma de pago
          <select value={forma} onChange={(e) => setForma(e.target.value)} className={inputCls}>
            {formas.map((f) => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">
          Comprobante (opcional)
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="text-[13px] text-titulo dark:text-titulo-dark file:mr-3 file:rounded-md file:border-0 file:bg-surface dark:file:bg-surface-dark file:px-3 file:py-1.5 file:text-[13px] file:font-semibold"
          />
        </label>
      </div>
    </ModalDuo>
  );
}

export function ModalMensajes({ t, abierto, onCerrar }) {
  if (!t) return null;
  const msgs = [...(t.avisos_whatsapp || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  return (
    <ModalDuo isOpen={abierto} onClose={onCerrar} size="sm" icon={<HiChatAlt2 />} iconTono="verde" title="WhatsApp al cliente" subtitle={`${t.persona_nombre} · ${t.persona_telefono || "sin teléfono"}`}>
      <div className="flex flex-col gap-3 rounded-xl bg-surface dark:bg-surface-dark p-3">
        {msgs.length === 0 && <p className="text-center text-[13px] text-suave dark:text-suave-dark">Todavía no se le mandó ningún mensaje.</p>}
        {msgs.map((m, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <span className="self-center rounded-md bg-card dark:bg-card-dark px-2 py-0.5 text-[11px] font-semibold text-suave dark:text-suave-dark">
              {ddmm(m.fecha)} · {m.motivo === "alta" ? (m.manual ? "el link de seguimiento" : "al cargar el trámite") : "cuando pasó a LISTO"}
              {m.manual ? ` · a mano${m.autor ? ` (${m.autor})` : ""}` : ""}
              {m.simulado ? " · simulado" : ""}
              {!m.ok ? " · NO salió" : ""}
            </span>
            <div className="self-start max-w-[92%] whitespace-pre-line break-words rounded-2xl rounded-tl-sm bg-card dark:bg-card-dark px-3 py-2 text-[13px] text-titulo dark:text-titulo-dark shadow-sm">
              {m.texto}
              <span className="block text-right text-[11px] text-suave dark:text-suave-dark">{hhmm(m.fecha)}</span>
            </div>
            {!m.ok && m.error && <span className="text-[12px] text-duo-rojo">{m.error}</span>}
          </div>
        ))}
      </div>
    </ModalDuo>
  );
}
