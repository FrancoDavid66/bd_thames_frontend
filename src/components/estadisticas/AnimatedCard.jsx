// src/components/estadisticas/AnimatedCard.jsx
import { motion } from "framer-motion";

export default function AnimatedCard({ children, index = 0, interactive = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.04 + index * 0.04, ease: "easeOut" }}
      whileHover={interactive ? { y: -2 } : undefined}
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm"
    >
      {children}
    </motion.div>
  );
}