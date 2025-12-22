// src/components/estadisticas/AnimatedCard.jsx
import { motion } from "framer-motion";
import Card from "../comunes/Card";

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: 0.08 + i * 0.06 },
  }),
};

export default function AnimatedCard({ children, index = 0, glow, interactive = true }) {
  const baseGlow = glow || "from-sky-500/40 via-emerald-500/20 to-transparent";

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={interactive ? { scale: 1.03, y: -3 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      className="relative group"
    >
      <motion.div
        className={`pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-br ${baseGlow} opacity-40 group-hover:opacity-80 -z-10`}
        animate={{ opacity: [0.25, 0.65, 0.25] }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.25,
        }}
      />
      <Card>{children}</Card>
    </motion.div>
  );
}
