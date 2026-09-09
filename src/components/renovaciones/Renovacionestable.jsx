// src/components/renovaciones/Renovacionestable.jsx
//
// Tabla de renovaciones estilo THAMES (duo-*).
// Columnas: Oficina · Patente · Compañía · Asegurado · Vto · Acciones
// Acciones por fila: Renovar · No renueva · Ver. (Sin contacto.)
// Desktop = tabla; mobile = tarjetas (mismo patrón que TablaDuo).
//
// 🆕 MODO BÚSQUEDA (prop `buscando`): la página manda TODAS las coincidencias,
//    sin filtrar por vencimiento ni por estado. Acá sumamos un chip informativo
//    ("Ya renovada", "Finalizada", "No renueva"…) para que se vea qué se está
//    por tocar, y el botón "Renovar" queda SIEMPRE disponible.

import { HiRefresh, HiX, HiEye, HiArrowLeft, HiTicket, HiUpload, HiSearch, HiCheckCircle } from "react-icons/hi";

import Boton3D from "../ui/Boton3D";
import Badge from "../ui/Badge";
import {
  cx,
  getVencimiento,
  formatVto,
  getNombreCompleto,
  getCompania,
  situacionPoliza,
  llevaCuponera,
} from "./utils";

// Nombre de oficina de la póliza (soporta oficina_nombre, o el objeto oficina).
function getOficina(p) {
  return (
    p?.oficina_nombre ||
    p?.oficina?.nombre ||
    (typeof p?.oficina === "string" ? p.oficina : "") ||
    "—"
  );
}

/* ============ Acciones de una fila ============ */
function AccionesFila({ p, submitting, buscando, onRenovar, onMarcarNoRenueva, onDesmarcarNoRenueva }) {
  const descartada = !!p?.renovacion_descartada;

  // Descartada + modo normal  → solo "Revertir" (la fila está fuera de juego).
  // Descartada + modo BÚSQUEDA → "Revertir" Y "Renovar": si la buscaste a mano
  // es porque la querés renovar igual, sin tener que dar dos pasos.
  if (descartada) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Boton3D
          variant="blanco"
          size="sm"
          onClick={() => onDesmarcarNoRenueva?.(p)}
          disabled={submitting}
          title="Revertir 'no renueva'"
        >
          <HiArrowLeft /> Revertir
        </Boton3D>

        {buscando && (
          <Boton3D
            variant="verde"
            size="sm"
            onClick={() => onRenovar?.(p)}
            disabled={submitting}
            title="Renovar igual"
          >
            <HiRefresh /> Renovar
          </Boton3D>
        )}
      </div>
    );
  }

  // 🎟️ Las de cuponera NO se renuevan solas: piden el PDF nuevo.
  //    Botón violeta y otro texto, para que no se confundan con las de NRE.
  const cuponera = llevaCuponera(p);

  return (
    <div className="flex items-center justify-end gap-2">
      <Boton3D
        variant={cuponera ? "violeta" : "verde"}
        size="sm"
        onClick={() => onRenovar?.(p)}
        disabled={submitting}
        title={cuponera ? "Renovar subiendo la póliza nueva" : "Renovar póliza"}
      >
        {cuponera ? <><HiUpload /> Subir PDF</> : <><HiRefresh /> Renovar</>}
      </Boton3D>

      {/* No renueva */}
      <button
        type="button"
        onClick={() => onMarcarNoRenueva?.(p)}
        disabled={submitting}
        title="Marcar que no va a renovar"
        aria-label="No renueva"
        className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo transition-transform active:scale-90 disabled:opacity-40"
      >
        <HiX className="text-lg" />
      </button>

      {/* Ver */}
      <a
        href={`/polizas/${p.id}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Ver detalle (nueva pestaña)"
        aria-label="Ver detalle"
        className={cx(
          "inline-flex items-center justify-center h-10 w-10 rounded-lg bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul transition-transform active:scale-90",
          submitting && "pointer-events-none opacity-40"
        )}
      >
        <HiEye className="text-lg" />
      </a>
    </div>
  );
}

/* ============ Fila (desktop) ============ */
function FilaDesktop({ p, submitting, buscando, onRenovar, onMarcarNoRenueva, onDesmarcarNoRenueva }) {
  const descartada = !!p?.renovacion_descartada;
  const situacion = buscando ? situacionPoliza(p) : null;
  const textClass = descartada
    ? "line-through text-suave dark:text-suave-dark"
    : "text-titulo dark:text-titulo-dark";

  return (
    <tr
      className={cx(
        "border-b border-linea dark:border-linea-dark transition-colors",
        descartada
          ? "bg-duo-rojo-soft/40 dark:bg-[var(--color-duo-rojo-soft-dark)]/40"
          : "hover:bg-surface dark:hover:bg-surface-dark"
      )}
    >
      <td className="p-4">
        <Badge tono="azul" size="sm">{getOficina(p)}</Badge>
      </td>
      <td className={cx("p-4 text-sm font-semibold", textClass)}>
        <div className="flex items-center gap-2">
          <span>{p?.patente || "—"}</span>
          {/* 🎟️ El chip avisa de un vistazo cuáles necesitan el PDF. */}
          {llevaCuponera(p) && (
            <Badge tono="violeta" size="sm"><HiTicket /> Cuponera</Badge>
          )}
          {situacion && <Badge tono={situacion.tono} size="sm">{situacion.label}</Badge>}
        </div>
      </td>
      <td className={cx("p-4 text-sm", textClass)}>{getCompania(p)}</td>
      <td className={cx("p-4 text-sm", textClass)}>
        <div className="truncate max-w-[240px]" title={getNombreCompleto(p?.cliente)}>
          {getNombreCompleto(p?.cliente)}
        </div>
      </td>
      <td className={cx("p-4 text-sm tabular-nums whitespace-nowrap", textClass)}>
        {formatVto(getVencimiento(p))}
      </td>
      <td className="p-4">
        <AccionesFila
          p={p}
          submitting={submitting}
          buscando={buscando}
          onRenovar={onRenovar}
          onMarcarNoRenueva={onMarcarNoRenueva}
          onDesmarcarNoRenueva={onDesmarcarNoRenueva}
        />
      </td>
    </tr>
  );
}

/* ============ Tarjeta (mobile) ============ */
function CardMobile({ p, submitting, buscando, onRenovar, onMarcarNoRenueva, onDesmarcarNoRenueva }) {
  const descartada = !!p?.renovacion_descartada;
  const situacion = buscando ? situacionPoliza(p) : null;
  const textClass = descartada
    ? "line-through text-suave dark:text-suave-dark"
    : "text-titulo dark:text-titulo-dark";

  return (
    // 🎟️ Borde violeta para las de cuponera: se distinguen de lejos, sin leer.
    <div
      className={cx(
        "rounded-xl border p-4",
        descartada
          ? "border-duo-rojo/40 bg-duo-rojo-soft/40 dark:bg-[var(--color-duo-rojo-soft-dark)]/40"
          : llevaCuponera(p)
          ? "border-duo-violeta bg-surface dark:bg-surface-dark"
          : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={cx("text-base font-semibold", textClass)}>{p?.patente || "—"}</span>
        <div className="flex items-center gap-1.5">
          {llevaCuponera(p) && <Badge tono="violeta" size="sm"><HiTicket /> Cuponera</Badge>}
          {situacion && <Badge tono={situacion.tono} size="sm">{situacion.label}</Badge>}
          <Badge tono="azul" size="sm">{getOficina(p)}</Badge>
        </div>
      </div>
      <div className={cx("text-sm", textClass)}>{getNombreCompleto(p?.cliente)}</div>
      <div className="mt-0.5 text-[13px] text-suave dark:text-suave-dark">
        {getCompania(p)} · Vto {formatVto(getVencimiento(p))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <AccionesFila
          p={p}
          submitting={submitting}
          buscando={buscando}
          onRenovar={onRenovar}
          onMarcarNoRenueva={onMarcarNoRenueva}
          onDesmarcarNoRenueva={onDesmarcarNoRenueva}
        />
      </div>
    </div>
  );
}

/* ============ Componente principal ============ */
export default function Renovacionestable({
  items = [],
  loading = false,
  submitting = false,
  tab = "renovar_hoy",
  buscando = false,
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
}) {
  if (loading && (!items || items.length === 0)) {
    return (
      <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-duo-azul/30 border-t-duo-azul" />
        <p className="mt-3 text-sm text-suave dark:text-suave-dark">Cargando renovaciones…</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    // En modo búsqueda el mensaje NO puede hablar de vencimientos (no filtramos
    // por eso). Si no hay nada, es que no existe una póliza con ese texto.
    const empty = buscando
      ? { Icon: HiSearch, text: "Ninguna póliza coincide con esa búsqueda." }
      : {
          renovar_hoy: { Icon: HiCheckCircle, text: "No hay pólizas que venzan hoy." },
          en_3_dias: { Icon: HiCheckCircle, text: "Nada vence en los próximos 3 días." },
          vencidas: { Icon: HiCheckCircle, text: "No tenés pólizas sin renovar." },
        }[tab] || { Icon: HiSearch, text: "Sin resultados." };

    const EmptyIcon = empty.Icon;

    return (
      <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-12 text-center">
        <EmptyIcon className="mx-auto mb-3 h-10 w-10 text-suave dark:text-suave-dark" />
        <p className="text-[15px] font-medium text-titulo dark:text-titulo-dark">{empty.text}</p>
      </div>
    );
  }

  const COLS = ["Oficina", "Patente", "Compañía", "Asegurado", "Vto"];

  return (
    <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden">
      {/* ===== DESKTOP: tabla ===== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {COLS.map((h) => (
                <th
                  key={h}
                  className="p-4 text-left text-[11px] text-suave dark:text-suave-dark border-b border-linea dark:border-linea-dark"
                >
                  {h}
                </th>
              ))}
              <th className="p-4 text-right text-[11px] text-suave dark:text-suave-dark border-b border-linea dark:border-linea-dark">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <FilaDesktop
                key={p.id}
                p={p}
                submitting={submitting}
                buscando={buscando}
                onRenovar={onRenovar}
                onMarcarNoRenueva={onMarcarNoRenueva}
                onDesmarcarNoRenueva={onDesmarcarNoRenueva}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE: tarjetas ===== */}
      <div className="md:hidden p-3 space-y-3">
        {items.map((p) => (
          <CardMobile
            key={p.id}
            p={p}
            submitting={submitting}
            buscando={buscando}
            onRenovar={onRenovar}
            onMarcarNoRenueva={onMarcarNoRenueva}
            onDesmarcarNoRenueva={onDesmarcarNoRenueva}
          />
        ))}
      </div>

      {/* Footer con conteo */}
      <div className="border-t border-linea dark:border-linea-dark px-4 py-3 text-[11px] text-suave dark:text-suave-dark">
        Mostrando <span className="text-titulo dark:text-titulo-dark">{items.length}</span>{" "}
        {items.length === 1 ? "póliza" : "pólizas"}
      </div>
    </div>
  );
}