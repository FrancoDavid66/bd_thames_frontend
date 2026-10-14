// src/components/notificaciones/ReporteContactosModal.jsx
//
// 📋 Descarga el reporte de contactos (PDF o Excel) para mandar los WhatsApp a mano.
//
// El backend YA arma todo (notificaciones/services_reporte_contactos.py):
//   GET /api/notificaciones/cuotas/reporte-contactos/?formato=pdf|excel&oficina=1&fecha=AAAA-MM-DD
// Este modal solo junta los filtros y dispara la descarga.
//
// 📅 "¿De qué día?": cualquier usuario elige el día de la lista (por defecto hoy).
//    Ej: el lunes bajan la del domingo, así no se pierde ningún mensaje.
//    Los que pagaron hasta hoy no salen.
//
// 📅 Cada día del reporte trae LO MISMO que el filtro "Vence el" de Pólizas con
// esa fecha: cuotas que vencen ese día (pagadas o no) y pólizas que terminan ese
// día. Cada fila dice si el cliente PAGÓ o NO PAGÓ la cuota que tocaba.

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { HiDownload, HiDocumentReport, HiDocumentText, HiTable } from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import { PolizasAPI } from "../../api/polizas";

import ModalDuo from "../ui/ModalDuo";
import SelectDuo from "../ui/SelectDuo";
import InputDuo from "../ui/InputDuo";
import Boton3D from "../ui/Boton3D";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

// 🏷️ Los días que trae el reporte (mismos que el backend: REPORT_DELTAS + MESES_ATRASO).
//    "dias" = el número de la primera columna del PDF (0 = hoy · 3 = hace 3 días · -3 = en 3 días).
//    🗓️ Calendario de la oficina: 7 y 3 días antes, el mismo día, 3, 15 y 30 días después.
const DIAS_REPORTE = [
  { dias: "-7", texto: "Vence en 7 días", sumar: { dias: 7 }, tono: "verde" },
  { dias: "-3", texto: "Vence en 3 días", sumar: { dias: 3 }, tono: "verde" },
  { dias: "0", texto: "Vence hoy", sumar: { dias: 0 }, tono: "amarillo" },
  { dias: "3", texto: "Venció hace 3 días", sumar: { dias: -3 }, tono: "rojo" },
  { dias: "15", texto: "Venció hace 15 días", sumar: { dias: -15 }, tono: "rojo" },
  { dias: "1 mes", texto: "Venció hace un mes", sumar: { meses: -1 }, tono: "rojo" },
];

// Qué dice la columna "Pago" de cada fila.
const PAGO_REPORTE = [
  { txt: "NO PAGÓ", texto: "Hay que escribirle", tono: "rojo" },
  { txt: "PAGÓ", texto: "Ya está, no hace falta", tono: "verde" },
  { txt: "RENOVAR", texto: "No tiene cuota siguiente", tono: "violeta" },
  { txt: "YA RENOVÓ", texto: "El auto ya tiene póliza nueva", tono: "gris" },
];

const TONOS = {
  rojo: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
  amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
  verde: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
  violeta: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta",
  azul: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
  gris: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark",
};

// 📅 Hasta cuántos días para atrás / adelante se puede elegir (igual que el backend).
const DIAS_ATRAS = 31;
const DIAS_ADELANTE = 7;

// "2026-10-14" del día de hoy + n días (hora local).
function ymd(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "2026-10-18" → "domingo 18/10"
function nombreDia(fecha) {
  const [a, m, d] = String(fecha || "").split("-").map(Number);
  if (!a || !m || !d) return "";
  const dia = new Date(a, m - 1, d).toLocaleDateString("es-AR", { weekday: "long" });
  return `${dia} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

// Fecha de cada día (dd/mm), para compararla con el filtro "Vence el" de Pólizas.
// "Hace un mes" es el mismo día del mes anterior (si no existe, el último: 31/03 → 28/02).
// `base` = el día elegido ("2026-10-18"); sin base, hoy.
function fechaDelDia({ dias = 0, meses = 0 }, base) {
  const [a, m, dd] = String(base || ymd()).split("-").map(Number);
  let d = new Date(a, m - 1, dd);
  if (meses) {
    const primero = new Date(d.getFullYear(), d.getMonth() + meses, 1);
    const ultimoDia = new Date(primero.getFullYear(), primero.getMonth() + 1, 0).getDate();
    d = new Date(primero.getFullYear(), primero.getMonth(), Math.min(d.getDate(), ultimoDia));
  }
  if (dias) d.setDate(d.getDate() + dias);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Chip({ tono, children }) {
  return (
    <span
      className={`shrink-0 min-w-[2.75rem] text-center rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
        TONOS[tono] || TONOS.gris
      }`}
    >
      {children}
    </span>
  );
}

export default function ReporteContactosModal({ open, onClose }) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [formato, setFormato] = useState("pdf");
  const [oficinaId, setOficinaId] = useState("");
  const [fecha, setFecha] = useState(ymd());
  const [oficinas, setOficinas] = useState([]);
  const [descargando, setDescargando] = useState(false);

  // Sucursales (solo hace falta el selector para el admin; el empleado ve la suya)
  useEffect(() => {
    if (!open || !isWebAdmin) return;
    PolizasAPI.listOficinas()
      .then((res) => setOficinas(Array.isArray(res) ? res : res.results || []))
      .catch(() => setOficinas([]));
  }, [open, isWebAdmin]);

  useEffect(() => {
    if (open) {
      setFormato("pdf");
      setOficinaId("");
      setFecha(ymd());
    }
  }, [open]);

  const descargar = async () => {
    setDescargando(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
      const params = new URLSearchParams();
      params.set("formato", formato === "excel" ? "excel" : "pdf");
      if (isWebAdmin && oficinaId) params.set("oficina", oficinaId);
      if (fecha) params.set("fecha", fecha);

      const res = await axios.get(
        `${BASE_URL.replace(/\/+$/, "")}/notificaciones/cuotas/reporte-contactos/?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );

      // Nombre del archivo: el que mande el backend (Content-Disposition), o uno de respaldo.
      let nombre = `contactos_pendientes.${formato === "excel" ? "xlsx" : "pdf"}`;
      const disp = res.headers?.["content-disposition"];
      if (disp) {
        const m = /filename="?([^";]+)"?/.exec(disp);
        if (m?.[1]) nombre = m[1];
      }

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      toast.success("Reporte descargado");
      onClose?.();
    } catch (err) {
      console.error("[ReporteContactos] Error:", err);
      // El error viene como archivo (blob): se lee para mostrar el motivo (ej: "Elegí un día entre…").
      let motivo = "";
      try {
        const txt = await err?.response?.data?.text?.();
        motivo = JSON.parse(txt || "{}")?.error || "";
      } catch {
        /* sin motivo */
      }
      toast.error(motivo || "No se pudo generar el reporte");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <ModalDuo
      isOpen={open}
      onClose={descargando ? () => {} : onClose}
      title="Reporte de contactos"
      subtitle="Para mandar los WhatsApp a mano"
      icon={<HiDocumentReport />}
      iconTono="azul"
      size="md"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onClose} disabled={descargando}>
            Cerrar
          </Boton3D>
          <Boton3D variant="azul" onClick={descargar} disabled={descargando}>
            <HiDownload className={descargando ? "animate-pulse" : ""} />
            {descargando ? "Generando…" : "Descargar"}
          </Boton3D>
        </>
      }
    >
      <div className="space-y-4">
        {/* Formato */}
        <div>
          <label className="text-[11px] text-suave dark:text-suave-dark mb-1.5 block">Formato</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormato("pdf")}
              className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                formato === "pdf"
                  ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border-duo-azul text-duo-azul"
                  : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-azul/50"
              }`}
            >
              <HiDocumentText /> PDF
            </button>
            <button
              type="button"
              onClick={() => setFormato("excel")}
              className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                formato === "excel"
                  ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-duo-verde text-duo-verde-sombra dark:text-duo-verde"
                  : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-verde/50"
              }`}
            >
              <HiTable /> Excel
            </button>
          </div>
        </div>

        {/* 📅 ¿De qué día es la lista? (cualquier usuario). Ej: el lunes, la del domingo. */}
        <div>
          <InputDuo
            label="¿De qué día?"
            type="date"
            value={fecha}
            min={ymd(-DIAS_ATRAS)}
            max={ymd(DIAS_ADELANTE)}
            onChange={(e) => setFecha(e.target.value || ymd())}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[
              { txt: "Hoy", f: ymd() },
              { txt: "Ayer", f: ymd(-1) },
              { txt: "Anteayer", f: ymd(-2) },
            ].map((b) => (
              <button
                key={b.txt}
                type="button"
                onClick={() => setFecha(b.f)}
                className={`h-8 rounded-lg border px-3 text-[12px] font-medium transition-colors ${
                  fecha === b.f
                    ? "border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
                    : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:border-duo-azul/50"
                }`}
              >
                {b.txt}
              </button>
            ))}
            <span className="text-[12px] text-suave dark:text-suave-dark">
              Lista del <b className="text-titulo dark:text-titulo-dark">{nombreDia(fecha)}</b>
            </span>
          </div>
          {fecha !== ymd() ? (
            <p className="mt-2 text-[12px] text-duo-amarillo-sombra dark:text-duo-amarillo">
              Es la lista de otro día: los que pagaron hasta hoy no salen.
            </p>
          ) : null}
        </div>

        {/* Oficina (solo admin — el empleado ve automáticamente la suya) */}
        {isWebAdmin && (
          <SelectDuo
            label="Sucursal"
            value={oficinaId}
            onChange={(e) => setOficinaId(e.target.value)}
            placeholder="Todas las sucursales"
            options={oficinas.map((o) => ({ value: String(o.id), label: o.nombre }))}
          />
        )}

        {/* Leyenda: qué días trae y qué dice cada fila */}
        <div className="rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3.5">
          <div className="text-[11px] text-suave dark:text-suave-dark mb-2.5">
            Días que trae el reporte
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {DIAS_REPORTE.map((d) => (
              <div key={d.dias} className="flex items-center gap-2 text-[12px] min-w-0">
                <Chip tono={d.tono}>{d.dias}</Chip>
                <span className="text-titulo dark:text-titulo-dark truncate">
                  {d.texto} <span className="text-suave dark:text-suave-dark">· {fechaDelDia(d.sumar, fecha)}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-suave dark:text-suave-dark">
            Cada día trae lo mismo que el filtro <b>«Vence el»</b> de Pólizas con esa fecha: cuotas que vencen ese día
            (pagadas o no) y pólizas que terminan ese día.
          </p>

          <div className="mt-2.5 pt-2.5 border-t border-linea dark:border-linea-dark">
            <div className="text-[11px] text-suave dark:text-suave-dark mb-2">Columna «Pago»</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PAGO_REPORTE.map((p) => (
                <div key={p.txt} className="flex items-center gap-2 text-[12px] min-w-0">
                  <Chip tono={p.tono}>{p.txt}</Chip>
                  <span className="text-titulo dark:text-titulo-dark truncate">{p.texto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 🚨 Grúa: AMCA y La Equidad la dan a los 15 días de emitida (los lunes, también los del domingo). */}
          <div className="mt-2.5 pt-2.5 border-t border-linea dark:border-linea-dark flex items-center gap-2 text-[12px] min-w-0">
            <Chip tono="verde">GRÚA</Chip>
            <span className="text-titulo dark:text-titulo-dark">Hoy se les activó la grúa — avisarles (solo en el Excel)</span>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-linea dark:border-linea-dark flex items-center gap-2 text-[12px] min-w-0">
            <Chip tono="azul">OFERTAS</Chip>
            <span className="text-titulo dark:text-titulo-dark">Pagaron hace 14 días — ofrecerles otros seguros (solo en el Excel)</span>
          </div>
        </div>

        <p className="text-[11px] text-suave dark:text-suave-dark">
          Cada oficina baja solo lo suyo. Los clientes marcados con «No enviarle más» no salen.
        </p>
      </div>
    </ModalDuo>
  );
}