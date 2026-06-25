// src/components/pagos/FacturaCuota.jsx
import React from "react";
import dayjs from "dayjs";
import {
  HiReceiptTax,
  HiUser,
  HiOfficeBuilding,
  HiCash,
  HiCalendar,
} from "react-icons/hi";

const safe = (v, d = "—") =>
  v === null || v === undefined || v === "" ? d : v;

const fmtMoney = (n) =>
  "AR$ " +
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    if (typeof d === "string") {
      const dateStr = d.slice(0, 10); 
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

const isPagoAtrasado = (cuota) => {
  if (!cuota || !cuota.pagado) return false;
  const { fecha_vencimiento, fecha_pago } = cuota;
  if (!fecha_vencimiento || !fecha_pago) return false;
  const v = dayjs(fecha_vencimiento).startOf("day");
  const p = dayjs(fecha_pago).startOf("day");
  if (!v.isValid() || !p.isValid()) return false;
  return p.isAfter(v);
};

// 🚀 NUEVA FUNCIÓN: Suma 1 día (24hs)
const calcularDiaSiguienteStr = (fechaPago) => {
    if (!fechaPago) return "—";
    const d = new Date(fechaPago);
    if (isNaN(d.getTime())) return "—";
    d.setDate(d.getDate() + 1);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Suma 48hs hábiles
const calcularRehabilitacionStr = (fechaPago) => {
    if (!fechaPago) return "—";
    const d = new Date(fechaPago);
    if (isNaN(d.getTime())) return "—";
    let added = 0;
    while (added < 2) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++; 
    }
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function FacturaCuota({ cliente, poliza, cuota, ocultarNumeroPoliza = false }) {
  if (!cliente || !poliza || !cuota) return null;

  const cuotaNroStr = String(safe(cuota.cuota_nro));
  const esPrimeraCuota = cuotaNroStr === "1";
  const pagoAtrasado = !esPrimeraCuota && isPagoAtrasado(cuota);
  
  const fechaDiaSiguiente = cuota.pagado 
    ? calcularDiaSiguienteStr(cuota.pago_registrado_en || cuota.fecha_pago) 
    : "—";

  const fechaRehabilitacion = cuota.pagado 
    ? calcularRehabilitacionStr(cuota.pago_registrado_en || cuota.fecha_pago) 
    : "—";

  return (
    <div className="max-w-3xl mx-auto rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm print:shadow-none">
      <div className="rounded-t-lg bg-slate-800 text-slate-100 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10">
            <HiReceiptTax className="w-6 h-6" />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-mono font-medium text-slate-800">
              Factura / Recibo de Pago de Cuota
            </h1>
            <p className="text-xs text-slate-400">
              Emitida el {fmtDate(new Date())}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">Nº de comprobante</p>
          <p className="text-base font-mono font-medium text-slate-800">
            {String(cuota.id).padStart(6, "0")}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <HiUser className="w-5 h-5 text-slate-500" />
              <h2 className="font-medium text-slate-800">Datos del Cliente</h2>
            </div>
            <ul className="text-sm space-y-1">
              <li>
                <span className="text-slate-500">Nombre:</span>{" "}
                <span className="font-medium text-slate-800">
                  {safe(cliente.nombre)} {safe(cliente.apellido)}
                </span>
              </li>
              <li>
                <span className="text-slate-500">DNI / CUIT:</span>{" "}
                <span className="font-medium text-slate-800">
                  {safe(cliente.dni_cuit_cuil)}
                </span>
              </li>
              <li>
                <span className="text-slate-500">Teléfono:</span>{" "}
                <span className="font-medium text-slate-800">{safe(cliente.telefono)}</span>
              </li>
              <li>
                <span className="text-slate-500">Email:</span>{" "}
                <span className="font-medium text-slate-800">{safe(cliente.email)}</span>
              </li>
              <li>
                <span className="text-slate-500">Dirección:</span>{" "}
                <span className="font-medium text-slate-800">{safe(cliente.direccion)}</span>
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <HiOfficeBuilding className="w-5 h-5 text-slate-500" />
              <h2 className="font-medium text-slate-800">Datos de la Póliza / Vehículo</h2>
            </div>
            <ul className="text-sm space-y-1">
              {!ocultarNumeroPoliza && (
                <li>
                  <span className="text-slate-500">Póliza Nº:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {safe(poliza.numero_poliza)}
                  </span>
                </li>
              )}
              <li>
                <span className="text-slate-500">Compañía:</span>{" "}
                <span className="font-medium text-slate-800">{safe(poliza.compania)}</span>
              </li>
              <li>
                <span className="text-slate-500">Cobertura:</span>{" "}
                <span className="font-medium text-slate-800">{safe(poliza.cobertura)}</span>
              </li>
              <li>
                <span className="text-slate-500">Vehículo:</span>{" "}
                <span className="font-medium text-slate-800">
                  {safe(poliza.marca)} {safe(poliza.modelo)}{" "}
                  {poliza.anio ? `(${poliza.anio})` : ""}
                </span>
              </li>
              <li>
                <span className="text-slate-500">Patente:</span>{" "}
                <span className="font-medium text-slate-800">{safe(poliza.patente)}</span>
              </li>
              <li>
                <span className="text-slate-500">Tipo:</span>{" "}
                <span className="font-medium text-slate-800">{safe(poliza.tipo)}</span>
              </li>
            </ul>
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <HiCash className="w-5 h-5 text-slate-500" />
            <h2 className="font-medium text-slate-800">Detalle del Pago</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Cuota</p>
              <p className="text-lg font-medium text-slate-800">#{safe(cuota.cuota_nro)}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Monto</p>
              <p className="text-lg font-medium text-slate-800">
                {fmtMoney(cuota.monto)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Estado</p>
              <p className="text-lg font-medium text-slate-800">
                {cuota.pagado ? "Pagada" : "Pendiente"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="flex items-center gap-1 text-slate-500">
                <HiCalendar className="w-4 h-4" /> Vencimiento
              </p>
              <p className="font-medium text-slate-800">
                {fmtDate(cuota.fecha_vencimiento)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="flex items-center gap-1 text-slate-500">
                <HiCalendar className="w-4 h-4" /> Fecha de pago
              </p>
              <p className="font-medium text-slate-800">
                {cuota.pagado && (cuota.pago_registrado_en || cuota.fecha_pago)
                  ? fmtDate(cuota.pago_registrado_en || cuota.fecha_pago)
                  : "—"}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-slate-500">Forma de pago</p>
              <p className="font-medium text-slate-800">
                {cuota.forma_pago
                  ? cuota.forma_pago.charAt(0).toUpperCase() +
                    cuota.forma_pago.slice(1)
                  : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* 🚀 ALERTA PRIMERA CUOTA */}
        {esPrimeraCuota && (
          <div className="rounded-md border border-sky-200 bg-sky-50 text-slate-700 text-sm px-4 py-3 text-justify">
            <p className="font-semibold uppercase text-xs tracking-wider mb-2 text-center text-slate-600">Aviso Legal: Inicio de Cobertura</p>
            <p>
              El cliente toma conocimiento de que su vehículo comenzará a tener cobertura a partir del <strong className="font-bold">día siguiente</strong> a la realización de este primer pago (Fecha estimada: <strong className="font-bold">{fechaDiaSiguiente}</strong>).
            </p>
          </div>
        )}

        {/* 🚀 ALERTA PAGO ATRASADO */}
        {pagoAtrasado && (
          <div className="rounded-md border border-rose-200 bg-rose-50 text-slate-700 text-sm px-4 py-3 text-justify">
            <p className="font-semibold uppercase text-xs tracking-wider mb-2 text-center text-slate-600">Aviso Legal: Pago fuera de término</p>
            <p>
              El cliente acepta y confirma bajo juramento que <strong className="font-bold">NO ha tenido ningún siniestro ni reclamo</strong> en los días previos a este pago, durante los cuales la póliza se encontraba vencida.
            </p>
            <p className="mt-2">
              Asimismo, toma conocimiento de que la cobertura retomará su vigencia a partir del <strong className="font-bold">día siguiente o a las 48 horas hábiles</strong> de este pago (Fecha máxima estimada: <strong className="font-bold">{fechaRehabilitacion}</strong>), período en el cual <strong className="font-bold">TAMPOCO TENDRÁ COBERTURA</strong>.
            </p>
          </div>
        )}

        <div className="text-center text-xs text-slate-400">
          Gracias por confiar en nosotros.
        </div>
      </div>
    </div>
  );
}