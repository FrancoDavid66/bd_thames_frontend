// src/components/gestoria/GestoresPanel.jsx
//
// 👥 GESTORES (solo admin 🔒): cómo viene cada uno y qué comisiones nos debe.
//   - Tabla: abiertos, demorados, listos, entregados (30 días), cuánto tarda,
//     trámites sin precio y "Nos debe" con el botón Cobrar.
//   - El % de comisión de cada uno se cambia ahí mismo (se aplica a sus
//     trámites con la comisión sin cobrar).
//   - Alta de gestor: crea también su usuario (rol GESTOR) para entrar a THAMES.
//     (Es el ÚNICO lugar donde se crean gestores.)
//   - 🎚️ Con las comisiones APAGADAS (hoy): sin plata. Se ve cómo viene cada
//     uno (abiertos, demorados, listos, entregados, cuánto tarda) y el alta no
//     pide el % (queda en 0; se pone cuando se prendan las comisiones).
//   - 👤 Perfil de cada gestor: foto o logo, WhatsApp, email, dirección y
//     horario (lápiz ✏️ para editarlo). La oficina lo ve en la ficha del
//     trámite con botones para escribirle, llamarlo o ir a llevarle papeles.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiCash, HiDocumentText, HiPencil } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import { useGestoria } from "./gestoriaContext";
import {
  borrarGestor,
  cobrarGestor,
  crearGestor,
  descartarAviso,
  editarGestor,
  mensajeError,
  pedirPanelGestores,
  subirFotoPerfil,
} from "../../services/gestoria";
import { Avatar, BotonArchivo, Candado, Cargando, Seccion, Tile } from "./Piezas";
import { DIAS_DEMORADO, ddmm, fmtPct, plata } from "./gestoriaUtils";

const inputCls =
  "w-full h-10 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta";
const labelCls = "flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark";

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Foto (o logo) del gestor: se sube al elegirla y queda guardada al tocar
 * Guardar/Crear. Mientras sube, avisa con onSubiendo(true) para que el botón
 * de guardar espere (si no, se guardaba sin la foto nueva).
 */
function FotoPerfil({ id, nombre, foto, onCambio, onSubiendo }) {
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const elegir = async (file) => {
    onSubiendo?.(true);
    try {
      const r = await subirFotoPerfil(file);
      if (montado.current) onCambio(r); // si cerraron la ventana mientras subía, no se usa
    } catch (e) {
      toast.error(e?.message || "No se pudo subir la foto.");
    } finally {
      if (montado.current) onSubiendo?.(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      <Avatar id={id} nombre={nombre} foto={foto?.url} size={64} />
      <div className="flex flex-col items-start gap-1.5">
        <BotonArchivo onElegir={elegir} accept="image/jpeg,image/png,image/webp">
          {foto?.url ? "Cambiar foto" : "Subir foto o logo"}
        </BotonArchivo>
        {foto?.url ? (
          <button type="button" onClick={() => onCambio({ url: "", public_id: "" })} className="text-[12px] font-semibold text-duo-rojo hover:underline">
            Sacar la foto
          </button>
        ) : (
          <span className="text-[12px] text-suave dark:text-suave-dark">Opcional. La ven la oficina y el cliente en su link.</span>
        )}
      </div>
    </div>
  );
}

/** WhatsApp, email, dirección y horario (los mismos en el alta y al editar). */
function CamposContacto({ f, setF }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className={labelCls}>
          WhatsApp
          <input inputMode="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="11 5555-0000" className={inputCls} />
        </label>
        <label className={labelCls}>
          Email
          <input type="email" inputMode="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="gestoria@mail.com" className={inputCls} />
        </label>
      </div>
      <label className={labelCls}>
        Dirección (dónde atiende)
        <input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} placeholder="Ej: Av. Mitre 1234, Avellaneda" className={inputCls} />
      </label>
      <label className={labelCls}>
        Horario
        <input value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })} placeholder="Ej: lunes a viernes de 9 a 14" className={inputCls} />
      </label>
    </>
  );
}

/** Revisa lo que se escribió en el perfil antes de mandarlo. "" = está bien. */
function errorPerfil(f) {
  if (!f.nombre.trim()) return "Poné el nombre.";
  if (f.email.trim() && !EMAIL_OK.test(f.email.trim())) return "Ese email no parece válido.";
  return "";
}

function claseTarda(p) {
  if (p == null) return "text-suave dark:text-suave-dark";
  if (p <= 7) return "text-duo-verde-sombra dark:text-duo-verde";
  if (p <= 10) return "text-duo-amarillo-sombra dark:text-duo-amarillo";
  return "text-duo-rojo";
}
const tardaTxt = (p) => (p == null ? "—" : `${String(p).replace(".", ",")} días`);

function ChipsTipos({ tipos, valor, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tipos
        .filter((tp) => tp.id !== "OTRO")
        .map((tp) => {
          const on = valor.includes(tp.id);
          return (
            <button
              key={tp.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? valor.filter((x) => x !== tp.id) : [...valor, tp.id])}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                on ? "bg-duo-violeta text-white border-duo-violeta" : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark"
              }`}
            >
              {tp.corto}
            </button>
          );
        })}
    </div>
  );
}

function PctInput({ g, onGuardar }) {
  const [v, setV] = useState(String(Number(g.comision_pct)));
  useEffect(() => setV(String(Number(g.comision_pct))), [g.comision_pct]);
  const guardar = () => {
    const n = Number(v);
    if (v.trim() === "" || !(n >= 0 && n <= 100)) {
      toast.error("El % tiene que ir de 0 a 100");
      setV(String(Number(g.comision_pct)));
      return;
    }
    if (n !== Number(g.comision_pct)) onGuardar(n);
  };
  return (
    <label className="mt-1 inline-flex items-center gap-1 text-[12px] text-suave dark:text-suave-dark" onClick={(e) => e.stopPropagation()}>
      Comisión
      <input
        type="number"
        min="0"
        max="100"
        step="0.5"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label={`% de comisión de ${g.nombre}`}
        className="w-16 h-8 rounded-md border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-1.5 text-[13px] text-titulo dark:text-titulo-dark"
      />
      %
    </label>
  );
}

export default function GestoresPanel() {
  const navigate = useNavigate();
  const { catalogo, setFiltros, recargarGestores } = useGestoria();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [cobrando, setCobrando] = useState(null);
  const [editando, setEditando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setData(await pedirPanelGestores());
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar Gestores."));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);
  useDatosVivos(["gestoria"], () => cargar());

  const tipos = useMemo(() => catalogo?.tipos || [], [catalogo]);
  const nombreTipo = (id) => tipos.find((x) => x.id === id)?.corto || id;

  const guardarPct = async (g, n) => {
    try {
      const r = await editarGestor(g.id, { comision_pct: n });
      toast.success(`${g.nombre}: ahora ${fmtPct(n)}. Se aplica a sus ${r.aplicado_a ?? 0} trámites con la comisión sin cobrar.`);
      cargar();
      recargarGestores?.();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const descartar = async (av) => {
    if (!window.confirm(`¿Descartar el aviso de pago de ${plata(av.monto)}? (Por ejemplo, si subió un comprobante que no corresponde.)`)) return;
    try {
      await descartarAviso(av.id);
      toast.success("Aviso descartado");
      cargar();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };

  const verGestor = (g) => {
    setFiltros((f) => ({ ...f, gestor: String(g.id) }));
    navigate("/gestoria");
  };

  if (error && !data) {
    return <p className="rounded-xl border border-duo-rojo/40 p-4 text-[14px] text-duo-rojo">{error}</p>;
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Cargando key={i} />)}</div>
        <Cargando alto="h-72" />
      </div>
    );
  }

  const tot = data.totales || {};
  // 🎚️ Con las comisiones apagadas (hoy) el servidor no manda plata: sin montos, sin % y sin "Nos debe".
  const conPlata = tot.comisiones_a_cobrar !== undefined;
  const suma = (k) => (data.gestores || []).reduce((a, g) => a + Number(g[k] || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="inline-flex items-center gap-2 text-xl font-bold text-titulo dark:text-titulo-dark">Gestores <Candado /></h2>
        <span className="text-[13px] text-suave dark:text-suave-dark">
          {conPlata ? "Cómo viene cada uno y qué comisiones nos deben. El cliente le paga directo a la gestoría." : "Cómo viene cada uno."}
        </span>
      </div>

      {conPlata ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile k="DERIVADOS · 30 DÍAS" v={tot.derivados_30d ?? 0} n="Trámites cargados en THAMES" />
          <Tile k="PRECIO DE LAS GESTORÍAS · 30 DÍAS" v={plata(tot.precio_30d)} n={`Lo cargan los gestores · ${tot.sin_precio ?? 0} sin precio`} />
          <Tile k="COMISIONES COBRADAS · 30 DÍAS" v={plata(tot.comisiones_cobradas_30d)} n="Entran a Balances (sin oficina)" tono="verde" />
          <Tile k="COMISIONES A COBRAR" v={plata(tot.comisiones_a_cobrar)} n="Lo que nos deben las gestorías" tono="ambar" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile k="DERIVADOS · 30 DÍAS" v={tot.derivados_30d ?? 0} n="Trámites cargados en THAMES" />
          <Tile k="ABIERTOS" v={suma("abiertos")} n="Los que tienen los gestores ahora" />
          <Tile k="DEMORADOS" v={suma("demorados")} n={`${DIAS_DEMORADO} días o más sin moverse`} tono="rojo" />
          <Tile k="ENTREGADOS · 30 DÍAS" v={suma("entregados_30d")} n="Terminados" tono="verde" />
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-surface dark:bg-surface-dark text-left text-suave dark:text-suave-dark">
                    <th scope="col" className="px-3 py-2.5 font-semibold">Gestor</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-right">Abiertos</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-right">Demorados</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-right">Listos</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-right" title="Entregados en los últimos 30 días">Entregados</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-right" title="Promedio de cargado a listo (últimos 6 meses)">Tarda</th>
                    {conPlata && (
                      <>
                        <th scope="col" className="px-3 py-2.5 font-semibold text-right">Sin precio</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold text-right">Nos debe</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.gestores.map((g) => {
                    const debe = Number(g.debe || 0);
                    return (
                      <tr
                        key={g.id}
                        onClick={() => verGestor(g)}
                        className="cursor-pointer border-t border-linea/70 dark:border-linea-dark/70 hover:bg-surface/70 dark:hover:bg-surface-dark/60"
                      >
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-start gap-2.5">
                            <Avatar id={g.id} nombre={g.nombre} size={40} foto={g.foto_url} />
                            <div className="flex flex-col min-w-0">
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                <strong className="text-titulo dark:text-titulo-dark whitespace-nowrap">{g.nombre}</strong>
                                {!g.activo && <span className="rounded bg-surface dark:bg-surface-dark px-1.5 text-[11px] font-semibold text-suave">desactivado</span>}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditando(g);
                                  }}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded text-suave hover:text-duo-violeta"
                                  aria-label={`Editar ${g.nombre}`}
                                  title="Editar"
                                >
                                  <HiPencil className="w-3.5 h-3.5" />
                                </button>
                              </span>
                              <span className="text-[12px] text-suave dark:text-suave-dark break-all">
                                {g.telefono || "sin WhatsApp"}
                                {g.email ? ` · ${g.email}` : ""}
                              </span>
                              <span className="text-[12px] text-suave dark:text-suave-dark">usuario {g.usuario || "—"}</span>
                              {conPlata && <PctInput g={g} onGuardar={(n) => guardarPct(g, n)} />}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-titulo dark:text-titulo-dark">{g.abiertos}</td>
                        <td className="px-3 py-3 text-right">
                          {g.demorados ? <span className="rounded-md bg-duo-rojo px-2 py-0.5 font-bold text-white">{g.demorados}</span> : "0"}
                        </td>
                        <td className="px-3 py-3 text-right">{g.listos}</td>
                        <td className="px-3 py-3 text-right">{g.entregados_30d}</td>
                        <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${claseTarda(g.promedio_dias)}`}>{tardaTxt(g.promedio_dias)}</td>
                        {conPlata && (
                          <>
                            <td className="px-3 py-3 text-right">
                              {g.sin_precio ? (
                                <span className="rounded-md border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-2 py-0.5 font-bold text-duo-amarillo-sombra dark:text-duo-amarillo">
                                  {g.sin_precio}
                                </span>
                              ) : (
                                "0"
                              )}
                            </td>
                            <td className="px-3 py-3 text-right align-top">
                              <div className="flex flex-col items-end gap-1.5">
                                {debe > 0 ? (
                                  <span className="inline-flex items-center gap-2">
                                    <strong className="whitespace-nowrap text-titulo dark:text-titulo-dark">{plata(debe)}</strong>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCobrando(g);
                                      }}
                                      className="rounded-lg bg-duo-verde hover:bg-duo-verde-sombra px-2.5 py-1 text-[12px] font-semibold text-white"
                                      aria-label={`Marcar cobradas las comisiones de ${g.nombre}`}
                                    >
                                      Cobrar
                                    </button>
                                  </span>
                                ) : !(Number(g.comision_pct) > 0) ? (
                                  <span className="text-suave dark:text-suave-dark whitespace-nowrap">No paga comisión</span>
                                ) : (
                                  <span className="font-semibold text-duo-verde-sombra dark:text-duo-verde">Al día</span>
                                )}
                                {/* Los "Ya pagué" se ven siempre (aunque ya no deba), para poder descartarlos. */}
                                {(g.avisos || []).map((av) => (
                                  <span key={av.id} className="inline-flex max-w-[190px] flex-wrap items-center justify-end gap-x-2 text-right text-[12px]">
                                    <a
                                      href={av.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 font-semibold text-duo-azul hover:underline"
                                      title={`${av.nombre} · ${ddmm(av.fecha)}`}
                                    >
                                      <HiDocumentText className="w-3.5 h-3.5 shrink-0" /> Avisó que pagó {plata(av.monto)}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        descartar(av);
                                      }}
                                      className="font-semibold text-suave hover:text-duo-rojo"
                                      title="Si el comprobante no corresponde, descartalo"
                                    >
                                      Descartar
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {!data.gestores.length && (
                    <tr>
                      <td colSpan={conPlata ? 8 : 6} className="px-3 py-6 text-center text-suave dark:text-suave-dark">Todavía no hay gestores. Cargá el primero a la derecha.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <Seccion titulo={<h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Cuánto tarda cada tipo <span className="text-[13px] font-normal text-suave dark:text-suave-dark">· de cargado a listo, entregados</span></h2>}>
            {data.tiempos_por_tipo.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {data.tiempos_por_tipo.map((x) => (
                  <div key={x.tipo} className="flex flex-col gap-1 rounded-lg bg-surface dark:bg-surface-dark p-3">
                    <span className="text-[12px] text-suave dark:text-suave-dark">{nombreTipo(x.tipo)}</span>
                    <strong className="text-lg text-titulo dark:text-titulo-dark">{tardaTxt(x.promedio_dias)}</strong>
                    <span className="text-[11px] text-suave dark:text-suave-dark">{x.cantidad} trámite{x.cantidad > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[13px] text-suave dark:text-suave-dark">Todavía no hay trámites entregados para calcularlo.</span>
            )}
          </Seccion>
        </div>

        <div className="w-full max-w-2xl 2xl:max-w-none">
          <NuevoGestor
            tipos={tipos}
            conPlata={conPlata}
            onCreado={() => {
              cargar();
              recargarGestores?.();
            }}
          />
        </div>
      </div>

      <ModalCobrarGestor
        g={cobrando}
        formas={catalogo?.formas_pago || []}
        onCerrar={() => setCobrando(null)}
        onHecho={() => {
          setCobrando(null);
          cargar();
          recargarGestores?.();
        }}
      />
      <ModalEditarGestor
        g={editando}
        tipos={tipos}
        onCerrar={() => setEditando(null)}
        onHecho={() => {
          setEditando(null);
          cargar();
          recargarGestores?.();
        }}
      />
    </div>
  );
}

function NuevoGestor({ tipos, conPlata, onCreado }) {
  const vacio = {
    nombre: "", telefono: "", email: "", direccion: "", horario: "", foto: { url: "", public_id: "" },
    username: "", password: "", comision_pct: "10", tipos: [],
  };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const crear = async () => {
    setError("");
    const malo = errorPerfil(f);
    if (malo) return setError(malo);
    if (!f.username.trim()) return setError("Poné el usuario con el que va a entrar.");
    if (f.password.length < 6) return setError("La contraseña tiene que tener 6 letras o números como mínimo.");
    const pct = Number(f.comision_pct);
    if (conPlata && (String(f.comision_pct).trim() === "" || !(pct >= 0 && pct <= 100))) return setError("El % de comisión tiene que ir de 0 a 100.");
    setGuardando(true);
    try {
      await crearGestor({
        nombre: f.nombre.trim(),
        telefono: f.telefono.trim(),
        email: f.email.trim(),
        direccion: f.direccion.trim(),
        horario: f.horario.trim(),
        foto_url: f.foto.url,
        foto_public_id: f.foto.public_id,
        username: f.username.trim(),
        password: f.password,
        ...(conPlata ? { comision_pct: pct } : {}), // apagadas: queda en 0 hasta que se prendan
        tipos: f.tipos,
      });
      toast.success(`Gestor creado. Ya puede entrar con el usuario «${f.username.trim()}».`);
      setF(vacio);
      onCreado?.();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Seccion titulo="Nuevo gestor">
      <p className="text-[13px] text-suave dark:text-suave-dark -mt-1">Entra a THAMES con su usuario y ve solo los trámites que le derivan.</p>
      {error && <p role="alert" className="rounded-lg border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[13px] font-semibold text-duo-rojo">{error}</p>}
      <FotoPerfil id={null} nombre={f.nombre} foto={f.foto} onCambio={(foto) => setF((x) => ({ ...x, foto }))} onSubiendo={setSubiendoFoto} />
      <label className={labelCls}>
        Nombre y apellido (o gestoría)
        <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej: Gestoría Sur" className={inputCls} />
      </label>
      <CamposContacto f={f} setF={setF} />
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Usuario
          <input value={f.username} autoComplete="off" onChange={(e) => setF({ ...f, username: e.target.value.replace(/\s/g, "") })} placeholder="gestoria.sur" className={inputCls} />
        </label>
        <label className={labelCls}>
          Contraseña inicial
          <input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="••••••••" className={inputCls} />
        </label>
      </div>
      {conPlata && (
        <label className={labelCls}>
          % de comisión que nos paga (0 = no paga)
          <input type="number" min="0" max="100" step="0.5" value={f.comision_pct} onChange={(e) => setF({ ...f, comision_pct: e.target.value })} className={inputCls} />
        </label>
      )}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">Qué trámites hace (para sugerirlo)</legend>
        <ChipsTipos tipos={tipos} valor={f.tipos} onChange={(v) => setF({ ...f, tipos: v })} />
      </fieldset>
      <Boton3D variant="violeta" full onClick={crear} disabled={guardando || subiendoFoto}>
        {subiendoFoto ? "Esperá que suba la foto…" : guardando ? "Creando…" : "Crear gestor"}
      </Boton3D>
    </Seccion>
  );
}

function ModalCobrarGestor({ g, formas, onCerrar, onHecho }) {
  const [forma, setForma] = useState("TRANSFERENCIA");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (g) setForma("TRANSFERENCIA");
  }, [g]);

  const cobrar = async () => {
    setGuardando(true);
    try {
      const r = await cobrarGestor(g.id, forma);
      toast.success(`Cobradas ${r.cantidad} comisiones de ${g.nombre}: ${plata(r.total)} · entraron a Balances${r.avisos ? " · con el comprobante que subió" : ""}`);
      onHecho?.();
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalDuo
      isOpen={!!g}
      onClose={onCerrar}
      size="sm"
      icon={<HiCash />}
      iconTono="verde"
      title="Cobrar comisiones"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <Boton3D variant="verde" onClick={cobrar} disabled={guardando} className="w-full sm:w-auto">
            {guardando ? "Guardando…" : "Cobradas: anotar en la caja"}
          </Boton3D>
        </>
      }
    >
      {g && (
        <div className="flex flex-col gap-3 text-[14px] text-titulo dark:text-titulo-dark">
          <p>
            Se marcan cobradas <strong>todas</strong> las comisiones pendientes de {g.nombre}: <strong>{plata(g.debe)}</strong> ({g.pendientes} trámite
            {g.pendientes === 1 ? "" : "s"}). Cada una entra a Balances como «Comisión gestoría», sin oficina.
          </p>
          {(g.avisos || []).length > 0 && (
            <p className="rounded-lg border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-3 py-2 text-[13px] text-duo-azul">
              {g.nombre} avisó que pagó {plata(g.avisos[g.avisos.length - 1].monto)}: el comprobante queda adjunto en los trámites que incluía ese aviso.
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">
            Forma de pago
            <select value={forma} onChange={(e) => setForma(e.target.value)} className={inputCls}>
              {formas.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </ModalDuo>
  );
}

function ModalEditarGestor({ g, tipos, onCerrar, onHecho }) {
  const [f, setF] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  useEffect(() => {
    if (g) {
      setF({
        nombre: g.nombre, telefono: g.telefono || "", email: g.email || "", direccion: g.direccion || "", horario: g.horario || "",
        foto: { url: g.foto_url || "", public_id: "" },
        username: g.usuario || "", password: "", tipos: g.tipos || [], activo: g.activo,
      });
      setError("");
      setSubiendoFoto(false); // si la cerraron mientras subía una foto, al abrirla de nuevo arranca limpia
    }
  }, [g]);

  if (!g || !f) return null;

  const guardar = async () => {
    setError("");
    const malo = errorPerfil(f);
    if (malo) return setError(malo);
    if (f.password && f.password.length < 6) return setError("La contraseña nueva tiene que tener 6 letras o números como mínimo.");
    setGuardando(true);
    try {
      const body = {
        nombre: f.nombre.trim(), telefono: f.telefono.trim(), email: f.email.trim(),
        direccion: f.direccion.trim(), horario: f.horario.trim(), tipos: f.tipos, activo: f.activo,
      };
      // La foto se manda solo si cambió (así no se pierde nada de la que ya tenía).
      if (f.foto.url !== (g.foto_url || "")) {
        body.foto_url = f.foto.url;
        body.foto_public_id = f.foto.public_id;
      }
      if (f.username.trim() && f.username.trim() !== g.usuario) body.username = f.username.trim();
      if (f.password) body.password = f.password;
      await editarGestor(g.id, body);
      toast.success("Gestor actualizado");
      onHecho?.();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    if (!window.confirm(`¿Borrar a ${g.nombre} y su usuario? Solo se puede si no tiene trámites.`)) return;
    try {
      await borrarGestor(g.id);
      toast.success("Gestor borrado");
      onHecho?.();
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  return (
    <ModalDuo
      isOpen={!!g}
      onClose={onCerrar}
      size="sm"
      icon={<HiPencil />}
      iconTono="violeta"
      title={`Editar · ${g.nombre}`}
      footer={
        <>
          <button type="button" onClick={borrar} className="w-full sm:w-auto sm:mr-auto text-[13px] font-semibold text-duo-rojo hover:underline">
            Borrar gestor
          </button>
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">Volver</Boton3D>
          <Boton3D variant="violeta" onClick={guardar} disabled={guardando || subiendoFoto} className="w-full sm:w-auto">
            {subiendoFoto ? "Subiendo la foto…" : guardando ? "Guardando…" : "Guardar"}
          </Boton3D>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <p role="alert" className="rounded-lg border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[13px] font-semibold text-duo-rojo">{error}</p>}
        <FotoPerfil id={g.id} nombre={f.nombre} foto={f.foto} onCambio={(foto) => setF((x) => ({ ...x, foto }))} onSubiendo={setSubiendoFoto} />
        <label className={labelCls}>
          Nombre
          <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={inputCls} />
        </label>
        <CamposContacto f={f} setF={setF} />
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>
            Usuario
            <input value={f.username} autoComplete="off" onChange={(e) => setF({ ...f, username: e.target.value.replace(/\s/g, "") })} className={inputCls} />
          </label>
          <label className={labelCls}>
            Contraseña nueva
            <input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="(dejala vacía)" className={inputCls} />
          </label>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-medium text-suave dark:text-suave-dark">Qué trámites hace</legend>
          <ChipsTipos tipos={tipos} valor={f.tipos} onChange={(v) => setF({ ...f, tipos: v })} />
        </fieldset>
        <label className="inline-flex items-start gap-2.5 text-[14px] text-titulo dark:text-titulo-dark cursor-pointer">
          <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} className="mt-0.5 w-4 h-4" />
          <span>
            Activo
            <span className="block text-[12px] text-suave dark:text-suave-dark">Si lo desactivás, no entra más a THAMES y no se le pueden asignar trámites.</span>
          </span>
        </label>
      </div>
    </ModalDuo>
  );
}
