// src/components/legales/abogado/PlataAbogado.jsx
//
// 💵 «Plata» de la app del abogado (05/10): sus honorarios y lo que le corresponde a THAMES.
//   - Arriba: lo que le debe a THAMES de comisión y el botón «Ya pagué: subir comprobante».
//   - Los casos que ya se cobraron y todavía no cargó cuánto fue (también los que ya cerró).
//   - Todos sus casos abiertos con lo pactado, lo cobrado y la comisión.
// La comisión es solo de los casos que le pasó una oficina: los casos PROPIOS no pagan.
// 🔒 Esto lo ven él y el admin. La oficina y el cliente, nunca.
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { HiOutlineArrowUpTray, HiOutlineBanknotes, HiOutlineCheckCircle, HiOutlineChevronRight } from "react-icons/hi2";

import { avisarPago, cargarHonorarios, editarCaso, listarCerrados, mensajeError, pedirCaso, subirArchivo } from "../../../services/legales";
import { Cargando } from "../../gestoria/Piezas";
import { ModalHonorarios } from "../ModalesCaso";
import { fmtPct, plata } from "../legalesUtils";
import { useAbogado } from "./abogadoContext";
import { MONO, caratulaCorta, foco, suave } from "./abogadoUtils";
import { BarraTitulo, CabeceraTarjeta, Tarjeta, Vacio } from "./piezasAbogado";

function FilaPlata({ e, onAbrir }) {
  const hon = e.honorarios != null ? Number(e.honorarios) : null;
  const pct = Number(e.comision_pct || 0);
  const com = hon != null && pct > 0 ? Math.round((hon * pct) / 100) : null;
  return (
    <button type="button" onClick={onAbrir} className={`flex min-h-[64px] w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-bold text-titulo dark:text-titulo-dark">{caratulaCorta(e)}</span>
        <span className={`truncate text-[13px] ${suave}`}>
          {[e.honorarios_pactados || "Sin pactar", e.propio ? "caso propio" : pct > 0 ? `THAMES ${fmtPct(pct)}` : ""].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        {hon != null ? (
          <>
            <span className="text-[15px] font-bold text-titulo dark:text-titulo-dark" style={MONO}>
              {plata(hon)}
            </span>
            {com ? (
              <span className={`text-[12.5px] ${e.comision_cobrada ? suave : "font-bold text-duo-violeta-sombra dark:text-[#a5a0ff]"}`}>
                {e.comision_cobrada ? "comisión pagada" : `comisión ${plata(com)}`}
              </span>
            ) : null}
          </>
        ) : (
          <span className={`text-[14px] font-extrabold ${e.sin_honorarios ? "text-duo-amarillo-sombra dark:text-amber-300" : "text-duo-violeta-sombra dark:text-[#a5a0ff]"}`}>Cargar</span>
        )}
      </span>
      <HiOutlineChevronRight className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );
}

export default function PlataAbogado() {
  const { casos, res, error, cargar } = useAbogado();
  const [modal, setModal] = useState(null); // el caso (con su detalle) al que se le cargan honorarios
  const [subiendo, setSubiendo] = useState(false);
  const lista = useMemo(() => casos || [], [casos]);
  // Los casos ya CERRADOS a los que les falta cargar los honorarios no están entre
  // los abiertos: se piden aparte (si no, el aviso del Inicio traía a una pantalla vacía).
  const [cerradosSin, setCerradosSin] = useState([]);
  const faltan = Number(res?.sin_honorarios || 0);
  const abiertosSin = lista.filter((e) => e.sin_honorarios).length;
  useEffect(() => {
    let vivo = true;
    if (faltan <= abiertosSin) {
      setCerradosSin([]);
      return undefined;
    }
    listarCerrados(1, { sin_honorarios: 1 })
      .then((r) => vivo && setCerradosSin((r?.results || []).filter((e) => e.sin_honorarios)))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [faltan, abiertosSin]);
  const sinCargar = [...lista.filter((e) => e.sin_honorarios), ...cerradosSin];
  const resto = lista.filter((e) => !e.sin_honorarios);
  const cobrado = lista.reduce((s, e) => s + (e.honorarios != null ? Number(e.honorarios) : 0), 0);
  const debe = Number(res?.comisiones_a_cobrar || 0);
  const avisos = res?.avisos_pago || [];

  const abrir = async (e) => {
    try {
      setModal(await pedirCaso(e.id));
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo abrir el caso."));
    }
  };
  const yaPague = async (file) => {
    if (!file || subiendo) return;
    setSubiendo(true);
    try {
      const arch = await subirArchivo(file, "legales/comprobantes");
      await avisarPago(arch);
      toast.success("¡Gracias! THAMES lo va a confirmar.");
      cargar();
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo subir el comprobante."));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <>
      <BarraTitulo titulo="Plata" />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3.5 px-4 pb-4 pt-3.5">
        {error && !casos ? <p className="rounded-xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-rojo dark:text-red-300">{error}</p> : null}
        {!casos || !res ? (
          <>
            <Cargando alto="h-32" />
            <Cargando alto="h-56" />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3.5">
                <span className={`text-[13px] font-semibold ${suave}`}>Honorarios cargados</span>
                <strong className="text-[22px] font-extrabold leading-tight text-titulo dark:text-titulo-dark" style={MONO}>
                  {plata(cobrado)}
                </strong>
                <span className={`text-[12.5px] ${suave}`}>en tus casos abiertos</span>
              </div>
              <div className={`flex flex-col gap-0.5 rounded-2xl p-3.5 ${debe > 0 ? "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]" : "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark"}`}>
                <span className={`text-[13px] font-semibold ${suave}`}>Le debés a THAMES</span>
                <strong className={`text-[22px] font-extrabold leading-tight ${debe > 0 ? "text-duo-violeta-sombra dark:text-[#a5a0ff]" : "text-titulo dark:text-titulo-dark"}`} style={MONO}>
                  {plata(debe)}
                </strong>
                <span className={`text-[12.5px] ${suave}`}>{Number(res.comision_pct || 0) > 0 ? `${fmtPct(res.comision_pct)} de lo que cobrás` : "sin comisión"}</span>
              </div>
            </div>

            {debe > 0 ? (
              avisos.length ? (
                <p className="flex items-center gap-2 rounded-xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3.5 py-3 text-[14.5px] font-semibold text-duo-verde-sombra dark:text-green-400">
                  <HiOutlineCheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> Mandaste el comprobante: falta que THAMES lo confirme.
                </p>
              ) : (
                <label className={`inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-duo-verde-sombra hover:bg-[#166534] px-4 text-[16px] font-extrabold text-white ${subiendo ? "pointer-events-none opacity-60" : ""}`}>
                  <HiOutlineArrowUpTray className="h-[22px] w-[22px]" strokeWidth={2.2} aria-hidden="true" />
                  {subiendo ? "Subiendo…" : "Ya pagué: subir comprobante"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    disabled={subiendo}
                    onChange={(ev) => {
                      yaPague(ev.target.files?.[0]);
                      ev.target.value = "";
                    }}
                  />
                </label>
              )
            ) : null}

            {sinCargar.length ? (
              <Tarjeta className="!border-duo-amarillo/50">
                <CabeceraTarjeta titulo={<span className="text-duo-amarillo-sombra dark:text-amber-300">Ya se cobraron: falta cargar cuánto</span>} n={sinCargar.length} />
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 pt-1">
                  {sinCargar.map((e) => (
                    <FilaPlata key={e.id} e={e} onAbrir={() => abrir(e)} />
                  ))}
                </div>
              </Tarjeta>
            ) : null}

            {resto.length ? (
              <Tarjeta>
                <CabeceraTarjeta titulo="Tus casos" n={resto.length} />
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 pt-1">
                  {resto.map((e) => (
                    <FilaPlata key={e.id} e={e} onAbrir={() => abrir(e)} />
                  ))}
                </div>
              </Tarjeta>
            ) : !sinCargar.length ? (
              <Vacio icono={HiOutlineBanknotes} tono="violeta" titulo="Todavía no hay nada" texto="Cuando tengas casos, acá cargás lo que pactaste y lo que cobraste en cada uno." />
            ) : null}

            <p className={`px-1 text-[13px] ${suave}`}>
              La comisión de THAMES es solo en los casos que te pasó una oficina. En los casos propios no hay comisión. Esto lo ves vos y el administrador.
            </p>
          </>
        )}
      </main>

      <ModalHonorarios
        e={modal}
        abierto={!!modal}
        onCerrar={() => setModal(null)}
        onGuardar={async (body, pactado) => {
          await cargarHonorarios(modal.id, body);
          if (pactado !== null && pactado !== undefined) await editarCaso(modal.id, { honorarios_pactados: pactado });
          toast.success("Honorarios guardados");
          setModal(null);
          cargar();
        }}
      />
    </>
  );
}
