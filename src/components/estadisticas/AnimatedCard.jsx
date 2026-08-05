// src/components/estadisticas/AnimatedCard.jsx  (diseño Duo)
import { motion } from "framer-motion";

export default function AnimatedCard({ children, index = 0, interactive = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.04 + index * 0.04, ease: "easeOut" }}
      whileHover={interactive ? { y: -2 } : undefined}
      className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5"
    >
      {children}
    </motion.div>
  );
}
