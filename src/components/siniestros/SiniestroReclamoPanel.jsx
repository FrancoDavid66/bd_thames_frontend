// src/components/siniestros/SiniestroReclamoPanel.jsx
//
// ⚖️💰 PESTAÑA «RECLAMO» DEL SINIESTRO (Franco 17/11/2026)
//   Desde el 17/11 Maxi (rol ABOGADO) lleva los reclamos desde THAMES. En esta pestaña:
//     · Lo lleva: el abogado asignado. El ADMIN lo cambia acá (solo usuarios con rol ABOGADO).
//     · Atrasado: 15 días sin novedad, oferta sin responder hace +5 días, convenio sin pago hace 15.
//     · Dónde está: el paso de la barra del cliente (ej. «Paso 3 de 6 · Reclamo presentado»).
//     · La plata: reclamado → ofrecido (% de lo reclamado) → convenio → cobrado → honorarios 30 %.
//     · Eventos rápidos: Presentado, Reiterado, Inspección, Oferta, Contraoferta, Aceptado,
//       Convenio, Cobrado, Rechazado. Cada uno pide la fecha (y el monto si va) y el servidor
//       anota la nota «RECLAMO · fecha · EVENTO · …» (así el portal del cliente avanza solo).
//     · Editar montos: para corregir. Si cambia lo ofrecido / el convenio / lo cobrado, la nota
//       también sale sola.
//     · Papeles básicos: el checklist (✓ hay archivo · ? revisar · ✗ falta).
//   🔒 Los montos NUNCA se ven en el portal del cliente.
//   Quién edita: el admin y el abogado del caso. La oficina lo ve, sin tocar.
//
// props: s (el siniestro con lo del servidor), puedeEditar, esAdmin, abogados ([{id, nombre}]),
//        onCambio(siniestroNuevo) → para refrescar el panel.
import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";

import { eventoReclamo, patchSiniestro } from "../../store/slices/siniestrosSlice";
import { invalidarCacheSiniestrosCliente } from "../../hooks/useSiniestrosCliente";
import { mensajeDe } from "../planilla/planillaUtils";
import { plata } from "../gestoria/gestoriaUtils";

// Los botones, en orden (monto: pide plata · obligatorio: no se guarda sin monto).
export const EVENTOS = [
  { id: "PRESENTADO", n: "Presentado", ic: "📨", monto: true, ph: "Monto reclamado", ayuda: "Lo que se reclama" },
  { id: "REITERADO", n: "Reiterado", ic: "🔁" },
  { id: "INSPECCION", n: "Inspección", ic: "🔍" },
  { id: "OFERTA", n: "Oferta", ic: "💬", monto: true, obligatorio: true, ph: "Lo que ofrecen" },
  { id: "CONTRAOFERTA", n: "Contraoferta", ic: "↩️", monto: true, ph: "Lo que pedimos" },
  { id: "ACEPTADO", n: "Aceptado", ic: "🤝" },
  { id: "CONVENIO", n: "Convenio", ic: "✍️", monto: true, obligatorio: true, ph: "Monto del convenio" },
  { id: "COBRADO", n: "Cobrado", ic: "💵", monto: true, obligatorio: true, ph: "Lo que se cobró" },
  { id: "RECHAZADO", n: "Rechazado", ic: "⛔" },
];

const hoyYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "2026-11-17" → "17/11/2026" */
function ddmmaaaa(ymd) {
  if (!ymd) return "";
  const [a, m, d] = String(ymd).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "850.000" · "850000,50" · "$ 1.250.000" → 850000 / 850000.5 / 1250000. Vacío → null. */
export function aNumero(txt) {
  if (txt === null || txt === undefined) return null;
  let t = String(txt).replace(/\$/g, "").replace(/\s/g, "").trim();
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const CAJA = "rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark";
const INPUT =
  "w-full rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2 text-[14px] text-titulo dark:text-titulo-dark outline-none focus:border-[var(--acc)]";
const ETIQ = "text-[12px] font-semibold text-suave dark:text-suave-dark";

function Titulo({ children, derecha = null }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">{children}</h3>
      {derecha}
    </div>
  );
}

/** Una cajita de plata: «Ofrecido $ 700.000 · 17/11/2026 · 82 % de lo reclamado». */
function Monto({ titulo, valor, fecha, extra, tono = "" }) {
  const hay = valor !== null && valor !== undefined && valor !== "";
  return (
    <div className={`${CAJA} px-3 py-2.5 ${tono}`}>
      <p className={ETIQ}>{titulo}</p>
      <p className={`text-[17px] font-extrabold tabular-nums ${hay ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"}`}>
        {hay ? plata(valor) : "—"}
      </p>
      {(fecha || extra) && (
        <p className="text-[12px] text-suave dark:text-suave-dark">{[fecha && ddmmaaaa(fecha), extra].filter(Boolean).join(" · ")}</p>
      )}
    </div>
  );
}

const ICONO_CHECK = { ok: "✓", revisar: "?", falta: "✗" };
const COLOR_CHECK = {
  ok: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde",
  revisar: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo",
  falta: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
};

/** ✓ DNI · ✗ Presupuesto · ? Registro (mirá en «Papeles del asegurado»)… */
export function ChecklistPapeles({ items = [] }) {
  if (!items.length) return null;
  const ok = items.filter((i) => i.estado === "ok").length;
  return (
    <div>
      <Titulo derecha={<span className="text-[12.5px] font-bold text-suave dark:text-suave-dark tabular-nums">{ok} de {items.length}</span>}>
        📎 Papeles básicos
      </Titulo>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.clave} className={`${CAJA} flex items-center gap-2 px-2.5 py-2`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${COLOR_CHECK[i.estado] || COLOR_CHECK.falta}`}>
              {ICONO_CHECK[i.estado] || "✗"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold text-titulo dark:text-titulo-dark">{i.nombre}</span>
              {i.nota ? <span className="block truncate text-[11.5px] text-suave dark:text-suave-dark">{i.nota}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[12px] text-suave dark:text-suave-dark">Subí los papeles en «📎 Papeles» con su etiqueta y se tildan solos.</p>
    </div>
  );
}

/** El cuadrito que se abre al tocar un evento: fecha, monto (si va) y detalle interno. */
function FormEvento({ ev, s, onListo, onCancelar }) {
  const dispatch = useDispatch();
  const [fecha, setFecha] = useState(hoyYmd());
  const [monto, setMonto] = useState(ev.id === "PRESENTADO" && s.monto_reclamado ? String(Number(s.monto_reclamado)) : "");
  const [detalle, setDetalle] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async () => {
    const n = ev.monto ? aNumero(monto) : null;
    if (ev.monto && Number.isNaN(n)) return setError("El monto no se entiende. Ej: 850.000");
    if (ev.obligatorio && (n === null || n === undefined)) return setError(`Para «${ev.n}» poné el monto.`);
    if (!fecha) return setError("Poné la fecha.");
    setGuardando(true);
    setError("");
    try {
      const r = await dispatch(eventoReclamo({ id: s.id, evento: ev.id, fecha, monto: n, detalle: detalle.trim() })).unwrap();
      invalidarCacheSiniestrosCliente(s.cliente);
      toast.success(`${ev.ic} ${ev.n}: anotado`);
      onListo?.(r);
    } catch (e) {
      setError(mensajeDe({ response: { data: e } }, "No se pudo guardar. Probá de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={`${CAJA} mt-2 flex flex-col gap-2.5 border-[var(--acc)] p-3`}>
      <p className="text-[14px] font-bold text-titulo dark:text-titulo-dark">
        {ev.ic} {ev.n}
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={ETIQ}>Fecha</span>
          <input type="date" value={fecha} max={hoyYmd()} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </label>
        {ev.monto && (
          <label className="flex flex-col gap-1">
            <span className={ETIQ}>
              {ev.ph}
              {ev.obligatorio ? "" : " (opcional)"}
            </span>
            <input
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 850.000"
              className={`${INPUT} tabular-nums`}
            />
          </label>
        )}
      </div>
      <label className="flex flex-col gap-1">
        <span className={ETIQ}>Detalle interno (opcional, el cliente no lo ve)</span>
        <input value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Ej: por mail a siniestros@…" className={INPUT} maxLength={300} />
      </label>
      {error && <p className="text-[13px] font-semibold text-duo-rojo">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} disabled={guardando} className="flex-1 rounded-lg border border-linea dark:border-linea-dark px-3 py-2 text-[13.5px] font-semibold text-titulo dark:text-titulo-dark">
          Cancelar
        </button>
        <button type="button" onClick={guardar} disabled={guardando} className="flex-1 rounded-lg bg-[var(--acc)] px-3 py-2 text-[13.5px] font-bold text-white disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

// Los campos del formulario «Editar montos».
const CAMPOS = [
  ["monto_reclamado", "Reclamado", "fecha_presentacion", "Presentado el"],
  ["monto_ofrecido", "Ofrecido", "fecha_oferta", "Fecha de la oferta"],
  ["monto_acordado", "Convenio", "fecha_convenio", "Fecha del convenio"],
  ["monto_cobrado", "Cobrado", "fecha_cobro", "Fecha del cobro"],
];

function valorInicial(s) {
  const v = {};
  CAMPOS.forEach(([m, , f]) => {
    v[m] = s[m] !== null && s[m] !== undefined && s[m] !== "" ? String(Number(s[m])) : "";
    v[f] = s[f] || "";
  });
  v.honorarios_porcentaje = s.honorarios_porcentaje !== null && s.honorarios_porcentaje !== undefined ? String(Number(s.honorarios_porcentaje)) : "30";
  v.honorarios_cobrados = !!s.honorarios_cobrados;
  return v;
}

function FormMontos({ s, onListo, onCancelar }) {
  const dispatch = useDispatch();
  const [v, setV] = useState(() => valorInicial(s));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const set = (k, x) => setV((p) => ({ ...p, [k]: x }));

  const guardar = async () => {
    const ini = valorInicial(s);
    const cambios = {};
    for (const [m, nombre, f] of CAMPOS) {
      if (v[m] !== ini[m]) {
        const n = aNumero(v[m]);
        if (Number.isNaN(n)) return setError(`«${nombre}» no se entiende. Ej: 850.000`);
        if (n !== null && n < 0) return setError(`«${nombre}» no puede ser negativo.`);
        cambios[m] = n;
      }
      if (v[f] !== ini[f]) cambios[f] = v[f] || null;
    }
    if (v.honorarios_porcentaje !== ini.honorarios_porcentaje) {
      const p = aNumero(v.honorarios_porcentaje);
      if (Number.isNaN(p) || p === null || p < 0 || p > 100) return setError("El % de honorarios va de 0 a 100.");
      cambios.honorarios_porcentaje = p;
    }
    if (v.honorarios_cobrados !== ini.honorarios_cobrados) cambios.honorarios_cobrados = v.honorarios_cobrados;
    if (!Object.keys(cambios).length) return onCancelar?.();
    setGuardando(true);
    setError("");
    try {
      const r = await dispatch(patchSiniestro({ id: s.id, cambios })).unwrap();
      invalidarCacheSiniestrosCliente(s.cliente);
      toast.success("Montos guardados");
      onListo?.(r);
    } catch (e) {
      setError(mensajeDe({ response: { data: e } }, "No se pudo guardar. Probá de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={`${CAJA} flex flex-col gap-3 p-3`}>
      {CAMPOS.map(([m, nombre, f, nombreFecha]) => (
        <div key={m} className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className={ETIQ}>{nombre}</span>
            <input inputMode="decimal" value={v[m]} onChange={(e) => set(m, e.target.value)} placeholder="—" className={`${INPUT} tabular-nums`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={ETIQ}>{nombreFecha}</span>
            <input type="date" value={v[f]} onChange={(e) => set(f, e.target.value)} className={INPUT} />
          </label>
        </div>
      ))}
      <div className="grid grid-cols-2 items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className={ETIQ}>% de honorarios</span>
          <input inputMode="decimal" value={v.honorarios_porcentaje} onChange={(e) => set("honorarios_porcentaje", e.target.value)} className={`${INPUT} tabular-nums`} />
        </label>
        <label className="flex min-h-[40px] items-center gap-2 text-[13.5px] font-semibold text-titulo dark:text-titulo-dark">
          <input type="checkbox" checked={v.honorarios_cobrados} onChange={(e) => set("honorarios_cobrados", e.target.checked)} className="h-4 w-4 accent-[var(--acc)]" />
          Honorarios cobrados
        </label>
      </div>
      <p className="text-[12px] text-suave dark:text-suave-dark">
        Si cambia lo ofrecido, el convenio o lo cobrado, se anota solo en la bitácora y el cliente ve el paso (sin montos).
      </p>
      {error && <p className="text-[13px] font-semibold text-duo-rojo">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} disabled={guardando} className="flex-1 rounded-lg border border-linea dark:border-linea-dark px-3 py-2 text-[13.5px] font-semibold text-titulo dark:text-titulo-dark">
          Cancelar
        </button>
        <button type="button" onClick={guardar} disabled={guardando} className="flex-1 rounded-lg bg-[var(--acc)] px-3 py-2 text-[13.5px] font-bold text-white disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar montos"}
        </button>
      </div>
    </div>
  );
}

/** ⚖️ «Lo lleva»: el admin elige el abogado (o lo saca). */
function SelectorAbogado({ s, abogados = [], onListo }) {
  const dispatch = useDispatch();
  const [guardando, setGuardando] = useState(false);
  const cambiar = async (valor) => {
    setGuardando(true);
    try {
      const r = await dispatch(patchSiniestro({ id: s.id, cambios: { abogado_asignado: valor ? Number(valor) : null } })).unwrap();
      toast.success(valor ? `Asignado a ${r?.abogado_nombre || "el abogado"}` : "Quedó sin asignar");
      onListo?.(r);
    } catch (e) {
      toast.error(mensajeDe({ response: { data: e } }), { duration: 6000 });
    } finally {
      setGuardando(false);
    }
  };
  return (
    <select
      value={s.abogado_asignado || ""}
      disabled={guardando}
      onChange={(e) => cambiar(e.target.value)}
      aria-label="Abogado que lleva el reclamo"
      className={`${INPUT} max-w-[260px] py-1.5 font-semibold`}
    >
      <option value="">Sin asignar</option>
      {abogados.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nombre}
        </option>
      ))}
    </select>
  );
}

export default function SiniestroReclamoPanel({ s, puedeEditar = false, esAdmin = false, abogados = [], onCambio }) {
  const [evento, setEvento] = useState(null); // el evento rápido abierto
  const [editando, setEditando] = useState(false);

  const alertas = s.alertas || [];
  const paso = s.paso_portal;
  const pct = s.oferta_porcentaje;
  const listo = (r) => {
    setEvento(null);
    setEditando(false);
    onCambio?.(r);
  };
  const evAbierto = useMemo(() => EVENTOS.find((e) => e.id === evento) || null, [evento]);
  const pctHon = s.honorarios_porcentaje !== null && s.honorarios_porcentaje !== undefined ? Number(s.honorarios_porcentaje) : 30;

  return (
    <div className="flex flex-col gap-4">
      {/* ⚖️ Lo lleva */}
      <div className={`${CAJA} flex flex-wrap items-center justify-between gap-2 px-3 py-2.5`}>
        <div className="min-w-0">
          <p className={ETIQ}>Lo lleva</p>
          <p className="truncate text-[15px] font-extrabold text-titulo dark:text-titulo-dark">⚖️ {s.abogado_nombre || "Sin asignar"}</p>
          {s.fecha_asignacion ? <p className="text-[12px] text-suave dark:text-suave-dark">Desde el {ddmmaaaa(s.fecha_asignacion)}</p> : null}
        </div>
        {esAdmin && <SelectorAbogado s={s} abogados={abogados} onListo={onCambio} />}
      </div>

      {/* 🚨 Atrasado */}
      {alertas.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {alertas.map((al) => (
            <li key={al.tipo} className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[13.5px] font-bold text-duo-rojo">
              ⏰ {al.txt}
            </li>
          ))}
        </ul>
      )}

      {/* 👣 Dónde está (lo mismo que ve el cliente en la barra, sin plata) */}
      {paso && (
        <div className={`${CAJA} px-3 py-2.5`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13.5px] font-bold text-titulo dark:text-titulo-dark">
              Paso {paso.hecho} de {paso.total}
              {paso.nombre ? ` · ${paso.nombre}` : ""}
            </p>
            {s.dias_sin_novedad !== null && s.dias_sin_novedad !== undefined && (
              <span className="text-[12px] text-suave dark:text-suave-dark">
                Último movimiento: {s.dias_sin_novedad === 0 ? "hoy" : `hace ${s.dias_sin_novedad} día${s.dias_sin_novedad === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {Array.from({ length: paso.total }).map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < paso.hecho ? "bg-[var(--acc)]" : "bg-linea dark:bg-linea-dark"}`} />
            ))}
          </div>
          {s.proximo_paso ? <p className="mt-2 text-[13px] text-suave dark:text-suave-dark">👉 Próximo: {s.proximo_paso}</p> : null}
        </div>
      )}

      {/* 💰 La plata */}
      <div>
        <Titulo
          derecha={
            puedeEditar && !editando ? (
              <button type="button" onClick={() => setEditando(true)} className="text-[13px] font-bold text-[var(--acc)]">
                ✏️ Editar montos
              </button>
            ) : null
          }
        >
          💰 Montos (el cliente no los ve)
        </Titulo>
        {editando ? (
          <FormMontos s={s} onListo={listo} onCancelar={() => setEditando(false)} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Monto titulo="Reclamado" valor={s.monto_reclamado} fecha={s.fecha_presentacion} />
            <Monto titulo="Ofrecido" valor={s.monto_ofrecido} fecha={s.fecha_oferta} extra={pct !== null && pct !== undefined ? `${pct} % de lo reclamado` : ""} />
            <Monto titulo="Convenio" valor={s.monto_acordado} fecha={s.fecha_convenio} />
            <Monto titulo="Cobrado" valor={s.monto_cobrado} fecha={s.fecha_cobro} />
            <div className="col-span-2">
              <Monto
                titulo={`Honorarios (${pctHon} % de lo cobrado)`}
                valor={s.honorarios_monto}
                fecha={s.honorarios_cobrados ? s.fecha_honorarios : null}
                extra={s.honorarios_monto ? (s.honorarios_cobrados ? "✅ Cobrados" : "⏳ Pendientes de cobro") : "Se calculan al cargar lo cobrado"}
              />
            </div>
          </div>
        )}
      </div>

      {/* ⚡ Eventos rápidos */}
      {puedeEditar && (
        <div>
          <Titulo>⚡ Cargar un movimiento</Titulo>
          <div className="grid grid-cols-3 gap-1.5">
            {EVENTOS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEvento(evento === e.id ? null : e.id)}
                aria-pressed={evento === e.id}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[13px] font-bold transition-colors ${
                  evento === e.id
                    ? "border-[var(--acc)] bg-[var(--acc)] text-white"
                    : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:border-[var(--acc)]"
                }`}
              >
                <span aria-hidden="true">{e.ic}</span> {e.n}
              </button>
            ))}
          </div>
          {evAbierto && <FormEvento key={evAbierto.id} ev={evAbierto} s={s} onListo={listo} onCancelar={() => setEvento(null)} />}
          <p className="mt-1.5 text-[12px] text-suave dark:text-suave-dark">
            Queda anotado en la bitácora y el cliente ve el paso en su portal (sin montos).
          </p>
        </div>
      )}

      {/* 📎 Papeles básicos */}
      <ChecklistPapeles items={s.checklist || []} />
    </div>
  );
}
