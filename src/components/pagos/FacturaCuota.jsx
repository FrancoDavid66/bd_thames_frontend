/* src/components/pagos/FacturaCuota.jsx — Reemplaza TODO el archivo con esta versión */
import React from "react";
import dayjs from "dayjs";
import {
  HiReceiptTax,
  HiUser,
  HiOfficeBuilding,
  HiCash,
  HiCalendar,
} from "react-icons/hi";

/* Helpers */
const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : v;

const fmtMoney = (n) =>
  "AR$ " +
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

/**
 * Formatea fechas SIN romper por timezone.
 * - Si viene "YYYY-MM-DD" → la formatea a "DD/MM/YYYY" manualmente (sin Date).
 * - Si viene Date u otro tipo → usa dayjs como fallback.
 */
const fmtDate = (d) => {
  if (!d) return "—";
  try {
    if (typeof d === "string") {
      const dateStr = d.slice(0, 10); // soporta "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm..."
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        if (yyyy && mm && dd) {
          return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
        }
      }
    }
    const m = dayjs(d);
    if (!m.isValid()) return "—";
    return m.format("DD/MM/YYYY");
  } catch {
    return "—";
  }
};

export default function FacturaCuota({ cliente, poliza, cuota }) {
  if (!cliente || !poliza || !cuota) return null;

  return (
    <div className="max-w-3xl mx-auto rounded-2xl border border-neutral-300/20 bg-neutral-500 text-neutral-100 shadow print:bg-white print:text-black print:border-none print:shadow-none">
      {/* Encabezado */}
      <div className="rounded-t-2xl bg-primary-400 text-neutral-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-900/10">
            <HiReceiptTax className="w-6 h-6" />
          </span>
          <div className="leading-tight">
            <h1 className="text-xl font-bold">
              Factura / Recibo de Pago de Cuota
            </h1>
            <p className="text-xs opacity-80">
              Emitida el {fmtDate(new Date())}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-70">Nº de comprobante</p>
          <p className="text-base font-semibold">
            {String(cuota.id).padStart(6, "0")}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Datos Cliente y Póliza */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="rounded-xl border border-neutral-300/20 bg-neutral-400/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <HiUser className="w-5 h-5 opacity-80" />
              <h2 className="font-semibold">Datos del Cliente</h2>
            </div>
            <ul className="text-sm space-y-1">
              <li>
                <span className="opacity-80">Nombre:</span>{" "}
                <span className="font-medium">
                  {safe(cliente.nombre)} {safe(cliente.apellido)}
                </span>
              </li>
              <li>
                <span className="opacity-80">DNI / CUIT:</span>{" "}
                <span className="font-medium">
                  {safe(cliente.dni_cuit_cuil)}
                </span>
              </li>
              <li>
                <span className="opacity-80">Teléfono:</span>{" "}
                <span className="font-medium">{safe(cliente.telefono)}</span>
              </li>
              <li>
                <span className="opacity-80">Email:</span>{" "}
                <span className="font-medium">{safe(cliente.email)}</span>
              </li>
              <li>
                <span className="opacity-80">Dirección:</span>{" "}
                <span className="font-medium">{safe(cliente.direccion)}</span>
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-neutral-300/20 bg-neutral-400/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <HiOfficeBuilding className="w-5 h-5 opacity-80" />
              <h2 className="font-semibold">Datos de la Póliza / Vehículo</h2>
            </div>
            <ul className="text-sm space-y-1">
              <li>
                <span className="opacity-80">Póliza Nº:</span>{" "}
                <span className="font-medium">
                  {safe(poliza.numero_poliza)}
                </span>
              </li>
              <li>
                <span className="opacity-80">Compañía:</span>{" "}
                <span className="font-medium">{safe(poliza.compania)}</span>
              </li>
              <li>
                <span className="opacity-80">Cobertura:</span>{" "}
                <span className="font-medium">{safe(poliza.cobertura)}</span>
              </li>
              <li>
                <span className="opacity-80">Vehículo:</span>{" "}
                <span className="font-medium">
                  {safe(poliza.marca)} {safe(poliza.modelo)}{" "}
                  {poliza.anio ? `(${poliza.anio})` : ""}
                </span>
              </li>
              <li>
                <span className="opacity-80">Patente:</span>{" "}
                <span className="font-medium">{safe(poliza.patente)}</span>
              </li>
              <li>
                <span className="opacity-80">Tipo:</span>{" "}
                <span className="font-medium">{safe(poliza.tipo)}</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Detalle del Pago */}
        <section className="rounded-xl border border-neutral-300/20 bg-neutral-400/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <HiCash className="w-5 h-5 opacity-80" />
            <h2 className="font-semibold">Detalle del Pago</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-neutral-300/20 bg-neutral-500/20 p-3">
              <p className="opacity-80">Cuota</p>
              <p className="text-lg font-semibold">#{safe(cuota.cuota_nro)}</p>
            </div>
            <div className="rounded-lg border border-neutral-300/20 bg-neutral-500/20 p-3">
              <p className="opacity-80">Monto</p>
              <p className="text-lg font-semibold">
                {fmtMoney(cuota.monto)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-300/20 bg-neutral-500/20 p-3">
              <p className="opacity-80">Estado</p>
              <p className="text-lg font-semibold">
                {cuota.pagado ? "Pagada" : "Pendiente"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-neutral-300/20 bg-neutral-500/20 p-3">
              <p className="flex items-center gap-1 opacity-80">
                <HiCalendar className="w-4 h-4" /> Vencimiento
              </p>
              <p className="font-medium">
                {fmtDate(cuota.fecha_vencimiento)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-300/20 bg-neutral-500/20 p-3">
              <p className="flex items-center gap-1 opacity-80">
                <HiCalendar className="w-4 h-4" /> Fecha de pago
              </p>
              <p className="font-medium">
                {cuota.pagado
                  ? fmtDate(cuota.fecha_pago || new Date())
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-300/20 bg-neutral-500/20 p-3">
              <p className="opacity-80">Forma de pago</p>
              <p className="font-medium">
                {cuota.forma_pago
                  ? cuota.forma_pago.charAt(0).toUpperCase() +
                    cuota.forma_pago.slice(1)
                  : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-neutral-200/70 print:text-neutral-600">
          Gracias por confiar en nosotros.
          <br />
          <span className="opacity-70">
            STARKE | Sistema de Gestión de Seguros
          </span>
        </div>
      </div>
    </div>
  );
}
