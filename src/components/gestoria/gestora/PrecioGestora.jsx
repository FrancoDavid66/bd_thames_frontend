// src/components/gestoria/gestora/PrecioGestora.jsx
//
// 💵 "¿Cuánto le cobrás al cliente?" (app de la gestora, 30/09): la hoja que sube
// desde abajo para cargar o cambiar el precio del trámite. Mismo campo de plata que
// «Recibí plata» (se escribe 60.000, con los puntos), así no se confunde el punto de
// los miles con una coma de centavos (el campo viejo leía "60.000" como 60).
// Si se abrió al tocar «Está LISTO» sin precio: "Guardar y pasar a LISTO".
// 🔒 Sin la comisión de THAMES: esa la ve solo el admin.
// onGuardar recibe lo mismo que ModalPrecio: {precio_gestoria, pasar_a_listo}.
import { useEffect, useState } from "react";
import { HiOutlineBanknotes, HiOutlineCheck, HiOutlineLockClosed } from "react-icons/hi2";

import ModalDuo from "../../ui/ModalDuo";
import { mensajeError } from "../../../services/gestoria";
import { plata } from "../gestoriaUtils";
import { Boton, CampoPlata } from "./piezas";
import { conPuntos, montoDe, plataDe, suave } from "./gestoraUtils";

export default function PrecioGestora({ t, abierto, onCerrar, onGuardar, luegoListo = false }) {
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const inicial = t?.precio_gestoria;

  // Al abrir: el precio que ya tiene (una recarga "en vivo" no borra lo que está escribiendo).
  useEffect(() => {
    if (!abierto) return;
    setPrecio(inicial != null ? conPuntos(String(Math.round(Number(inicial)))) : "");
    setError("");
  }, [abierto, inicial]);

  if (!t) return null;
  const p = plataDe(t);
  const valor = montoDe(precio);
  const ident = [t.con_vehiculo === false ? t.persona_nombre : t.patente, t.tipo_corto].filter(Boolean).join(" · ");

  const guardar = async () => {
    if (guardando) return;
    if (!(valor > 0)) return setError("Poné cuánto le cobrás al cliente (en pesos).");
    setGuardando(true);
    setError("");
    try {
      await onGuardar({ precio_gestoria: valor, pasar_a_listo: luegoListo });
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
      icon={<HiOutlineBanknotes />}
      iconTono="violeta"
      title={luegoListo ? "Falta el precio" : "¿Cuánto le cobrás?"}
      subtitle={ident}
      footer={
        <>
          <Boton tono="blanco" chico onClick={onCerrar} className="sm:w-auto">
            Volver
          </Boton>
          <Boton tono="violeta" chico icono={HiOutlineCheck} onClick={guardar} disabled={guardando} className="sm:w-auto">
            {guardando ? "Guardando…" : luegoListo ? "Guardar y pasar a LISTO" : "Guardar precio"}
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
            Para LISTO falta cargar cuánto le cobrás al cliente.
          </p>
        ) : null}

        <label className="flex flex-col items-center gap-2">
          <span className="text-[16px] font-bold text-slate-600 dark:text-slate-300">Lo que le cobrás por todo el trámite</span>
          <span className="flex items-baseline gap-1.5 border-b-[2.5px] border-duo-violeta px-2.5 pb-1.5">
            <span className={`text-[30px] font-extrabold ${suave}`} aria-hidden="true">
              $
            </span>
            <CampoPlata
              valor={precio}
              onCambiar={(v) => {
                setError("");
                setPrecio(v);
              }}
              placeholder="0"
              aria-label="Precio del trámite, en pesos"
              className="w-[210px] max-w-[60vw] bg-transparent text-center text-[44px] font-extrabold leading-none text-titulo dark:text-titulo-dark outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
              style={{ fontVariantNumeric: "tabular-nums" }}
              autoFocus
            />
          </span>
        </label>

        {p.cobrado > 0 ? (
          <p className={`text-center text-[14.5px] ${suave}`}>
            Ya te pagó <strong className="text-titulo dark:text-titulo-dark">{plata(p.cobrado)}</strong>
          </p>
        ) : null}
        {valor > 0 && p.cobrado > valor ? (
          <p className="rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-amarillo-sombra dark:text-amber-200">
            Ojo: ya te pagó {plata(p.cobrado)}, más que este precio. Fijate que esté bien.
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
