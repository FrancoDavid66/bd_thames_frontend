// src/pages/SolicitudesPage.jsx
//
// 🧹 SIMPLIFICADA: Solicitudes ya NO muestra la lista de solicitudes.
//    Esas tareas (enviar póliza, subir póliza, etc.) viven ahora en el módulo
//    de Tareas. Acá SOLO se crean solicitudes nuevas.
//
//    → Muestra una pantalla de bienvenida con el botón "Nueva Solicitud".
//    → El modal se abre solo al tocar el botón.
//
//    Beneficio: cero llamadas repetidas al backend (antes había 2 relojes
//    pidiendo la lista ~15 veces/min). Carga instantánea.

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HiPlus } from "react-icons/hi";

import { useAuth } from "../context/AuthContext";
import { fetchAdminCompanias, fetchAdminCoberturas } from "../store/slices/adminSlice";

import NuevaSolicitudModal from "../components/solicitudes/NuevaSolicitudModal";

import PageTransition from "../ux/motion/PageTransition.jsx";
import Boton3D from "../components/ui/Boton3D";

export default function SolicitudesPage() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { companias, coberturas } = useSelector((state) => state.admin);

  const [oficinasConfig, setOficinasConfig] = useState([]);
  const [creating, setCreating] = useState(false);

  // Catálogos que necesita el modal (compañías / coberturas)
  useEffect(() => {
    dispatch(fetchAdminCompanias());
    dispatch(fetchAdminCoberturas());
  }, [dispatch]);

  // Oficinas (para que el admin elija sucursal en el modal)
  useEffect(() => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");
    const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
    fetch(`${API_BASE}/usuarios/oficinas/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Ruta de oficinas no encontrada");
        return res.json();
      })
      .then((data) => {
        const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setOficinasConfig(arr);
      })
      .catch((err) => console.error("Error cargando oficinas:", err));
  }, []);

  const nombreOficina = user?.perfil?.oficina_nombre || "tu sucursal";

  return (
    <PageTransition>
      <section className="min-h-full bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark flex items-center justify-center p-6">
        {/* Pantalla de bienvenida (se ve cuando el modal está cerrado) */}
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 h-24 w-24 rounded-3xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-2 border-duo-verde flex items-center justify-center text-5xl">
            📝
          </div>
          <h1 className="text-3xl font-black text-titulo dark:text-titulo-dark mb-2">Altas</h1>
          <p className="text-[14px] font-bold text-suave dark:text-suave-dark mb-8">
            Dá de alta una póliza nueva para {nombreOficina}. El seguimiento (enviar póliza, subir póliza…) lo
            vas a ver en <b className="text-titulo dark:text-titulo-dark">Tareas del día</b>.
          </p>
          <div className="max-w-xs mx-auto">
            <Boton3D variant="verde" full size="lg" onClick={() => setCreating(true)}>
              <HiPlus /> Nueva Alta
            </Boton3D>
          </div>
        </div>

        {/* MODAL: Nueva Solicitud */}
        {creating && (
          <NuevaSolicitudModal
            onClose={() => setCreating(false)}
            onCreated={() => {
              /* No refrescamos ninguna lista: ya no hay lista acá. */
            }}
            companias={companias}
            coberturas={coberturas}
            oficinas={oficinasConfig}
          />
        )}
      </section>
    </PageTransition>
  );
}