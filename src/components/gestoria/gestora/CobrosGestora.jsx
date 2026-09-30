// src/components/gestoria/gestora/CobrosGestora.jsx
//
// 💵 «Cobros» de la app de la gestora (30/09, solo con las comisiones prendidas):
//   - cuánto le pagaron sus clientes en el mes (con comprobante);
//   - «Falta el comprobante»: los trámites que todavía no tienen ninguno (sin eso no
//     pasan a LISTO), cada uno con «Recibí plata» (monto + foto, sin entrar al trámite);
//   - «Te pagaron una parte»: los que tienen una seña y falta el resto (también los LISTO);
//   - «Últimos cobros»: los últimos 10 que cargó.
// 🔒 Nada de la comisión de THAMES: eso lo ve solo el admin.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiOutlineBanknotes, HiOutlineCamera, HiOutlineCheckCircle } from "react-icons/hi2";

import useDatosVivos from "../../../hooks/useDatosVivos";
import { registrarCobro } from "../../../services/gestoria";
import { Cargando } from "../Piezas";
import { ddmm, plata } from "../gestoriaUtils";
import CobroGestora from "./CobroGestora";
import { useGestora } from "./gestoraContext";
import { BarraTitulo, Seccion, Tarjeta, Vacio } from "./piezas";
import { MONO, TONO_TEXTO, esCobrable, foco, plataDe, porAntiguedad, sinComprobanteDe, suave } from "./gestoraUtils";

// Primero los que ya están en el registro (son los próximos en pasar a LISTO).
const ORDEN = ["EN_REGISTRO", "OBSERVADO", "ASIGNADO", "LISTO"];
const porCercania = (a, b) => ORDEN.indexOf(a.estado) - ORDEN.indexOf(b.estado) || porAntiguedad(a, b);

/** "AE306CD · Transferencia" (o "Licencia de conducir" con el nombre abajo). */
function Titulo({ patente, tipo, conVehiculo }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[15px] leading-snug text-titulo dark:text-titulo-dark">
      {patente && conVehiculo !== false ? (
        <>
          <span className="shrink-0 font-semibold tracking-[0.5px]" style={MONO}>
            {patente}
          </span>
          <span className="text-slate-400" aria-hidden="true">
            ·
          </span>
        </>
      ) : null}
      <span className="truncate font-bold">{tipo}</span>
    </span>
  );
}

/** Un trámite al que le falta plata, con su «Recibí plata». */
function FilaPendiente({ t, onCobrar }) {
  const p = plataDe(t);
  let detalle;
  if (p.precio == null) {
    detalle = <strong className={TONO_TEXTO.ambar}>Falta el precio</strong>;
  } else if (!t.cobros_n) {
    detalle = (
      <>
        Precio {plata(p.precio)} · <strong className={TONO_TEXTO.ambar}>te pagó $ 0</strong>
      </>
    );
  } else {
    detalle = (
      <>
        Te pagó {plata(p.cobrado)} · <strong className={TONO_TEXTO.ambar}>falta {plata(p.falta)}</strong>
      </>
    );
  }
  const quien = t.con_vehiculo === false ? t.persona_nombre : t.patente || t.persona_nombre || t.numero;
  return (
    <div className="flex min-h-[68px] items-center gap-2.5 py-2.5 pl-3.5 pr-3">
      <Link
        to={`/gestoria/tramite/${t.id}`}
        state={{ desde: "cobros" }}
        className={`flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg ${foco}`}
      >
        <Titulo patente={t.patente} tipo={t.tipo_corto || t.tipo} conVehiculo={t.con_vehiculo} />
        {t.con_vehiculo === false && t.persona_nombre ? (
          <span className={`truncate text-[13.5px] ${suave}`}>{t.persona_nombre}</span>
        ) : null}
        <span className={`truncate text-[13.5px] ${suave}`}>{detalle}</span>
      </Link>
      <button
        type="button"
        onClick={() => onCobrar(t)}
        aria-label={`Recibí plata: ${quien}`}
        className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3 text-[14px] font-extrabold text-duo-verde-sombra dark:text-green-400 hover:brightness-95 ${foco}`}
      >
        <HiOutlineCamera className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        Recibí plata
      </button>
    </div>
  );
}

export default function CobrosGestora() {
  // Lo de «Cobros» queda guardado en AppGestora: al volver a la pestaña ya está (y se actualiza).
  const { lista, cargar, cobros: datos, errorCobros: error, cargarCobros: pedir } = useGestora();
  // El trámite al que se le carga un cobro (queda guardado mientras se cierra la ventanita).
  const [cobro, setCobro] = useState({ t: null, abierto: false });

  useEffect(() => {
    pedir?.();
  }, [pedir]);
  useDatosVivos(["gestoria"], () => pedir?.());

  const sinComp = useMemo(() => sinComprobanteDe(lista).sort(porCercania), [lista]);
  const parciales = useMemo(
    () =>
      (lista || [])
        .filter((t) => {
          if (!esCobrable(t, true) || !t.cobros_n) return false;
          const p = plataDe(t);
          return p.falta != null && p.falta > 0;
        })
        .sort(porCercania),
    [lista]
  );

  const guardarCobro = async (body) => {
    const t = cobro.t;
    const r = await registrarCobro(t.id, body);
    setCobro((c) => ({ ...c, abierto: false }));
    if (r?.aviso) toast.error(r.aviso, { duration: 7000 });
    else toast.success("Listo: quedó el comprobante del cobro");
    cargar?.();
    pedir?.();
  };

  let resumen;
  if (!datos) {
    resumen = error ? (
      <p role="alert" className="rounded-2xl border border-duo-rojo/40 bg-card dark:bg-card-dark p-4 text-[15px] text-duo-rojo dark:text-red-400">
        {error}
      </p>
    ) : (
      <Cargando alto="h-[104px]" />
    );
  } else {
    resumen = (
      <Tarjeta className="p-4">
        <div className="flex items-center gap-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={`text-[13.5px] font-bold ${suave}`}>Te pagaron en {datos.mes_nombre}</span>
            <span className="text-[32px] font-extrabold leading-tight tracking-[-0.5px] text-titulo dark:text-titulo-dark" style={{ fontVariantNumeric: "tabular-nums" }}>
              {plata(datos.total_mes)}
            </span>
            <span className={`text-[13.5px] ${suave}`}>
              {datos.n_mes === 1 ? "1 cobro con comprobante" : `${datos.n_mes} cobros con comprobante`}
            </span>
          </div>
          <span
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-green-400"
            aria-hidden="true"
          >
            <HiOutlineBanknotes className="h-[26px] w-[26px]" strokeWidth={2} />
          </span>
        </div>
      </Tarjeta>
    );
  }

  const ultimos = datos?.ultimos || [];

  return (
    <>
      <BarraTitulo titulo="Cobros" />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-[18px] px-4 pb-4 pt-4">
        {resumen}

        {!lista ? (
          <Cargando alto="h-40" />
        ) : sinComp.length > 0 ? (
          <Seccion titulo="Falta el comprobante" n={sinComp.length} bajada="Sin esto no pasan a LISTO.">
            <Tarjeta lista>
              {sinComp.map((t) => (
                <FilaPendiente key={t.id} t={t} onCobrar={(x) => setCobro({ t: x, abierto: true })} />
              ))}
            </Tarjeta>
          </Seccion>
        ) : (
          <Vacio titulo="Todos tienen su comprobante" texto="Cada vez que un cliente te pague, cargalo desde el trámite o desde acá." />
        )}

        {parciales.length > 0 && (
          <Seccion titulo="Te pagaron una parte" n={parciales.length}>
            <Tarjeta lista>
              {parciales.map((t) => (
                <FilaPendiente key={t.id} t={t} onCobrar={(x) => setCobro({ t: x, abierto: true })} />
              ))}
            </Tarjeta>
          </Seccion>
        )}

        {ultimos.length > 0 && (
          <Seccion titulo="Últimos cobros">
            <Tarjeta lista>
              {ultimos.map((c) => (
                <Link
                  key={c.id}
                  to={`/gestoria/tramite/${c.tramite}`}
                  state={{ desde: "cobros" }}
                  className={`flex min-h-[64px] items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Titulo patente={c.patente} tipo={c.tipo_corto} conVehiculo={c.con_vehiculo} />
                    <span className={`truncate text-[13.5px] ${suave}`}>
                      {ddmm(c.fecha)}
                      {c.con_vehiculo === false && c.persona_nombre ? ` · ${c.persona_nombre}` : ""} · con comprobante
                    </span>
                  </span>
                  <span className={`flex shrink-0 items-center gap-1.5 text-[15px] font-extrabold ${TONO_TEXTO.verde}`}>
                    {plata(c.monto)}
                    <HiOutlineCheckCircle className="h-[19px] w-[19px]" strokeWidth={2} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </Tarjeta>
          </Seccion>
        )}

        <p className={`px-0.5 text-center text-[13px] ${suave}`}>Lo ven solo vos y la administración de THAMES.</p>
      </main>

      <CobroGestora t={cobro.t} abierto={cobro.abierto} onCerrar={() => setCobro((c) => ({ ...c, abierto: false }))} onGuardar={guardarCobro} />
    </>
  );
}
