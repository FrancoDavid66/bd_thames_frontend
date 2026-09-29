// src/components/gestoria/MisTramites.jsx
//
// 👷 Lo que ve el GESTOR cuando entra con su usuario (pensado para el celu).
// Rediseño 29/09 (Franco: "hay mucha información y no se entiende"):
//   - arriba: "Hola, Laura", cuántos tiene para hacer y ➕ «Nuevo trámite»
//     (lo carga él; queda con él y le aparece a la oficina de THAMES que elija);
//   - 3 pestañas: «Para hacer» (primero los observados, después los que tiene
//     que presentar), «En el registro» y «Listos» (esperando que los retiren);
//   - cada trámite en una tarjeta corta: en qué está y hace cuánto, la patente
//     (o el nombre, si es la licencia de conducir), el cliente y la oficina, y
//     EL botón de lo que le toca ("Lo presenté en el registro", "Está LISTO",
//     "Observado", "Lo presenté otra vez") + «Ver» para abrir el trámite;
//   - 💵 con las comisiones prendidas: en cada tarjeta, el precio y cuánto le pagó
//     el cliente, con «Recibí plata» (monto + foto del comprobante). Sin al menos un
//     comprobante no pasa a LISTO. 🔒 La comisión de THAMES (%, lo que debe, "Ya
//     pagué") NO la ve: es solo del admin (Franco 29/09);
//   - "Tus datos" (su foto y su contacto, como los ve la oficina) al final.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiCamera, HiChevronDown, HiDocumentText, HiPlus } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
import { cambiarEstado, cargarPrecio, listarAbiertos, mensajeError, pedirResumen, registrarCobro } from "../../services/gestoria";
import { Avatar, Cargando } from "./Piezas";
import { ModalCobro, ModalObservar, ModalPrecio } from "./ModalesTramite";
import { ESTADO_GESTOR, diasEnEstado, esDemorado, plata, textoDias, textoListoGestor, tipoCorto } from "./gestoriaUtils";

const suave = "text-suave dark:text-suave-dark";

// Las 3 pestañas: qué estados entran en cada una (en ese orden) y qué decir si está vacía.
const PESTANAS = [
  { id: "hacer", label: "Para hacer", estados: ["OBSERVADO", "ASIGNADO"], vacio: "Nada para hacer por ahora." },
  { id: "registro", label: "En el registro", estados: ["EN_REGISTRO"], vacio: "No tenés trámites esperando en el registro." },
  { id: "listos", label: "Listos", estados: ["LISTO"], vacio: "No hay trámites listos esperando que los retiren." },
];

// "Hola, Laura" (el primer nombre); si es una gestoría ("Gestoría Sur"), el nombre entero.
const GENERICOS = /^(gestor[ií]a|gestor|estudio|escriban[ií]a|agencia|registro)$/i;
function saludo(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  return GENERICOS.test(partes[0]) ? partes.join(" ") : partes[0];
}

const btnBase =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 text-[15px] font-bold text-white transition-colors active:scale-[0.99] disabled:opacity-50";
const BTN = {
  violeta: `${btnBase} bg-duo-violeta hover:bg-duo-violeta-sombra`,
  verde: `${btnBase} bg-duo-verde hover:bg-duo-verde-sombra`,
  naranja: `${btnBase} bg-orange-600 hover:bg-orange-700`,
};

export default function MisTramites() {
  const navigate = useNavigate();
  const { catalogo, tabGestor, setTabGestor } = useGestoria();
  const avisoListo = textoListoGestor(catalogo);
  const [tabLocal, setTabLocal] = useState("hacer");
  const tab = tabGestor || tabLocal;
  const setTab = setTabGestor || setTabLocal;
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

  // Los trámites de cada pestaña: por estado (en el orden de la pestaña) y los más viejos primero.
  const porPestana = useMemo(() => {
    const out = {};
    PESTANAS.forEach((p) => {
      out[p.id] = (lista || [])
        .filter((t) => p.estados.includes(t.estado))
        .sort((a, b) => p.estados.indexOf(a.estado) - p.estados.indexOf(b.estado) || diasEnEstado(b) - diasEnEstado(a));
    });
    return out;
  }, [lista]);

  const avanzar = async (t, nuevo) => {
    // t.ve_plata lo manda el servidor en cada trámite (false con las comisiones apagadas).
    // 💵 Para LISTO: al menos un comprobante de cobro (y el precio): se piden en la ventanita.
    if (t.ve_plata && nuevo === "LISTO" && !t.cobros_n) {
      setModal({ tipo: "cobro", t, luegoListo: true });
      return;
    }
    if (t.ve_plata && nuevo === "LISTO" && t.precio_gestoria == null) {
      setModal({ tipo: "precio", t, luegoListo: true });
      return;
    }
    setOcupado(true);
    try {
      await cambiarEstado(t.id, { estado: nuevo });
      toast.success(nuevo === "LISTO" ? avisoListo : nuevo === "EN_REGISTRO" ? "Pasó a «En el registro»" : "Guardado");
      await cargar();
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  };

  // El trámite que se le pasa a las ventanitas del precio y del cobro (fijo mientras están abiertas).
  const tModal = useMemo(
    () => (modal?.tipo === "precio" || modal?.tipo === "cobro" ? { ...modal.t, acciones: { es_gestor: true, puede_pct: false } } : null),
    [modal]
  );

  if (error && !lista) return <p className="max-w-5xl mx-auto rounded-2xl border border-duo-rojo/40 p-4 text-[15px] text-duo-rojo">{error}</p>;
  if (!lista || !res) {
    return (
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-3">
        <Cargando alto="h-20" />
        <Cargando alto="h-12" />
        <Cargando alto="h-40" />
      </div>
    );
  }

  const nombre = saludo(res.gestor_nombre);
  const perfil = res.perfil || null;
  const puedeCargar = !!catalogo?.gestor; // sin ficha de gestor no puede cargar
  const nHacer = porPestana.hacer.length;
  const pestana = PESTANAS.find((p) => p.id === tab) || PESTANAS[0];
  const ts = porPestana[pestana.id] || [];

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
      {/* Hola + Nuevo trámite */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {perfil && <Avatar id={perfil.id} nombre={perfil.nombre} foto={perfil.foto_url} size={48} />}
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="text-[26px] leading-tight font-extrabold tracking-tight text-titulo dark:text-titulo-dark">Hola{nombre ? `, ${nombre}` : ""}</h1>
            <p className={`text-[15px] ${suave}`}>
              {nHacer ? (
                <>
                  Tenés <strong className="text-titulo dark:text-titulo-dark">{nHacer} para hacer</strong>.
                </>
              ) : (
                "No tenés nada pendiente."
              )}
            </p>
          </div>
        </div>
        {puedeCargar && (
          <button
            type="button"
            onClick={() => navigate("/gestoria/nuevo")}
            className="inline-flex min-h-[52px] w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-duo-violeta hover:bg-duo-violeta-sombra px-5 text-[16px] font-bold text-white active:scale-[0.99]"
          >
            <HiPlus className="w-5 h-5" aria-hidden="true" /> Nuevo trámite
          </button>
        )}
      </div>

      {/* 💵 Solo con las comisiones prendidas (la comisión en sí la ve solo el admin) */}
      {res.sin_precio > 0 && (
        <div className="rounded-2xl border border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-[14px] text-orange-700 dark:text-orange-300">
          <strong>
            Te falta cargar el precio de {res.sin_precio} trámite{res.sin_precio > 1 ? "s" : ""}.
          </strong>{" "}
          Sin el precio y el comprobante de lo que te pagó el cliente, no pasan a LISTO.
        </div>
      )}
      {/* Pestañas */}
      <div
        role="tablist"
        aria-label="Mis trámites"
        className="grid grid-cols-3 gap-1 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1 sm:max-w-xl"
      >
        {PESTANAS.map((p) => {
          const on = p.id === pestana.id;
          const n = porPestana[p.id].length;
          const hayObservados = p.id === "hacer" && porPestana.hacer.some((t) => t.estado === "OBSERVADO");
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`tab-${p.id}`}
              aria-selected={on}
              aria-controls="panel-mis-tramites"
              onClick={() => setTab(p.id)}
              className={`min-h-[46px] rounded-lg px-1.5 text-[13px] sm:text-[14px] leading-tight font-bold transition-colors ${
                on
                  ? "bg-titulo text-white dark:bg-titulo-dark dark:text-slate-900"
                  : "text-suave dark:text-slate-300 hover:text-titulo dark:hover:text-titulo-dark"
              }`}
            >
              {p.label}{" "}
              <span className={hayObservados && !on ? "text-orange-600 dark:text-orange-300" : ""}>· {n}</span>
            </button>
          );
        })}
      </div>

      {/* Las tarjetas de la pestaña */}
      <div id="panel-mis-tramites" role="tabpanel" aria-labelledby={`tab-${pestana.id}`}>
        {!ts.length ? (
          <p className={`rounded-2xl border border-dashed border-linea dark:border-linea-dark px-4 py-8 text-center text-[15px] ${suave}`}>{pestana.vacio}</p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
            {ts.map((t) => (
              <TarjetaGestor
                key={t.id}
                t={t}
                ocupado={ocupado}
                onAvanzar={(n) => avanzar(t, n)}
                onObservar={() => setModal({ tipo: "observar", t })}
                onCobro={() => setModal({ tipo: "cobro", t, luegoListo: false })}
                onAbrir={() => navigate(`/gestoria/tramite/${t.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {perfil && <TusDatos p={perfil} />}

      <ModalCobro
        t={tModal}
        abierto={modal?.tipo === "cobro"}
        luegoListo={!!modal?.luegoListo}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const r = await registrarCobro(modal.t.id, body);
          setModal(null);
          // aviso = se guardó el cobro pero justo no pudo pasar a LISTO (ej: lo marcaron observado).
          if (r?.aviso) toast.error(r.aviso, { duration: 7000 });
          else toast.success(body.pasar_a_listo ? avisoListo : "Listo: quedó el comprobante del cobro");
          cargar();
        }}
      />
      <ModalPrecio
        t={tModal}
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

/** Un trámite, corto: en qué está, de quién es y EL botón de lo que le toca. */
function TarjetaGestor({ t, ocupado, onAvanzar, onObservar, onCobro, onAbrir }) {
  const e = ESTADO_GESTOR[t.estado] || ESTADO_GESTOR.RECIBIDO;
  const d = diasEnEstado(t);
  const dem = esDemorado(t);
  const persona = t.con_vehiculo === false; // 🪪 licencia de conducir: va el nombre en grande
  const colorDias = dem ? "font-bold text-duo-rojo" : d >= 4 ? "text-duo-amarillo-sombra dark:text-amber-300" : suave;
  const borde = t.estado === "OBSERVADO" ? "border-orange-300 dark:border-orange-500/50" : "border-linea dark:border-linea-dark";
  const quien = [!persona && t.persona_nombre, t.oficina_nombre, t.cargado_por_gestor && "lo cargaste vos"].filter(Boolean).join(" · ");
  // Para el lector de pantalla: cada botón dice de qué trámite es.
  const ident = persona ? t.persona_nombre : t.patente || t.persona_nombre || t.numero;
  const botonVer = (
    <button
      type="button"
      onClick={onAbrir}
      className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-linea dark:border-linea-dark px-4 text-[15px] font-bold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
      aria-label={`Ver el trámite ${t.numero}`}
    >
      Ver
    </button>
  );

  return (
    <article className={`flex flex-col gap-2.5 rounded-2xl border bg-card dark:bg-card-dark p-3.5 shadow-sm ${borde}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`min-w-0 truncate text-[13px] font-bold ${e.texto}`}>
          {e.txt} · {tipoCorto(t)}
        </span>
        <span className={`shrink-0 text-[12px] ${colorDias}`}>{dem ? `${textoDias(d)} · demorado` : textoDias(d)}</span>
      </div>

      <button type="button" onClick={onAbrir} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left">
        {persona ? (
          <strong className="text-[18px] text-titulo dark:text-titulo-dark">{t.persona_nombre}</strong>
        ) : t.patente ? (
          <strong className="font-mono text-[18px] tracking-wide text-titulo dark:text-titulo-dark">{t.patente}</strong>
        ) : (
          <span className={`text-[15px] font-semibold ${suave}`}>Sin patente</span>
        )}
        {quien && <span className={`text-[14px] ${suave}`}>{quien}</span>}
      </button>

      {t.estado === "OBSERVADO" && t.falta && (
        <span className="rounded-xl bg-orange-50 dark:bg-orange-500/15 px-3 py-2 text-[14px] text-orange-700 dark:text-orange-300">
          El registro pidió: <strong>{t.falta}</strong>
        </span>
      )}
      {t.cliente_subio_papeles && (
        <span className="self-start inline-flex items-center gap-1 rounded-lg bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-1 text-[12px] font-bold text-duo-azul dark:text-blue-300">
          <HiDocumentText className="w-3.5 h-3.5" aria-hidden="true" /> El cliente mandó una foto
        </span>
      )}
      {/* 💵 Precio y cuánto le pagó el cliente, con «Recibí plata» (solo con las comisiones prendidas) */}
      {t.ve_plata && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface dark:bg-surface-dark px-3 py-2">
          <span className="text-[13px] text-titulo dark:text-titulo-dark">
            {t.precio_gestoria == null ? (
              <strong className="text-duo-amarillo-sombra dark:text-amber-300">Falta el precio</strong>
            ) : (
              <>
                Precio <strong>{plata(t.precio_gestoria)}</strong>
              </>
            )}
            {" · "}
            {t.cobros_n ? (
              <>
                te pagó <strong>{plata(t.cobrado)}</strong>
              </>
            ) : (
              <strong className="text-duo-amarillo-sombra dark:text-amber-300">sin comprobante</strong>
            )}
          </span>
          <button
            type="button"
            onClick={onCobro}
            aria-label={`Recibí plata: ${ident}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-duo-verde hover:bg-duo-verde-sombra px-3 text-[13px] font-bold text-white"
          >
            <HiCamera className="w-4 h-4" aria-hidden="true" /> Recibí plata
          </button>
        </div>
      )}

      {t.estado === "ASIGNADO" && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onAvanzar("EN_REGISTRO")}
            className={`${BTN.violeta} flex-1`}
            aria-label={`${persona ? "Lo presenté" : "Lo presenté en el registro"}: ${ident}`}
          >
            {persona ? "Lo presenté" : "Lo presenté en el registro"}
          </button>
          {botonVer}
        </div>
      )}
      {t.estado === "EN_REGISTRO" && (
        <div className="flex gap-2">
          <button type="button" disabled={ocupado} onClick={() => onAvanzar("LISTO")} className={`${BTN.verde} flex-1`} aria-label={`Está LISTO: ${ident}`}>
            Está LISTO
          </button>
          <button type="button" disabled={ocupado} onClick={onObservar} className={`${BTN.naranja} flex-1`} aria-label={`Observado: ${ident}`}>
            Observado
          </button>
          {botonVer}
        </div>
      )}
      {t.estado === "OBSERVADO" && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => onAvanzar("EN_REGISTRO")}
            className={`${BTN.violeta} flex-1`}
            aria-label={`Lo presenté otra vez: ${ident}`}
          >
            Lo presenté otra vez
          </button>
          {botonVer}
        </div>
      )}
      {t.estado === "LISTO" && (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[14px] text-duo-verde-sombra dark:text-green-400">
            Esperando que lo retire en {t.oficina_nombre || "la oficina"}.
          </span>
          {botonVer}
        </div>
      )}
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
    <details className="group rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3">
      <summary className="flex min-h-[40px] cursor-pointer list-none items-center justify-between gap-2 text-[15px] font-bold text-titulo dark:text-titulo-dark [&::-webkit-details-marker]:hidden">
        <span>
          Tus datos
          {faltan ? <span className={`font-normal ${suave}`}> · faltan {faltan}</span> : null}
        </span>
        <HiChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
        {filas.map(([k, v]) => (
          <div key={k} className="flex flex-col min-w-0">
            <dt className={suave}>{k}</dt>
            <dd className="font-semibold text-titulo dark:text-titulo-dark break-words">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className={`mt-3 text-[13px] ${suave}`}>Así te ve la oficina de THAMES. Si algo está mal (o querés cambiar la foto), avisales y lo actualizan.</p>
    </details>
  );
}
