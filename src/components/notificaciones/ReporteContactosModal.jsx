// src/components/notificaciones/ReporteContactosModal.jsx
//
// 📋 Descarga el reporte de contactos pendientes (PDF o Excel) para gestión
// manual — por si el envío automático de WhatsApp falla algún día.
//
// El backend YA arma todo (notificaciones/services_reporte_contactos.py):
//   GET /api/notificaciones/cuotas/reporte-contactos/?formato=pdf|excel&oficina=1
// Este modal solo junta los filtros y dispara la descarga.
//
// El reporte trae MÁS casos que el WhatsApp automático (que solo manda en
// -30, -3, 0 y +3 días): agrega -7, -2 y +1, y suma filas "VENTA" para los
// clientes que pagaron hace 14 días (buen momento para ofrecerles otro seguro).

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { HiDownload, HiDocumentReport, HiDocumentText, HiTable } from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import { PolizasAPI } from "../../api/polizas";

import ModalDuo from "../ui/ModalDuo";
import SelectDuo from "../ui/SelectDuo";
import Boton3D from "../ui/Boton3D";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

// 🏷️ Leyenda de qué trae el reporte. Los tonos son solo visuales (no vienen
// del backend); replican los mismos colores que usa services_reporte_contactos.py.
const DELTAS_REPORTE = [
  { estado: "-30", texto: "Último aviso (cobertura perdida hace tiempo)", tono: "rojo" },
  { estado: "-7", texto: "Vencida hace una semana", tono: "rojo" },
  { estado: "-3", texto: "Pago pendiente", tono: "rojo" },
  { estado: "-2", texto: "Aviso de baja (mañana se da de baja)", tono: "rojo" },
  { estado: "0", texto: "Vence hoy", tono: "amarillo" },
  { estado: "+1", texto: "Vence mañana", tono: "amarillo" },
  { estado: "+3", texto: "Faltan unos días", tono: "verde" },
  { estado: "+7", texto: "Falta una semana", tono: "verde" },
];

export default function ReporteContactosModal({ open, onClose }) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [formato, setFormato] = useState("pdf");
  const [oficinaId, setOficinaId] = useState("");
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
    }
  }, [open]);

  const descargar = async () => {
    setDescargando(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
      const params = new URLSearchParams();
      params.set("formato", formato === "excel" ? "excel" : "pdf");
      if (isWebAdmin && oficinaId) params.set("oficina", oficinaId);

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
      toast.error("No se pudo generar el reporte");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <ModalDuo
      isOpen={open}
      onClose={descargando ? () => {} : onClose}
      title="Reporte de contactos pendientes"
      subtitle="Para gestión manual, por si el envío automático falla"
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

        {/* Leyenda: qué incluye el reporte */}
        <div className="rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3.5">
          <div className="text-[11px] text-suave dark:text-suave-dark mb-2.5">
            El reporte incluye
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {DELTAS_REPORTE.map((d) => (
              <div key={d.estado} className="flex items-center gap-2 text-[12px]">
                <span
                  className={`shrink-0 w-9 text-center rounded px-1 py-0.5 text-[10px] font-semibold ${
                    d.tono === "rojo"
                      ? "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo"
                      : d.tono === "amarillo"
                      ? "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo"
                      : "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
                  }`}
                >
                  {d.estado}
                </span>
                <span className="text-titulo dark:text-titulo-dark">{d.texto}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-linea dark:border-linea-dark flex items-center gap-2 text-[12px]">
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul">
              VENTA
            </span>
            <span className="text-titulo dark:text-titulo-dark">Pagaron hace 14 días — para ofrecerles otros seguros</span>
          </div>
        </div>

        <p className="text-[11px] text-suave dark:text-suave-dark">
          Los recordatorios automáticos por WhatsApp solo cubren -30, -3, 0 y +3 días. Este reporte trae más casos, para poder contactarlos a mano.
        </p>
      </div>
    </ModalDuo>
  );
}