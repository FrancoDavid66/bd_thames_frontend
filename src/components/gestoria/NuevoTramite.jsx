// src/components/gestoria/NuevoTramite.jsx
//
// ➕ Cargar un trámite nuevo, en pasos:
//   1 · Cliente y vehículo (se busca por patente, DNI o nombre; o a mano si no es cliente)
//   2 · Qué trámite es
//   3 · Papeles que trae (la lista del tipo, se puede cambiar)
//   4 · Qué gestor lo hace (con cuántos tiene y cuánto tarda)
//   5 · Plata 🔒 (solo admin: si ya sabe el precio)
//   · Aviso al cliente por WhatsApp con el link de seguimiento (hoy a mano:
//     al cargarlo, la ficha muestra el botón «Mandar por WhatsApp»)
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiSearch } from "react-icons/hi";

import { useGestoria } from "./gestoriaContext";
import { buscarClientes, crearTramite, mensajeError } from "../../services/gestoria";
import Boton3D from "../ui/Boton3D";
import { Avatar, Candado, Seccion } from "./Piezas";
import { calcComision, fmtPct, plata, ymdMas } from "./gestoriaUtils";

const inputCls =
  "w-full h-10 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta [color-scheme:light] dark:[color-scheme:dark]";
const labelCls = "flex flex-col gap-1.5 text-[13px] font-medium text-suave dark:text-suave-dark";

function Opcion({ on, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
        on
          ? "border-2 border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
          : "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark"
      }`}
    >
      {children}
    </button>
  );
}

export default function NuevoTramite() {
  const navigate = useNavigate();
  const { esAdmin, catalogo, gestores, recargarGestores } = useGestoria();
  const waAuto = !!catalogo?.whatsapp_auto; // false = el WhatsApp se manda a mano desde la ficha
  const tipos = useMemo(() => catalogo?.tipos || [], [catalogo]);
  const papelesDe = (id) => (tipos.find((x) => x.id === id)?.papeles || []).map((n) => ({ nombre: n, ok: false }));
  const diasDe = (id) => tipos.find((x) => x.id === id)?.dias || 7;

  const activos = useMemo(() => gestores.filter((g) => g.activo !== false), [gestores]);
  const masRapido = useMemo(() => {
    let mejor = null;
    activos.forEach((g) => {
      if (g.promedio_dias != null && (!mejor || g.promedio_dias < mejor.promedio_dias)) mejor = g;
    });
    return mejor ? mejor.id : activos[0]?.id || "";
  }, [activos]);

  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [sel, setSel] = useState(null);
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ nombre: "", dni: "", tel: "", patente: "", vehiculo: "" });
  const [tipo, setTipo] = useState("TRANSFERENCIA");
  const [detalle, setDetalle] = useState("");
  const [papeles, setPapeles] = useState([]);
  const [papelNuevo, setPapelNuevo] = useState("");
  const [gestorId, setGestorId] = useState(null);
  const [fecha, setFecha] = useState(ymdMas(12));
  const [oficina, setOficina] = useState("");
  const [precio, setPrecio] = useState("");
  const [wa, setWa] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const pedido = useRef(0);

  // Al llegar el catálogo: papeles del tipo inicial y la oficina por defecto.
  useEffect(() => {
    if (!tipos.length) return;
    setPapeles((p) => (p.length ? p : papelesDe(tipo)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipos]);
  useEffect(() => {
    if (!catalogo || oficina) return;
    setOficina(String(catalogo.mi_oficina || catalogo.oficinas?.[0]?.id || ""));
  }, [catalogo, oficina]);
  // Gestor sugerido: el más rápido (solo la primera vez).
  useEffect(() => {
    if (gestorId === null && activos.length) setGestorId(masRapido || "");
  }, [activos, masRapido, gestorId]);

  // Buscador de clientes (espera a que dejes de escribir).
  useEffect(() => {
    const texto = q.trim();
    if (texto.replace(/\s/g, "").length < 2) {
      setResultados([]);
      return undefined;
    }
    const n = ++pedido.current;
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const r = await buscarClientes(texto);
        if (n === pedido.current) setResultados(r);
      } catch {
        if (n === pedido.current) setResultados([]);
      } finally {
        if (n === pedido.current) setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const elegirTipo = (id) => {
    setTipo(id);
    setPapeles(papelesDe(id));
    setFecha(ymdMas(diasDe(id)));
  };

  const elegirCliente = (r) => {
    setSel(r);
    setError("");
    if (esAdmin && r.oficina) setOficina(String(r.oficina));
  };

  const gSel = activos.find((g) => String(g.id) === String(gestorId));
  const pctSel = gSel ? Number(gSel.comision_pct) : null;
  const precioNum = Number(precio);
  let calc;
  if (precio.trim() === "" || !(precioNum > 0)) calc = "Si lo dejás vacío, queda «Falta el precio» hasta que lo cargue el gestor.";
  else if (!gSel) calc = "La comisión se calcula cuando lo tome un gestor.";
  else if (!(pctSel > 0)) calc = `${gSel.nombre} no paga comisión.`;
  else calc = `Comisión para THAMES (${fmtPct(pctSel)}): ${plata(calcComision(precioNum, pctSel))}`;

  const tel = manual ? m.tel : sel ? sel.telefono : "";
  const ofiNombre = (catalogo?.oficinas || []).find((o) => String(o.id) === String(catalogo?.mi_oficina))?.nombre || "tu oficina";

  const cargar = async () => {
    setError("");
    if (manual) {
      if (!m.nombre.trim() || !m.patente.trim()) return setError("Falta el nombre del cliente o la patente.");
    } else if (!sel) {
      return setError("Elegí el cliente (buscalo por patente, DNI o nombre) o cargalo a mano.");
    }
    if (precio.trim() !== "" && !(precioNum > 0)) {
      return setError("El precio tiene que ser un número mayor a cero (o dejalo vacío y lo carga el gestor).");
    }
    if (esAdmin && !oficina) return setError("Elegí la oficina donde lo va a retirar el cliente.");
    const body = {
      tipo,
      detalle: detalle.trim(),
      papeles,
      gestor: gestorId ? Number(gestorId) : null,
      fecha_estimada: fecha || null,
      avisar_whatsapp: waAuto && wa,
      ...(manual
        ? {
            persona_nombre: m.nombre.trim(),
            persona_dni: m.dni.trim(),
            persona_telefono: m.tel.trim(),
            patente: m.patente.trim(),
            vehiculo: m.vehiculo.trim(),
          }
        : { poliza: sel.poliza, cliente: sel.cliente }),
      ...(esAdmin ? { oficina: Number(oficina), precio_gestoria: precio.trim() ? Math.round(precioNum) : null } : {}),
    };
    setGuardando(true);
    try {
      const t = await crearTramite(body);
      toast.success(`Trámite ${t.numero} cargado`);
      recargarGestores?.();
      navigate(`/gestoria/tramite/${t.id}`, { replace: true, state: { recienCargado: true } });
    } catch (e) {
      setError(mensajeError(e));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-titulo dark:text-titulo-dark">Nuevo trámite</h2>
      {error && (
        <p role="alert" className="rounded-lg border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-rojo">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {/* 1 · Cliente y vehículo */}
          <Seccion titulo="1 · Cliente y vehículo">
            {!manual ? (
              <>
                {sel ? (
                  <div className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 border-2 border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]">
                    <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <strong className="text-[14px] text-titulo dark:text-titulo-dark">{sel.nombre} · DNI {sel.dni || "—"}</strong>
                      <span className="text-[13px] text-suave dark:text-suave-dark">
                        {sel.vehiculo} <strong className="font-mono">{sel.patente}</strong> · póliza {sel.poliza_label} · {sel.telefono || "sin teléfono"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSel(null);
                        setQ("");
                      }}
                      className="shrink-0 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="relative">
                      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark pointer-events-none" />
                      <span className="sr-only">Buscar cliente</span>
                      <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Patente, DNI o nombre"
                        className={`${inputCls} pl-9 border-duo-violeta`}
                        autoFocus
                      />
                    </label>
                    {q.trim().replace(/\s/g, "").length >= 2 && (
                      <div className="flex flex-col gap-2">
                        {buscando && !resultados.length ? (
                          <span className="text-[13px] text-suave dark:text-suave-dark">Buscando…</span>
                        ) : resultados.length ? (
                          resultados.map((r) => (
                            <Opcion key={`${r.poliza}-${r.patente}`} on={false} onClick={() => elegirCliente(r)}>
                              <span className="flex flex-col gap-0.5 min-w-0">
                                <strong className="text-[14px] text-titulo dark:text-titulo-dark">{r.nombre} · DNI {r.dni || "—"}</strong>
                                <span className="text-[13px] text-suave dark:text-suave-dark">
                                  {r.vehiculo} <strong className="font-mono">{r.patente}</strong> · póliza {r.poliza_label}
                                </span>
                              </span>
                            </Opcion>
                          ))
                        ) : (
                          <span className="text-[13px] text-suave dark:text-suave-dark">No encontré a nadie con eso.</span>
                        )}
                      </div>
                    )}
                  </>
                )}
                <button type="button" onClick={() => setManual(true)} className="self-start text-[13px] font-semibold text-duo-violeta hover:underline">
                  ¿No es cliente? Cargar a mano
                </button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={labelCls}>
                    Nombre y apellido
                    <input value={m.nombre} onChange={(e) => setM({ ...m, nombre: e.target.value })} className={inputCls} />
                  </label>
                  <label className={labelCls}>
                    DNI
                    <input inputMode="numeric" value={m.dni} onChange={(e) => setM({ ...m, dni: e.target.value })} className={inputCls} />
                  </label>
                  <label className={labelCls}>
                    Teléfono (WhatsApp)
                    <input inputMode="tel" value={m.tel} onChange={(e) => setM({ ...m, tel: e.target.value })} className={inputCls} />
                  </label>
                  <label className={labelCls}>
                    Patente
                    <input value={m.patente} onChange={(e) => setM({ ...m, patente: e.target.value.toUpperCase() })} className={`${inputCls} font-mono uppercase`} />
                  </label>
                  <label className={`${labelCls} sm:col-span-2`}>
                    Vehículo (marca y modelo)
                    <input value={m.vehiculo} onChange={(e) => setM({ ...m, vehiculo: e.target.value })} className={inputCls} />
                  </label>
                </div>
                <button type="button" onClick={() => setManual(false)} className="self-start text-[13px] font-semibold text-duo-violeta hover:underline">
                  Mejor buscarlo entre los clientes
                </button>
              </>
            )}
          </Seccion>

          {/* 2 · Tipo */}
          <Seccion titulo="2 · Qué trámite es">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de trámite">
              {tipos.map((tp) => {
                const on = tipo === tp.id;
                return (
                  <button
                    key={tp.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => elegirTipo(tp.id)}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      on
                        ? "bg-duo-violeta text-white border-duo-violeta"
                        : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark hover:bg-surface dark:hover:bg-surface-dark"
                    }`}
                  >
                    {tp.nombre}
                  </button>
                );
              })}
            </div>
            <label className={labelCls}>
              Aclaración (opcional)
              <input
                value={detalle}
                maxLength={120}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder={tipo === "OTRO" ? "¿Qué trámite es?" : "Ej: de cédula, y multas"}
                className={inputCls}
              />
            </label>
          </Seccion>

          {/* 3 · Papeles */}
          <Seccion titulo={<h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">3 · Papeles que trae <span className="text-[13px] font-normal text-suave dark:text-suave-dark">(lista del tipo elegido, la podés cambiar)</span></h2>}>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {papeles.map((p, i) => (
                <li key={`${p.nombre}-${i}`}>
                  <label className="flex items-center gap-2.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-2 text-[13px] text-titulo dark:text-titulo-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.ok}
                      onChange={(e) => setPapeles(papeles.map((x, j) => (j === i ? { ...x, ok: e.target.checked } : x)))}
                      className="w-4 h-4 accent-[var(--color-duo-verde)]"
                    />
                    <span className="flex-1">{p.nombre}</span>
                  </label>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = papelNuevo.trim();
                if (!n) return;
                setPapeles([...papeles, { nombre: n, ok: true }]);
                setPapelNuevo("");
              }}
            >
              <input value={papelNuevo} onChange={(e) => setPapelNuevo(e.target.value)} placeholder="Agregar otro papel" className={`${inputCls} h-9 text-[13px]`} />
              <button type="submit" className="rounded-lg border border-linea dark:border-linea-dark px-3 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                Agregar
              </button>
            </form>
            <span className="text-[12px] text-suave dark:text-suave-dark">Las fotos y PDF se suben desde la ficha, una vez cargado.</span>
          </Seccion>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          {/* 4 · Gestor */}
          <Seccion titulo="4 · Qué gestor lo hace">
            {activos.map((g) => {
              const on = String(gestorId) === String(g.id);
              return (
                <Opcion key={g.id} on={on} onClick={() => setGestorId(g.id)}>
                  <Avatar id={g.id} nombre={g.nombre} size={34} foto={g.foto_url} />
                  <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <strong className="text-[14px] text-titulo dark:text-titulo-dark">{g.nombre}</strong>
                    <span className="text-[13px] text-suave dark:text-suave-dark">
                      {g.abiertos} abiertos ·{" "}
                      {g.demorados ? <strong className="text-duo-rojo">{g.demorados} demorado{g.demorados > 1 ? "s" : ""}</strong> : "0 demorados"} · tarda{" "}
                      {g.promedio_dias != null ? `${String(g.promedio_dias).replace(".", ",")} días` : "—"}
                    </span>
                  </span>
                  {g.id === masRapido && g.promedio_dias != null && (
                    <span className="shrink-0 rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-2.5 py-1 text-[11px] font-bold text-duo-verde-sombra dark:text-duo-verde">
                      El más rápido
                    </span>
                  )}
                </Opcion>
              );
            })}
            {!activos.length && <span className="text-[13px] text-suave dark:text-suave-dark">Todavía no hay gestores cargados.</span>}
            <Opcion on={!gestorId} onClick={() => setGestorId("")}>
              <Avatar id={null} size={34} />
              <span className="flex-1 text-[14px] text-titulo dark:text-titulo-dark">Todavía sin gestor (queda en «Recibido»)</span>
            </Opcion>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={labelCls}>
                Fecha estimada
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
              </label>
              {esAdmin ? (
                <label className={labelCls}>
                  Oficina (donde lo retira)
                  <select value={oficina} onChange={(e) => setOficina(e.target.value)} className={inputCls}>
                    <option value="">Elegí…</option>
                    {(catalogo?.oficinas || []).map((o) => (
                      <option key={o.id} value={o.id}>{o.nombre}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className={labelCls}>
                  Oficina
                  <strong className="h-10 flex items-center text-[14px] text-titulo dark:text-titulo-dark">{ofiNombre}</strong>
                </div>
              )}
            </div>
          </Seccion>

          {/* 5 · Plata (solo admin) */}
          {esAdmin && (
            <Seccion titulo={<h2 className="inline-flex flex-wrap items-center gap-2 text-[15px] font-semibold text-titulo dark:text-titulo-dark">5 · Plata <span className="text-[13px] font-normal text-suave dark:text-suave-dark">(la cobra la gestoría)</span> <Candado /></h2>}>
              <p className="rounded-lg border border-duo-verde/30 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3 py-2 text-[13px] text-duo-verde-sombra dark:text-duo-verde">
                El cliente le paga directo a la gestoría. El precio lo carga el gestor cuando se lo pasa al cliente, y tu comisión se calcula sola con el % de esa gestoría.
              </p>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-surface dark:bg-surface-dark px-3.5 py-3 text-[14px] text-titulo dark:text-titulo-dark">
                <span>{gSel ? `Comisión de ${gSel.nombre}` : "Comisión"}</span>
                <strong className="whitespace-nowrap">{gSel ? (pctSel > 0 ? `${fmtPct(pctSel)} del precio` : "No paga") : "Se ve al elegir gestor"}</strong>
              </div>
              <label className={labelCls}>
                ¿Ya sabés el precio? (opcional)
                <input type="number" min="0" step="1000" inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Si no, lo carga el gestor" className={inputCls} />
              </label>
              <span className="text-[13px] text-suave dark:text-suave-dark">{calc}</span>
            </Seccion>
          )}

          {/* Aviso al cliente */}
          <Seccion titulo={`${esAdmin ? "6" : "5"} · Aviso al cliente`}>
            {waAuto ? (
              <>
                <label className="inline-flex items-center gap-2.5 text-[14px] text-titulo dark:text-titulo-dark cursor-pointer min-h-[40px]">
                  <input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} className="w-[18px] h-[18px]" />
                  Mandarle WhatsApp con el link para seguir el trámite
                </label>
                <span className="text-[13px] text-suave dark:text-suave-dark">{tel ? `A: ${tel}` : "Elegí el cliente para ver a qué número va."}</span>
              </>
            ) : (
              <span className="text-[14px] text-titulo dark:text-titulo-dark">
                Al cargarlo te aparece el botón <strong>«Mandar por WhatsApp»</strong>: se abre el chat del cliente con el link ya escrito y lo mandás vos.
                {tel ? ` Va a: ${tel}.` : ""}
              </span>
            )}
          </Seccion>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-linea dark:border-linea-dark pt-4">
        <Boton3D variant="blanco" onClick={() => navigate("/gestoria")} className="w-full sm:w-auto">Cancelar</Boton3D>
        <Boton3D variant="violeta" onClick={cargar} disabled={guardando} className="w-full sm:w-auto">
          {guardando ? "Cargando…" : "Cargar trámite"}
        </Boton3D>
      </div>
    </div>
  );
}
