// src/components/polizas/vehiculo/VehiculoSection.jsx
import { motion } from "framer-motion";
import VehicleProfileCard from "./VehicleProfileCard";
import VehicleInfoCard from "./VehicleInfoCard";
import VehicleGallery from "./VehicleGallery";

const shell = "rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-xl shadow-black/20";

export default function VehiculoSection({ poliza, onPerfilChange }) {
  const polizaId = poliza?.id ?? null;

  return (
    <div className="space-y-8">
      {/* HERO con foto + resumen a la derecha */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        className={`${shell} overflow-hidden`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr]">
          <VehicleProfileCard poliza={poliza} onPerfilChange={onPerfilChange} />
          <VehicleInfoCard poliza={poliza} onSaved={onPerfilChange} />
        </div>
      </motion.section>

      {/* GALERÍA tipo tablero, con tarjeta “Agregar” embebida */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}
      >
        <VehicleGallery
          polizaId={polizaId}
          currentPerfilUrl={
            poliza?.foto_perfil_url || poliza?.foto_perfil || poliza?.avatar_vehiculo_url || null
          }
          onChanged={onPerfilChange}
        />
      </motion.section>
    </div>
  );
}
