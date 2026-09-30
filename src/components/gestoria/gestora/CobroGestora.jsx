// src/components/gestoria/gestora/CobroGestora.jsx
//
// 💵 «Recibí plata» de la app de la gestora (30/09): la hoja que sube desde abajo.
//   - "¿Cuánto te pagó?" en grande (se escribe con los puntos: 60.000; si se pega
//     "60.000,00" del banco, los centavos no cuentan como miles);
//   - el atajo «Todo lo que falta ($ 40.000)» cuando ya hay precio;
//   - si todavía no hay precio: "¿Cuánto le cobrás en total?" (arranca en lo que ya te pagó
//     más esto: si pagó todo, es lo mismo);
//   - el comprobante: «Sacar foto» (abre la cámara del celu) o «Subir archivo» (foto o PDF);
//   - 🔒 "Lo ven solo vos y la administración de THAMES".
// Si se abrió al tocar «Está LISTO» sin comprobante: "Guardar y pasar a LISTO".
// documento = un comprobante que mandó el cliente desde su link: solo falta el monto.
// onGuardar recibe lo mismo que ModalCobro: {monto, archivo | documento, precio_gestoria?, pasar_a_listo}.
import { useEffect, useRef, useState } from "react";
import { HiOutlineCamera, HiOutlineCheck, HiOutlineDocumentText, HiOutlineLockClosed, HiOutlinePaperClip } from "react-icons/hi2";

import ModalDuo from "../../ui/ModalDuo";
import { mensajeError, subirArchivo } from "../../../services/gestoria";
import { plata } from "../gestoriaUtils";
import { Boton, CampoPlata } from "./piezas";
import { conPuntos, foco, montoDe, plataDe, suave } from "./gestoraUtils";

const esFoto = (a) => String(a?.mime || "").startsWith("image/");

export default function CobroGestora({ t, abierto, onCerrar, onGuardar, luegoListo = false, documento = null }) {
  const [monto, setMonto] = useState(""); // lo que se ve: "60.000"
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
  const p = plataDe(t);
  const pidePrecio = p.precio == null;
  const m = montoDe(monto);
  // Sin precio: arranca en lo que ya pagó + esto (si pagó todo, es lo mismo). Si lo toca, queda lo suyo.
  const precioEf = precioTocado ? precio : m > 0 ? conPuntos(String(Math.round(p.cobrado + m))) : "";
  const total = pidePrecio ? montoDe(precioEf) : p.precio;
  const pasa = m > 0 && total > 0 && p.cobrado + m > total;
  const falta = p.falta != null && p.falta >= 1 ? Math.floor(p.falta) : null;
  const ident = [t.con_vehiculo === false ? t.persona_nombre : t.patente, t.tipo_corto].filter(Boolean).join(" · ");

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
    if (guardando || subiendo) return;
    if (!(m > 0)) return setError("Poné cuánto te pagó el cliente.");
    if (!documento && !archivo) return setError("Falta el comprobante: sacale una foto o subí el archivo.");
    if (pidePrecio && !(total > 0)) return setError("Poné cuánto le cobrás en total por el trámite.");
    setGuardando(true);
    setError("");
    try {
      const body = { monto: m, pasar_a_listo: luegoListo };
      if (documento) body.documento = documento.id;
      else body.archivo = archivo;
      if (pidePrecio) body.precio_gestoria = total;
      await onGuardar(body);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const botonArchivo = `flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark px-3 text-[15px] font-bold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark focus-within:ring-2 focus-within:ring-duo-violeta ${
    subiendo ? "pointer-events-none opacity-60" : ""
  }`;

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineCamera />}
      iconTono="verde"
      title={luegoListo ? "Para pasarlo a LISTO" : "Recibí plata"}
      subtitle={ident}
      footer={
        <>
          <Boton tono="blanco" chico onClick={onCerrar} className="sm:w-auto">
            Volver
          </Boton>
          <Boton tono="verde" chico icono={HiOutlineCheck} onClick={guardar} disabled={guardando || subiendo} className="sm:w-auto">
            {guardando ? "Guardando…" : subiendo ? "Subiendo…" : luegoListo ? "Guardar y pasar a LISTO" : "Guardar cobro"}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-rojo dark:text-red-300"
          >
            {error}
          </p>
        ) : null}
        {luegoListo ? (
          <p className="rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-amarillo-sombra dark:text-amber-200">
            Para LISTO falta el comprobante de lo que te pagó el cliente.
          </p>
        ) : null}

        {/* ¿Cuánto te pagó? (en grande) */}
        <label className="flex flex-col items-center gap-2">
          <span className="text-[16px] font-bold text-slate-600 dark:text-slate-300">¿Cuánto te pagó?</span>
          <span className="flex items-baseline gap-1.5 border-b-[2.5px] border-duo-violeta px-2.5 pb-1.5">
            <span className={`text-[30px] font-extrabold ${suave}`} aria-hidden="true">
              $
            </span>
            <CampoPlata
              valor={monto}
              onCambiar={(v) => {
                setError("");
                setMonto(v);
              }}
              placeholder="0"
              aria-label="Monto que te pagó, en pesos"
              className="w-[210px] max-w-[60vw] bg-transparent text-center text-[44px] font-extrabold leading-none text-titulo dark:text-titulo-dark outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
              style={{ fontVariantNumeric: "tabular-nums" }}
            />
          </span>
        </label>

        {/* Atajo y lo que ya se sabe del precio */}
        {!pidePrecio ? (
          <div className="flex flex-col items-center gap-2">
            {falta ? (
              <button
                type="button"
                aria-pressed={m === falta}
                onClick={() => {
                  setError("");
                  setMonto(conPuntos(String(falta)));
                }}
                className={`min-h-[44px] rounded-full px-4 text-[15px] transition-colors ${
                  m === falta
                    ? "border-[1.5px] border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff]"
                    : "border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark font-semibold text-titulo dark:text-titulo-dark"
                } ${foco}`}
              >
                {p.cobrado > 0 ? "Todo lo que falta" : "Todo"} ({plata(falta)})
              </button>
            ) : null}
            <p className={`text-center text-[14.5px] ${suave}`}>
              Precio del trámite: <strong className="text-titulo dark:text-titulo-dark">{plata(p.precio)}</strong>
              {p.cobrado > 0 ? (
                <>
                  {" "}
                  · ya te pagó <strong className="text-titulo dark:text-titulo-dark">{plata(p.cobrado)}</strong>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5 text-[15px] font-extrabold text-titulo dark:text-titulo-dark">
            ¿Cuánto le cobrás en total por el trámite?
            <span className="flex items-center gap-2 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark px-3 focus-within:border-duo-violeta">
              <span className={`text-[17px] font-bold ${suave}`} aria-hidden="true">
                $
              </span>
              <CampoPlata
                valor={precioEf}
                onCambiar={(v) => {
                  setError("");
                  setPrecio(v);
                  setPrecioTocado(true);
                }}
                placeholder="Ej: 60.000"
                aria-label="Precio total del trámite, en pesos"
                className="h-12 min-w-0 flex-1 bg-transparent text-[17px] font-bold text-titulo dark:text-titulo-dark outline-none placeholder:font-normal placeholder:text-suave dark:placeholder:text-suave-dark"
              />
            </span>
            <span className={`text-[13px] font-normal ${suave}`}>
              {p.cobrado > 0 ? `Ya te pagó ${plata(p.cobrado)} antes. ` : ""}Si te pagó todo, es lo mismo. Si fue una seña, poné el total.
            </span>
          </label>
        )}

        {/* El comprobante */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[16px] font-extrabold text-titulo dark:text-titulo-dark">
            Comprobante{" "}
            {!documento ? <span className={`text-[13.5px] font-semibold ${suave}`}>(foto o PDF, obligatorio)</span> : null}
          </span>
          {documento ? (
            <a
              href={documento.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 rounded-[14px] border-[1.5px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 ${foco}`}
            >
              <HiOutlineDocumentText className="h-6 w-6 shrink-0 text-duo-azul dark:text-blue-300" strokeWidth={2} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold text-titulo dark:text-titulo-dark">{documento.nombre || "comprobante"}</span>
                <span className={`text-[13px] ${suave}`}>Lo mandó el cliente desde su link: solo falta el monto.</span>
              </span>
            </a>
          ) : archivo ? (
            <div className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
              <a
                href={archivo.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver ${archivo.nombre}`}
                className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-slate-100 dark:bg-slate-700/60 ${foco}`}
              >
                {esFoto(archivo) ? (
                  <img src={archivo.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <HiOutlineDocumentText className={`h-6 w-6 ${suave}`} strokeWidth={2} aria-hidden="true" />
                )}
              </a>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-extrabold text-titulo dark:text-titulo-dark">{archivo.nombre}</span>
                <span className="flex items-center gap-1 text-[13.5px] font-bold text-duo-verde-sombra dark:text-green-400">
                  <HiOutlineCheck className="h-[15px] w-[15px]" strokeWidth={3} aria-hidden="true" />
                  Listo para guardar
                </span>
              </span>
              <label className="flex min-h-[44px] shrink-0 cursor-pointer items-center rounded-lg px-2.5 text-[15px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] focus-within:ring-2 focus-within:ring-duo-violeta">
                Cambiar
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={elegir} />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2" aria-busy={subiendo}>
              <label className={botonArchivo}>
                <HiOutlineCamera className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                {subiendo ? "Subiendo…" : "Sacar foto"}
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={elegir} disabled={subiendo} />
              </label>
              <label className={botonArchivo}>
                <HiOutlinePaperClip className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                Subir archivo
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={elegir} disabled={subiendo} />
              </label>
            </div>
          )}
        </div>

        {pasa ? (
          <p className="rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-amarillo-sombra dark:text-amber-200">
            Ojo: con esto suma {plata(p.cobrado + m)}, más que el precio ({plata(total)}). Fijate que esté bien.
          </p>
        ) : null}

        <p className={`flex items-center justify-center gap-1.5 text-center text-[13.5px] ${suave}`}>
          <HiOutlineLockClosed className="h-[15px] w-[15px] shrink-0" strokeWidth={2} aria-hidden="true" />
          Lo ven solo vos y la administración de THAMES.
        </p>
      </div>
    </ModalDuo>
  );
}
