// src/components/gestoria/MisTramites.jsx
//
// 👷 Lo que ve el GESTOR cuando entra con su usuario (pensado para el celu):
//   - sus trámites abiertos, agrupados: para presentar, en el registro,
//     observados y listos;
//   - un botón grande para avanzar cada uno ("Lo presenté en el registro",
//     "Está LISTO", "Observado"...);
//   - el precio que le cobra al cliente (lo carga él; sin precio no pasa a LISTO);
//   - lo que le debe a THAMES de comisiones y "Ya pagué: subir comprobante";
//     🎚️ esas dos cosas, SOLO con las comisiones prendidas (hoy apagadas: pasa
//     a LISTO directo y no ve nada de plata);
//   - "Tus datos": su foto y su contacto, tal como los ve la oficina (los
//     carga el admin; si algo está mal, le avisa a THAMES).
//   - ➕ "Nuevo trámite" (29/09): carga uno él mismo; queda con él y le aparece a
//     la oficina de THAMES que elija (donde lo retira el cliente).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiCheck, HiChevronDown, HiDocumentText, HiPlus } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
import {
  avisarPago,
  cambiarEstado,
  cargarPrecio,
  guardarDocumento,
  listarAbiertos,
  mensajeError,
  pedirResumen,
  subirArchivo,
} from "../../services/gestoria";
import Boton3D from "../ui/Boton3D";
import { Avatar, BotonArchivo, Cargando, Demorado, DiasChip } from "./Piezas";
import { ModalObservar, ModalPrecio } from "./ModalesTramite";
import { ddmm, diasEnEstado, esDemorado, fmtPct, plata, textoDias, tipoCorto } from "./gestoriaUtils";

const GRUPOS = [
  ["ASIGNADO", "Para presentar", "text-duo-azul"],
  ["EN_REGISTRO", "En el registro", "text-indigo-600 dark:text-indigo-400"],
  ["OBSERVADO", "Observados", "text-orange-600 dark:text-orange-400"],
  ["LISTO", "Listos (esperando que lo retiren)", "text-duo-verde-sombra dark:text-duo-verde"],
];

const btn = "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-white transition-colors disabled:opacity-50";

export default function MisTramites() {
  const navigate = useNavigate();
  const { catalogo } = useGestoria();
  // Qué se le dice al gestor cuando lo pasa a LISTO (según cómo esté el aviso al cliente).
  const avisoListo = !catalogo?.aviso_cliente
    ? "¡Listo! Ya le aparece a la oficina para entregarlo."
    : catalogo?.whatsapp_auto
      ? "¡Listo! Al cliente le llega un WhatsApp."
      : "¡Listo! La oficina le avisa al cliente.";
  const [lista, setLista] = useState(null);
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // {tipo, t, luegoListo}
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([listarAbiertos(), pedirResumen()]);
      setLista(l);
      setRes(r);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar tus trámites."));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useDatosVivos(["gestoria"], () => cargar());

  const avanzar = async (t, nuevo) => {
    // t.ve_plata lo manda el servidor en cada trámite (false con las comisiones apagadas).
    if (t.ve_plata && nuevo === "LISTO" && t.precio_gestoria == null) {
      setModal({ tipo: "precio", t, luegoListo: true });
      return;
    }
    setOcupado(true);
    try {
      await cambiarEstado(t.id, { estado: nuevo });
      toast.success(nuevo === "LISTO" ? avisoListo : "Guardado");
      await cargar();
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const subirPapel = async (t, file) => {
    try {
      const arch = await subirArchivo(file, "gestoria/papeles");
      await guardarDocumento(t.id, { ...arch, tipo: "PAPEL" });
      toast.success(`Subido: ${arch.nombre}`);
      cargar();
    } catch (e) {
      toast.error(e?.response ? mensajeError(e) : e?.message || "No se pudo subir.");
    }
  };

  const yaPague = async (file) => {
    try {
      const arch = await subirArchivo(file, "gestoria/comisiones");
      const a = await avisarPago(arch);
      toast.success(`Listo: le avisamos a THAMES que pagaste ${plata(a.monto)}. Cuando lo confirmen, se descuenta.`);
      cargar();
    } catch (e) {
      toast.error(e?.response ? mensajeError(e) : e?.message || "No se pudo subir.");
    }
  };

  // El trámite que se le pasa a la ventanita del precio (fijo mientras está abierta).
  const tPrecio = useMemo(
    () => (modal?.tipo === "precio" ? { ...modal.t, acciones: { es_gestor: true, puede_pct: false } } : null),
    [modal]
  );

  if (error && !lista) return <p className="rounded-xl border border-duo-rojo/40 p-4 text-[14px] text-duo-rojo">{error}</p>;
  if (!lista || !res) {
    return (
      <div className="flex flex-col gap-3">
        <Cargando alto="h-16" />
        <Cargando alto="h-40" />
      </div>
    );
  }

  const nombre = String(res.gestor_nombre || "").split(" ")[0] || "";
  const pct = Number(res.comision_pct || 0);
  const deuda = Number(res.comisiones_a_cobrar || 0);
  const avisos = res.avisos_pago || [];
  const ultimo = avisos[avisos.length - 1];
  const perfil = res.perfil || null;

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {perfil && <Avatar id={perfil.id} nombre={perfil.nombre} foto={perfil.foto_url} size={52} />}
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-2xl font-bold text-titulo dark:text-titulo-dark">Hola{nombre ? `, ${nombre}` : ""}</h1>
            <span className="text-[14px] text-suave dark:text-suave-dark">
              Tenés {lista.length} trámite{lista.length === 1 ? "" : "s"} abierto{lista.length === 1 ? "" : "s"}. Tocá el botón cuando avanzás.
            </span>
          </div>
        </div>
        <Boton3D variant="violeta" onClick={() => navigate("/gestoria/nuevo")} className="w-full sm:w-auto shrink-0">
          <HiPlus className="w-4 h-4" /> Nuevo trámite
        </Boton3D>
      </div>

      {perfil && <TusDatos p={perfil} />}

      {res.sin_precio > 0 && (
        <div className="rounded-xl border border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-[14px] text-orange-700 dark:text-orange-300">
          <strong>Te falta cargar el precio de {res.sin_precio} trámite{res.sin_precio > 1 ? "s" : ""}.</strong> Sin precio no se pueden pasar a LISTO.
        </div>
      )}

      {pct > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-4 py-3">
            <span className="text-[14px] text-duo-amarillo-sombra dark:text-duo-amarillo">Comisiones pendientes con THAMES ({fmtPct(pct)})</span>
            <strong className="text-xl whitespace-nowrap text-duo-amarillo-sombra dark:text-duo-amarillo">{plata(deuda)}</strong>
          </div>
          {(ultimo || deuda > 0) && (
            <div className="flex flex-wrap items-center gap-2.5">
              {ultimo && (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-duo-azul">
                  <HiCheck className="w-4 h-4" /> Avisaste que pagaste {plata(ultimo.monto)} el {ddmm(ultimo.fecha)}. Falta que THAMES lo confirme.
                </span>
              )}
              {deuda > 0 && <BotonArchivo onElegir={yaPague}>Ya pagué: subir comprobante</BotonArchivo>}
            </div>
          )}
        </div>
      )}

      {GRUPOS.map(([estado, titulo, color]) => {
        const ts = lista.filter((t) => t.estado === estado).sort((a, b) => diasEnEstado(b) - diasEnEstado(a));
        return (
          <section key={estado} className="flex flex-col gap-2">
            <h2 className={`text-[15px] font-bold ${color}`}>
              {titulo} · {ts.length}
            </h2>
            {!ts.length ? (
              <p className="text-[13px] text-suave dark:text-suave-dark">Nada por acá.</p>
            ) : (
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
                {ts.map((t) => (
                  <TarjetaGestor
                    key={t.id}
                    t={t}
                    ocupado={ocupado}
                    onAvanzar={(n) => avanzar(t, n)}
                    onObservar={() => setModal({ tipo: "observar", t })}
                    onPrecio={() => setModal({ tipo: "precio", t, luegoListo: false })}
                    onSubirPapel={(f) => subirPapel(t, f)}
                    onAbrir={() => navigate(`/gestoria/tramite/${t.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <ModalPrecio
        t={tPrecio}
        abierto={modal?.tipo === "precio"}
        luegoListo={!!modal?.luegoListo}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          await cargarPrecio(modal.t.id, body);
          setModal(null);
          toast.success(body.pasar_a_listo ? avisoListo : "Precio guardado");
          cargar();
        }}
      />
      <ModalObservar
        abierto={modal?.tipo === "observar"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          await cambiarEstado(modal.t.id, body);
          setModal(null);
          toast.success("Marcado como observado");
          cargar();
        }}
      />
    </div>
  );
}

function TarjetaGestor({ t, ocupado, onAvanzar, onObservar, onPrecio, onSubirPapel, onAbrir }) {
  const d = diasEnEstado(t);
  const dem = esDemorado(t);
  const borde = t.estado === "OBSERVADO" ? "border-orange-300 dark:border-orange-500/40" : t.estado === "LISTO" ? "border-duo-verde/40" : "border-linea dark:border-linea-dark";
  return (
    <article className={`flex flex-col gap-2.5 rounded-xl border bg-card dark:bg-card-dark p-3.5 shadow-sm ${borde}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-duo-violeta">{tipoCorto(t)}</span>
        <DiasChip dias={d} texto={textoDias(d)} />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {t.patente ? (
          <strong className="font-mono text-lg tracking-wide text-titulo dark:text-titulo-dark">{t.patente}</strong>
        ) : (
          <span className="text-[14px] font-semibold text-suave dark:text-suave-dark">Sin patente</span>
        )}
        <span className="text-[13px] text-suave dark:text-suave-dark">{t.vehiculo}</span>
        {dem && <span className="ml-auto self-center"><Demorado /></span>}
      </div>
      <span className="text-[13px] text-titulo dark:text-titulo-dark">
        {t.persona_nombre} · oficina {t.oficina_nombre || "—"}
      </span>
      {t.estado === "OBSERVADO" && t.falta && (
        <span className="rounded-md bg-orange-50 dark:bg-orange-500/10 px-2 py-1 text-[13px] font-medium text-orange-700 dark:text-orange-300">Falta: {t.falta}</span>
      )}
      {t.cliente_subio_papeles && (
        <span className="self-start inline-flex items-center gap-1 rounded-md border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-0.5 text-[12px] font-bold text-duo-azul">
          <HiDocumentText className="w-3.5 h-3.5" /> El cliente subió papeles
        </span>
      )}
      {t.ve_plata &&
        (t.precio_gestoria == null ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-md border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-2 py-0.5 text-[12px] font-bold text-duo-amarillo-sombra dark:text-duo-amarillo">Falta el precio</span>
            <button type="button" onClick={onPrecio} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              Cargar precio
            </button>
          </div>
        ) : (
          <span className="text-[13px] text-suave dark:text-suave-dark">
            Precio al cliente: <strong className="text-titulo dark:text-titulo-dark">{plata(t.precio_gestoria)}</strong> ·{" "}
            <button type="button" onClick={onPrecio} className="font-semibold text-duo-violeta hover:underline">cambiar</button>
          </span>
        ))}

      {t.estado === "ASIGNADO" && (
        <button type="button" disabled={ocupado} onClick={() => onAvanzar("EN_REGISTRO")} className={`${btn} w-full bg-indigo-600 hover:bg-indigo-700`}>
          Lo presenté en el registro
        </button>
      )}
      {t.estado === "EN_REGISTRO" && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("LISTO")} className={`${btn} bg-duo-verde hover:bg-duo-verde-sombra`}>
            Está LISTO
          </button>
          <button type="button" disabled={ocupado} onClick={onObservar} className={`${btn} bg-orange-600 hover:bg-orange-700`}>
            Observado
          </button>
        </div>
      )}
      {t.estado === "OBSERVADO" && (
        <div className="grid grid-cols-2 gap-2">
          <BotonArchivo onElegir={onSubirPapel} size="md" full accept="image/*,application/pdf">
            Subir papel
          </BotonArchivo>
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("EN_REGISTRO")} className={`${btn} bg-indigo-600 hover:bg-indigo-700`}>
            Lo presenté otra vez
          </button>
        </div>
      )}
      {t.estado === "LISTO" && (
        <span className="text-[13px] text-duo-verde-sombra dark:text-duo-verde">Esperando que el cliente lo retire en {t.oficina_nombre || "la oficina"}.</span>
      )}
      <button type="button" onClick={onAbrir} className="self-start text-[13px] font-semibold text-duo-violeta hover:underline">
        Ver papeles e historial ({t.papeles_ok}/{t.papeles_total})
      </button>
    </article>
  );
}

/** "Tus datos": su foto y su contacto, tal como los ve la oficina (los carga el admin). */
function TusDatos({ p }) {
  const filas = [
    ["WhatsApp", p.telefono],
    ["Email", p.email],
    ["Dirección", p.direccion],
    ["Horario", p.horario],
  ];
  const faltan = filas.filter(([, v]) => !v).length;
  return (
    <details className="group rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[14px] font-semibold text-titulo dark:text-titulo-dark [&::-webkit-details-marker]:hidden">
        <span>
          Tus datos
          {faltan ? <span className="font-normal text-suave dark:text-suave-dark"> · faltan {faltan}</span> : null}
        </span>
        <HiChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        {filas.map(([k, v]) => (
          <div key={k} className="flex flex-col min-w-0">
            <dt className="text-suave dark:text-suave-dark">{k}</dt>
            <dd className="font-semibold text-titulo dark:text-titulo-dark break-words">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12px] text-suave dark:text-suave-dark">
        Así te ve la oficina de THAMES. Si algo está mal (o querés cambiar la foto), avisales y lo actualizan.
      </p>
    </details>
  );
}
