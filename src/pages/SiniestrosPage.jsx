// src/pages/SiniestrosPage.jsx  (responsive)
//
// 🚨 Página de Siniestros.
// Orquesta todo: la planilla + wizard (alta/edición) + borrar.
// Es autónoma (no recibe props; la ruta la monta sola).
//
// 🆕 09/10 (tarde): PLANILLA DE COLORES (estilo Monday.com) en vez de la tabla.
//   - 🔥 Para hoy (lo urgente arriba) / 📋 Todos (agrupado por estado, cada uno con su color).
//   - Tocás el COLOR de un siniestro → lo pasás de estado ahí mismo (y queda en la bitácora).
//   - Tocás el NOMBRE → panel al costado: Novedades (bitácora), Datos, Papeles (fotos),
//     «Editar todo» (el wizard) y, si sos admin, Eliminar.
//   Todo eso vive en components/siniestros/PlanillaSiniestros.jsx.
import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { HiPlus, HiExclamationCircle } from "react-icons/hi";
import { toast } from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import {
  addSiniestro,
  editSiniestro,
  removeSiniestro,
  addFoto,
} from "../store/slices/siniestrosSlice";
import { invalidarCacheSiniestrosCliente } from "../hooks/useSiniestrosCliente";

import PlanillaSiniestros from "../components/siniestros/PlanillaSiniestros";
import SiniestrosWizard from "../components/siniestros/SiniestrosWizard";
import ModalDuo from "../components/ui/ModalDuo";
import Boton3D from "../components/ui/Boton3D";
import Badge from "../components/ui/Badge";

// Sube las fotos borrador (del wizard) al siniestro recién creado.
// 🐛 FIX: devuelve CUÁNTAS fotos no se pudieron adjuntar (antes fallaban calladas).
async function subirFotosBorrador(dispatch, siniestroId, draftFotos) {
  if (!Array.isArray(draftFotos) || draftFotos.length === 0) return 0;
  if (!siniestroId) return draftFotos.length;
  let fallidas = 0;
  for (const f of draftFotos) {
    try {
      await dispatch(addFoto({
        siniestro_id: Number(siniestroId),
        url: f.url,
        public_id: f.public_id,
        nombre: f.nombre || "",
        mime: f.mime || "image/jpeg",
      })).unwrap();
    } catch {
      // Si una foto falla no cortamos el resto, pero la contamos.
      fallidas++;
    }
  }
  return fallidas;
}

export default function SiniestrosPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;

  const { siniestros } = useSelector((s) => s.siniestros);
  const [sp, setSp] = useSearchParams();

  // Modales
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editData, setEditData] = useState(null);      // siniestro a editar (o null = alta)
  const [borrarSiniestro, setBorrarSiniestro] = useState(null);
  const [borrando, setBorrando] = useState(false);

  // (La lista la pide la planilla, y se actualiza sola 📡 en vivo.)

  const abiertos = useMemo(
    () => (siniestros || []).filter((s) => s.estado !== "CERRADO").length,
    [siniestros]
  );

  // ── Handlers ──────────────────────────────────────────
  const abrirAlta = () => { setEditData(null); setWizardOpen(true); };
  const abrirEdicion = (s) => { setEditData(s); setWizardOpen(true); };

  // El wizard llama esto con (payload, draftFotos)
  const handleGuardar = async (payload, draftFotos = []) => {
    if (editData?.id) {
      // Edición: no tocamos fotos borrador (se manejan desde el panel, en «Papeles»).
      const actualizado = await dispatch(editSiniestro({ id: editData.id, siniestro: payload })).unwrap();
      invalidarCacheSiniestrosCliente(actualizado?.cliente ?? payload.cliente);
      toast.success("Siniestro actualizado");
    } else {
      // Alta: creamos y luego subimos las fotos borrador.
      const creado = await dispatch(addSiniestro(payload)).unwrap();
      const fallidas = await subirFotosBorrador(dispatch, creado?.id, draftFotos);
      invalidarCacheSiniestrosCliente(creado?.cliente ?? payload.cliente);
      if (fallidas > 0) {
        // El siniestro quedó guardado: avisamos que faltan fotos (antes no decía nada).
        toast.error(
          `El siniestro se guardó, pero ${fallidas} foto${fallidas > 1 ? "s" : ""} no se ${fallidas > 1 ? "pudieron" : "pudo"} adjuntar. Agregala${fallidas > 1 ? "s" : ""} desde el siniestro, en «Papeles».`,
          { duration: 8000 }
        );
      } else {
        toast.success("Siniestro cargado");
      }
    }
    // El error se propaga y lo maneja el propio wizard (toast rojo).
  };

  const confirmarBorrado = async () => {
    if (!borrarSiniestro?.id || borrando) return;
    setBorrando(true);
    try {
      await dispatch(removeSiniestro(borrarSiniestro.id)).unwrap();
      invalidarCacheSiniestrosCliente(borrarSiniestro.cliente);
      toast.success("Siniestro eliminado");
      // Si estaba abierto en el panel del costado, se cierra.
      if (sp.get("ver") === String(borrarSiniestro.id)) {
        const p = new URLSearchParams(sp);
        p.delete("ver");
        setSp(p, { replace: true });
      }
      setBorrarSiniestro(null);
    } catch {
      toast.error("No se pudo eliminar el siniestro");
    } finally {
      setBorrando(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-0 py-4 sm:py-6 space-y-4"
    >
      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] flex items-center justify-center shrink-0">
            <HiExclamationCircle className="text-duo-rojo text-xl" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-titulo dark:text-titulo-dark">Siniestros</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[13px] text-suave dark:text-suave-dark">{siniestros?.length || 0} en total</span>
              {abiertos > 0 && <Badge tono="rojo" size="sm">{abiertos} abierto{abiertos !== 1 ? "s" : ""}</Badge>}
            </div>
          </div>
        </div>

        {/* 📱 Full-width en mobile; ancho natural en desktop (el wrapper w-auto lo encoge). */}
        <div className="w-full sm:w-auto shrink-0">
          <Boton3D variant="verde" full onClick={abrirAlta}>
            <HiPlus className="w-4 h-4" /> Nuevo siniestro
          </Boton3D>
        </div>
      </div>

      {/* ── La planilla de colores (con el panel del costado) ── */}
      <PlanillaSiniestros onEditar={abrirEdicion} onBorrar={setBorrarSiniestro} isWebAdmin={isWebAdmin} />

      {/* ── Wizard (alta / edición) ── */}
      <SiniestrosWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleGuardar}
        initialData={editData}
        isAdmin={isWebAdmin}
      />

      {/* ── Confirmar borrado ── */}
      <ModalDuo
        isOpen={!!borrarSiniestro}
        onClose={() => setBorrarSiniestro(null)}
        title="Eliminar siniestro"
        subtitle="Esta acción no se puede deshacer"
        icon={<HiExclamationCircle className="w-5 h-5" />}
        iconTono="rojo"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[14px] text-titulo dark:text-titulo-dark">
            ¿Seguro que querés eliminar el siniestro
            {borrarSiniestro?.cliente_label ? <> de <b className="font-medium">{borrarSiniestro.cliente_label}</b></> : ""}
            {borrarSiniestro?.id ? <> (#{borrarSiniestro.id})</> : ""}? Se borrarán también sus fotos y su bitácora.
          </p>
          <div className="flex gap-2">
            <Boton3D variant="blanco" full onClick={() => setBorrarSiniestro(null)} disabled={borrando}>
              Cancelar
            </Boton3D>
            <Boton3D variant="rojo" full onClick={confirmarBorrado} disabled={borrando}>
              {borrando ? "Eliminando..." : "Sí, eliminar"}
            </Boton3D>
          </div>
        </div>
      </ModalDuo>
    </motion.div>
  );
}
