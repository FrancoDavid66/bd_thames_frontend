// src/components/gruas/PlanesPanel.jsx
import { motion } from "framer-motion";
import { HiViewList } from "react-icons/hi";
import PlanManager from "./PlanManager";

export default function PlanesPanel() {
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header simple */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <HiViewList className="text-xl" />
          Planes de asistencia
        </h3>
      </div>

      {/* Solo listado + botón “Nuevo plan” (modal dentro de PlanManager) */}
      <PlanManager />
    </motion.div>
  );
}
