// src/components/planilla/MenuEstado.jsx
//
// 🎨 El menú que sale al tocar el COLOR de una fila (o del panel):
//   - «PASAR A»: los estados a los que puede pasar, cada uno con su color.
//     El que sigue normalmente va primero y marcado «Lo que sigue».
//     Si alguno no se puede todavía, sale gris con el porqué.
//   - «TAMBIÉN»: otras cosas (cambiar gestor, cargar N° de reclamo, cancelar…).
//   - Si lo elegido necesita un dato (ej: "¿Qué pidió el registro?"), el mismo
//     menú se convierte en la pregunta, con Confirmar / Cancelar.
// En la compu sale como un globo debajo del color; en el celu, como hoja de abajo.
import { HiCheck } from "react-icons/hi";

import { Avatar } from "../gestoria/Piezas";

/** El valor final de un campo (los chips se juntan con lo escrito a mano). */
export function valorCampo(c, vals = {}) {
  const v = vals[c.k];
  if (c.t === "chips") {
    const sel = Array.isArray(v) ? v : [];
    return [...sel, String(vals[`${c.k}__otra`] || "").trim()].filter(Boolean).join(", ");
  }
  if (c.t === "si") return v === undefined ? c.def !== false : !!v;
  return typeof v === "string" ? v.trim() : v;
}

/** El primer campo obligatorio que falta (o null si está todo). */
export function campoQueFalta(op, vals = {}) {
  for (const c of op?.ask || []) {
    if (c.opcional || c.t === "si") continue;
    const v = valorCampo(c, vals);
    if (v === undefined || v === null || v === "") return c;
    if (c.t === "plata" && !(Number(v) > 0)) return c;
  }
  return null;
}

/** Valores iniciales de los campos (ej: "que lo vea el cliente" arranca tildado). */
export function valoresIniciales(op) {
  const v = {};
  (op?.ask || []).forEach((c) => {
    if (c.def !== undefined) v[c.k] = c.def;
  });
  return v;
}

const inputCls =
  "w-full rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2.5 text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-[var(--acc)] focus:ring-2 focus:ring-[var(--acc)]/15";

function Campo({ c, vals, set }) {
  const v = vals[c.k];
  let cuerpo = null;
  if (c.t === "texto") {
    cuerpo = <textarea rows={3} className={inputCls} placeholder={c.ph || "Escribí acá…"} value={v || ""} onChange={(e) => set(c.k, e.target.value)} />;
  } else if (c.t === "linea") {
    cuerpo = <input className={inputCls} placeholder={c.ph || "Escribilo acá"} value={v || ""} onChange={(e) => set(c.k, e.target.value)} />;
  } else if (c.t === "plata") {
    cuerpo = (
      <div className="flex items-center gap-2 text-[18px] font-bold text-titulo dark:text-titulo-dark">
        $
        <input inputMode="numeric" className={`${inputCls} text-[18px] font-bold`} placeholder="0" value={v || ""} onChange={(e) => set(c.k, e.target.value.replace(/[^\d]/g, ""))} />
      </div>
    );
  } else if (c.t === "fechaHora") {
    cuerpo = <input type="datetime-local" className={inputCls} value={v || ""} onChange={(e) => set(c.k, e.target.value)} />;
  } else if (c.t === "si") {
    const on = v === undefined ? c.def !== false : !!v;
    cuerpo = (
      <button type="button" onClick={() => set(c.k, !on)} className="inline-flex items-center gap-2.5 text-left text-[13.5px] text-titulo dark:text-titulo-dark">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-[var(--acc)] bg-[var(--acc)] text-white" : "border-linea dark:border-linea-dark"}`}>
          {on && <HiCheck className="h-3.5 w-3.5" />}
        </span>
        {c.txt || c.l}
      </button>
    );
  } else if (c.t === "chips") {
    const sel = Array.isArray(v) ? v : [];
    const tocar = (o) => set(c.k, sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
    cuerpo = (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(c.ops || []).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => tocar(o)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                sel.includes(o) ? "border-[var(--acc)] bg-[var(--acc)] text-white" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        {c.libre !== false && (
          <input className={inputCls} placeholder={c.ph || "Otra cosa (escribila)"} value={vals[`${c.k}__otra`] || ""} onChange={(e) => set(`${c.k}__otra`, e.target.value)} />
        )}
      </div>
    );
  } else if (c.t === "elegir") {
    cuerpo = (
      <div className="flex max-h-[260px] flex-col gap-1.5 overflow-y-auto">
        {(c.ops || []).map((o) => {
          const on = String(v) === String(o.v);
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => set(c.k, o.v)}
              className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                on ? "border-[var(--acc)] bg-[var(--acc)]/10" : "border-linea dark:border-linea-dark hover:bg-surface dark:hover:bg-surface-dark"
              }`}
            >
              {o.avatar !== false && <Avatar id={o.id ?? o.v} nombre={o.n} foto={o.foto} size={28} />}
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="truncate text-[13.5px] text-titulo dark:text-titulo-dark">{o.n}</b>
                {o.sub && <small className="truncate text-[12px] text-suave dark:text-suave-dark">{o.sub}</small>}
              </span>
              <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${on ? "border-[5px] border-[var(--acc)]" : "border-linea dark:border-linea-dark"}`} />
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {c.t !== "si" && <label className="text-[13.5px] font-bold text-titulo dark:text-titulo-dark">{c.l}{c.opcional ? <span className="font-normal text-suave dark:text-suave-dark"> (si sabés)</span> : null}</label>}
      {c.ayuda && <small className="-mt-1 text-[12px] text-suave dark:text-suave-dark">{c.ayuda}</small>}
      {cuerpo}
    </div>
  );
}

export default function MenuEstado({ a, it, det = null, menu, onElegir, onVals, onConfirmar, onCancelar }) {
  // ── La pregunta (lo elegido necesita un dato) ──
  if (menu?.op) {
    const op = menu.op;
    const set = (k, v) => onVals((vals) => ({ ...vals, [k]: v }));
    return (
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          {op.a && a.estados[op.a] ? (
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: a.estados[op.a].c }} aria-hidden="true" />
          ) : null}
          <b className="text-[15px] text-titulo dark:text-titulo-dark">{op.preg || op.txt}</b>
        </div>
        {(op.ask || []).map((c) => (
          <Campo key={c.k} c={c} vals={menu.vals || {}} set={set} />
        ))}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancelar} disabled={menu.enviando} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={menu.enviando} className="rounded-lg bg-[var(--acc)] px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-60">
            {menu.enviando ? "Guardando…" : op.confirmar || "Confirmar"}
          </button>
        </div>
      </div>
    );
  }

  // ── Las opciones ──
  const m = a.menu(it, det) || {};
  const opciones = m.opciones || [];
  const extras = m.extras || [];
  return (
    <div className="flex flex-col">
      {m.aviso && <p className="mb-2 rounded-lg bg-surface dark:bg-surface-dark px-3 py-2 text-[12.5px] leading-snug text-suave dark:text-suave-dark">{m.aviso}</p>}
      {opciones.length > 0 && <small className="mb-1.5 ml-0.5 text-[10.5px] font-extrabold tracking-[0.08em] text-suave dark:text-suave-dark">PASAR A</small>}
      {opciones.map((op) => {
        const e = a.estados[op.a] || { n: op.etiqueta || op.txt, c: "#64748b" };
        return (
          <button
            key={op.id}
            type="button"
            onClick={() => onElegir(op)}
            className={`mb-1.5 flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-white transition-[filter] hover:brightness-110 ${op.deshabilitado ? "opacity-45" : ""} ${op.principal ? "ring-2 ring-offset-2 ring-offset-card dark:ring-offset-card-dark" : ""}`}
            style={{ background: op.color || e.c, ...(op.principal ? { "--tw-ring-color": op.color || e.c } : {}) }}
          >
            <span className="flex w-full items-center gap-2">
              <b className="flex-1 text-[14px]">{op.etiqueta || e.n}</b>
              {op.principal && <span className="rounded-full bg-white/25 px-2 py-px text-[10.5px] font-extrabold tracking-wide">LO QUE SIGUE</span>}
            </span>
            <small className="text-[12px] opacity-95">{op.deshabilitado || op.txt}</small>
          </button>
        );
      })}
      {opciones.length === 0 && !m.aviso && <p className="px-1 py-2 text-[13px] text-suave dark:text-suave-dark">No hay un paso siguiente.</p>}
      {extras.length > 0 && <small className="mb-1 ml-0.5 mt-2 text-[10.5px] font-extrabold tracking-[0.08em] text-suave dark:text-suave-dark">TAMBIÉN</small>}
      {extras.map((x) => (
        <button
          key={x.id}
          type="button"
          onClick={() => onElegir(x)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-[13.5px] font-semibold hover:bg-surface dark:hover:bg-surface-dark ${
            x.peligro ? "text-duo-rojo" : "text-titulo dark:text-titulo-dark"
          }`}
        >
          <span className="w-5 text-center" aria-hidden="true">{x.ic}</span>
          <span className="flex min-w-0 flex-col">
            {x.txt}
            {x.sub && <small className="text-[12px] font-normal text-suave dark:text-suave-dark">{x.sub}</small>}
          </span>
        </button>
      ))}
    </div>
  );
}
