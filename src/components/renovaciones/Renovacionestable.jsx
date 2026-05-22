// src/components/renovaciones/RenovacionesTable.jsx
//
// Tabla limpia con 3 modos de columnas según el tab activo:
// - pendientes:   Patente · Compañía · Cliente · Oficina · Inicio · Vencimiento · Acciones
// - renovadas:    Patente · Cliente · Compañía nueva · Oficina · F. Renovación · Pagó 1ª · Cuotas · Estado · Acciones
// - no_renovaron: Patente · Cliente · Compañía · Oficina · Venció · Días sin gestión · Motivo · Acciones
//
// Sin animaciones llamativas, sin gradientes.

import { memo } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { HiClipboardCheck, HiArrowRight, HiXCircle, HiCheckCircle, HiMinusCircle } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

/* =========================================================
 * Helpers
 * ========================================================= */

function fmtDate(d) {
  if (!d) return "—";
  try {
    return dayjs(d).format("DD/MM/YYYY");
  } catch {
    return String(d);
  }
}

function diasDesde(d) {
  if (!d) return null;
  try {
    return dayjs().startOf("day").diff(dayjs(d).startOf("day"), "day");
  } catch {
    return null;
  }
}

function getClienteNombre(p) {
  const ap = p?.cliente?.apellido || p?.cliente_apellido || p?.apellido || "";
  const no = p?.cliente?.nombre || p?.cliente_nombre || p?.nombre || "";
  const full = `${ap}${ap && no ? ", " : ""}${no}`.trim();
  return full || "—";
}

function getOficinaLabel(p, oficinasOptions) {
  const raw = p?.oficina_nombre || p?.oficina;
  if (!raw) return "—";
  if (typeof raw === "object")
    return raw?.nombre || raw?.label || raw?.value || "—";

  const s = String(raw);
  const match =
    (Array.isArray(oficinasOptions) ? oficinasOptions : []).find(
      (o) => String(o?.value) === s || String(o?.label) === s
    ) || null;
  return match?.label || s;
}

function getVencimiento(p) {
  return (
    p?.ultima_cuota_vencimiento ||
    p?.vto_referencia ||
    p?.fecha_vencimiento ||
    p?.proxima_vencimiento_impaga ||
    null
  );
}

/* =========================================================
 * Componente principal
 * ========================================================= */

function RenovacionesTable({
  items = [],
  oficinasOptions = [],
  submitting,
  loading,
  tab = "pendientes", // "pendientes" | "renovadas" | "no_renovaron"
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
}) {
  const empty = !loading && items.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/40">
      {/* =========== Vista DESKTOP =========== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <TableHead tab={tab} />
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <EmptyRow tab={tab} message="Cargando…" />
            ) : empty ? (
              <EmptyRow tab={tab} message={getEmptyMessage(tab)} />
            ) : (
              items.map((p, idx) => (
                <TableRow
                  key={p.id}
                  p={p}
                  idx={idx}
                  tab={tab}
                  oficinasOptions={oficinasOptions}
                  submitting={submitting}
                  onRenovar={onRenovar}
                  onMarcarNoRenueva={onMarcarNoRenueva}
                  onDesmarcarNoRenueva={onDesmarcarNoRenueva}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* =========== Vista MOBILE (filas apiladas) =========== */}
      <div className="md:hidden divide-y divide-white/5">
        {loading && items.length === 0 ? (
          <div className="py-10 text-center text-white/50 text-sm">
            Cargando…
          </div>
        ) : empty ? (
          <div className="py-10 text-center text-white/50 text-sm">
            {getEmptyMessage(tab)}
          </div>
        ) : (
          items.map((p) => (
            <MobileRow
              key={p.id}
              p={p}
              tab={tab}
              oficinasOptions={oficinasOptions}
              submitting={submitting}
              onRenovar={onRenovar}
              onMarcarNoRenueva={onMarcarNoRenueva}
              onDesmarcarNoRenueva={onDesmarcarNoRenueva}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* =========================================================
 * Header (cambia según tab)
 * ========================================================= */

function TableHead({ tab }) {
  if (tab === "renovadas") {
    return (
      <tr>
        <Th>Patente</Th>
        <Th>Cliente</Th>
        <Th>Compañía nueva</Th>
        <Th>Oficina</Th>
        <Th>F. Renovación</Th>
        <Th>Pagó 1ª</Th>
        <Th>Cuotas</Th>
        <Th>Estado pago</Th>
        <Th className="text-right pr-4">Acciones</Th>
      </tr>
    );
  }
  if (tab === "no_renovaron") {
    return (
      <tr>
        <Th>Patente</Th>
        <Th>Cliente</Th>
        <Th>Compañía</Th>
        <Th>Oficina</Th>
        <Th>Venció</Th>
        <Th>Días sin gestión</Th>
        <Th>Motivo</Th>
        <Th className="text-right pr-4">Acciones</Th>
      </tr>
    );
  }
  // Pendientes (default)
  return (
    <tr>
      <Th>Patente</Th>
      <Th>Compañía</Th>
      <Th>Cliente</Th>
      <Th>Oficina</Th>
      <Th>Inicio</Th>
      <Th>Vencimiento</Th>
      <Th className="text-right pr-4">Acciones</Th>
    </tr>
  );
}

/* =========================================================
 * Fila desktop según tab
 * ========================================================= */

function TableRow({
  p,
  idx,
  tab,
  oficinasOptions,
  submitting,
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
}) {
  const rowClass = cx(
    "border-b border-white/5 hover:bg-white/[0.03] transition-colors",
    idx % 2 === 1 && "bg-white/[0.015]"
  );

  if (tab === "renovadas") {
    const noPagoPrimera = p?.primera_cuota_pagada === false;
    return (
      <tr
        className={cx(
          rowClass,
          // Resalta sutilmente las que aún no pagaron la 1ª
          noPagoPrimera && "bg-amber-500/[0.04]"
        )}
      >
        <Td mono>{p.patente || "—"}</Td>
        <Td>
          <div className="truncate max-w-[240px]" title={getClienteNombre(p)}>
            {getClienteNombre(p)}
          </div>
        </Td>
        <Td>{p.compania_nombre || p.compania || "—"}</Td>
        <Td>
          <span className="text-white/70">
            {getOficinaLabel(p, oficinasOptions)}
          </span>
        </Td>
        <Td mono className="text-white/70">
          {fmtDate(p.fecha_emision)}
        </Td>
        <Td>
          <PagoPrimeraBadge value={p.primera_cuota_pagada} />
        </Td>
        <Td className="font-mono text-white/80">
          <CuotasRatio
            pagadas={p.cuotas_pagadas}
            pendientes={p.cuotas_pendientes}
            total={p.cantidad_cuotas}
          />
        </Td>
        <Td>
          <EstadoPagoBadge value={p.estado_pago_renovacion} />
        </Td>
        <Td className="text-right pr-4">
          <div className="inline-flex items-center gap-1.5">
            <Link
              to={`/polizas/${p.id}`}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              Ver
              <HiArrowRight className="text-[10px] opacity-60" />
            </Link>
          </div>
        </Td>
      </tr>
    );
  }

  if (tab === "no_renovaron") {
    const vto = getVencimiento(p);
    const dias = diasDesde(vto);
    const motivo =
      p?.motivo_no_renueva ||
      p?.no_renueva_motivo ||
      (p?.no_renueva_manual ? "Marcada manualmente" : "Vencida 30+ días, sin gestión");
    const esManual = !!(p?.no_renueva_manual || p?.motivo_no_renueva);

    return (
      <tr className={rowClass}>
        <Td mono>{p.patente || "—"}</Td>
        <Td>
          <div className="truncate max-w-[240px]" title={getClienteNombre(p)}>
            {getClienteNombre(p)}
          </div>
        </Td>
        <Td>{p.compania_nombre || p.compania || "—"}</Td>
        <Td>
          <span className="text-white/70">
            {getOficinaLabel(p, oficinasOptions)}
          </span>
        </Td>
        <Td mono>{fmtDate(vto)}</Td>
        <Td className="font-mono text-white/80 tabular-nums">
          {dias != null && dias > 0 ? `${dias} d` : "—"}
        </Td>
        <Td>
          <span
            className={cx(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              esManual
                ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                : "border-white/15 bg-white/5 text-white/65"
            )}
            title={motivo}
          >
            <span className="truncate max-w-[180px]">{motivo}</span>
          </span>
        </Td>
        <Td className="text-right pr-4">
          <div className="inline-flex items-center gap-1.5">
            <Link
              to={`/polizas/${p.id}`}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              Ver
              <HiArrowRight className="text-[10px] opacity-60" />
            </Link>
            {esManual ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => onDesmarcarNoRenueva?.(p)}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              >
                Deshacer
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => onRenovar?.(p)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors disabled:opacity-50"
              >
                <HiClipboardCheck className="text-xs" />
                Renovar
              </button>
            )}
          </div>
        </Td>
      </tr>
    );
  }

  // Pendientes (default)
  const inicio = p?.fecha_emision || p?.primer_pago;
  const vto = getVencimiento(p);
  return (
    <tr className={rowClass}>
      <Td mono>{p.patente || "—"}</Td>
      <Td>{p.compania_nombre || p.compania || "—"}</Td>
      <Td>
        <div className="truncate max-w-[240px]" title={getClienteNombre(p)}>
          {getClienteNombre(p)}
        </div>
      </Td>
      <Td>
        <span className="text-white/70">
          {getOficinaLabel(p, oficinasOptions)}
        </span>
      </Td>
      <Td mono className="text-white/70">
        {fmtDate(inicio)}
      </Td>
      <Td mono>{fmtDate(vto)}</Td>
      <Td className="text-right pr-4">
        <div className="inline-flex items-center gap-1.5">
          <Link
            to={`/polizas/${p.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Ver
            <HiArrowRight className="text-[10px] opacity-60" />
          </Link>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onMarcarNoRenueva?.(p)}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/60 hover:bg-rose-500/10 hover:border-rose-400/30 hover:text-rose-300 transition-colors disabled:opacity-50"
            title="Marcar que el cliente no va a renovar"
          >
            No renueva
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onRenovar?.(p)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors disabled:opacity-50"
          >
            <HiClipboardCheck className="text-xs" />
            Renovar
          </button>
        </div>
      </Td>
    </tr>
  );
}

/* =========================================================
 * Fila mobile (apilada)
 * ========================================================= */

function MobileRow({
  p,
  tab,
  oficinasOptions,
  submitting,
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
}) {
  const cliente = getClienteNombre(p);
  const oficinaLabel = getOficinaLabel(p, oficinasOptions);
  const vto = getVencimiento(p);

  // Acciones mobile según tab
  const acciones = (() => {
    if (tab === "renovadas") {
      return (
        <Link
          to={`/polizas/${p.id}`}
          className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10"
        >
          Ver
        </Link>
      );
    }
    if (tab === "no_renovaron") {
      const esManual = !!(p?.no_renueva_manual || p?.motivo_no_renueva);
      return (
        <>
          <Link
            to={`/polizas/${p.id}`}
            className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10"
          >
            Ver
          </Link>
          {esManual ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => onDesmarcarNoRenueva?.(p)}
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10 disabled:opacity-50"
            >
              Deshacer
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => onRenovar?.(p)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 disabled:opacity-50"
            >
              <HiClipboardCheck className="text-[10px]" />
              Renovar
            </button>
          )}
        </>
      );
    }
    // Pendientes
    return (
      <>
        <Link
          to={`/polizas/${p.id}`}
          className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10"
        >
          Ver
        </Link>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onMarcarNoRenueva?.(p)}
          className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-white/60 hover:text-rose-300 hover:border-rose-400/30 disabled:opacity-50"
        >
          No renueva
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onRenovar?.(p)}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 disabled:opacity-50"
        >
          <HiClipboardCheck className="text-[10px]" />
          Renovar
        </button>
      </>
    );
  })();

  // Fields según tab
  const fields = (() => {
    if (tab === "renovadas") {
      return (
        <>
          <Field label="Cliente" value={cliente} />
          <Field label="Oficina" value={oficinaLabel} />
          <Field label="F. Renovación" value={fmtDate(p.fecha_emision)} mono />
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">
              Pagó 1ª
            </div>
            <PagoPrimeraBadge value={p.primera_cuota_pagada} compact />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">
              Cuotas
            </div>
            <CuotasRatio
              pagadas={p.cuotas_pagadas}
              pendientes={p.cuotas_pendientes}
              total={p.cantidad_cuotas}
            />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">
              Estado pago
            </div>
            <EstadoPagoBadge value={p.estado_pago_renovacion} compact />
          </div>
        </>
      );
    }
    if (tab === "no_renovaron") {
      const dias = diasDesde(vto);
      const motivo =
        p?.motivo_no_renueva ||
        p?.no_renueva_motivo ||
        (p?.no_renueva_manual
          ? "Marcada manualmente"
          : "Vencida 30+ días, sin gestión");
      return (
        <>
          <Field label="Cliente" value={cliente} />
          <Field label="Oficina" value={oficinaLabel} />
          <Field label="Venció" value={fmtDate(vto)} mono />
          <Field
            label="Sin gestión"
            value={dias != null && dias > 0 ? `${dias} días` : "—"}
            mono
          />
          <div className="col-span-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">
              Motivo
            </div>
            <div className="text-[11px] text-white/80">{motivo}</div>
          </div>
        </>
      );
    }
    // Pendientes
    return (
      <>
        <Field label="Cliente" value={cliente} />
        <Field label="Oficina" value={oficinaLabel} />
        <Field label="Inicio" value={fmtDate(p?.fecha_emision || p?.primer_pago)} mono />
        <Field label="Vencimiento" value={fmtDate(vto)} mono />
      </>
    );
  })();

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-mono text-sm font-bold text-white">
            {p.patente || "—"}
          </div>
          <div className="text-xs text-white/70 truncate">
            {p.compania_nombre || p.compania || "—"}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
          {acciones}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        {fields}
      </div>
    </div>
  );
}

/* =========================================================
 * Helpers de UI
 * ========================================================= */

function Th({ children, className = "" }) {
  return (
    <th
      className={cx(
        "px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/50",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "", mono = false }) {
  return (
    <td
      className={cx(
        "px-4 py-2.5 text-white/90",
        mono && "font-mono",
        className
      )}
    >
      {children}
    </td>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className={cx("text-white/85 truncate", mono && "font-mono")}>
        {value || "—"}
      </div>
    </div>
  );
}

function EmptyRow({ tab, message }) {
  const cols = tab === "pendientes" ? 7 : tab === "no_renovaron" ? 8 : 9;
  return (
    <tr>
      <td
        colSpan={cols}
        className="py-10 text-center text-white/50 text-sm"
      >
        {message}
      </td>
    </tr>
  );
}

function getEmptyMessage(tab) {
  if (tab === "renovadas") return "Aún no hay pólizas renovadas con estos filtros.";
  if (tab === "no_renovaron") return "Sin pólizas marcadas como 'no renovaron'.";
  return "No se encontraron pólizas para renovar con estos filtros.";
}

/* =========================================================
 * Badges
 * ========================================================= */

function PagoPrimeraBadge({ value, compact = false }) {
  // value puede ser: true | false | null/undefined
  if (value === true) {
    return (
      <span
        className={cx(
          "inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300",
          compact && "text-[10px]"
        )}
      >
        <HiCheckCircle className="text-xs" /> Sí
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
        <HiXCircle className="text-xs" /> No
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/50">
      <HiMinusCircle className="text-xs" /> —
    </span>
  );
}

function CuotasRatio({ pagadas, pendientes, total }) {
  const pag = Number.isFinite(Number(pagadas)) ? Number(pagadas) : null;
  const pen = Number.isFinite(Number(pendientes)) ? Number(pendientes) : null;
  const tot =
    Number.isFinite(Number(total)) && Number(total) > 0
      ? Number(total)
      : pag != null && pen != null
      ? pag + pen
      : null;

  if (pag == null && tot == null) return <span className="text-white/40">—</span>;
  const display = `${pag ?? "?"} / ${tot ?? "?"}`;
  return <span className="tabular-nums">{display}</span>;
}

function EstadoPagoBadge({ value, compact = false }) {
  // value puede ser: "al_dia" | "mora" | "pagada_total" | null
  const map = {
    al_dia: {
      label: "Al día",
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    },
    pagada_total: {
      label: "Pagada total",
      cls: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    },
    mora: {
      label: "Mora",
      cls: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    },
    sin_cuotas: {
      label: "Sin cuotas",
      cls: "border-white/15 bg-white/5 text-white/50",
    },
  };
  const cfg = map[value] || {
    label: "—",
    cls: "border-white/15 bg-white/5 text-white/50",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
        cfg.cls,
        compact && "text-[10px]"
      )}
    >
      {cfg.label}
    </span>
  );
}

export default memo(RenovacionesTable);