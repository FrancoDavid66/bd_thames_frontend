// src/ux/motion/PageTransition.jsx
import { motion } from "framer-motion";
import { useMotionPrefs } from "./useMotionPrefs";
import { pageRight, opacityOnly } from "./variants";

const PageTransition = ({ children, className = "" }) => {
  const { prefersReducedMotion } = useMotionPrefs();
  return (
    <motion.main
      className={`min-h-dvh ${className}`}
      variants={prefersReducedMotion ? opacityOnly : pageRight}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {children}
    </motion.main>
  );
};

export default PageTransition;
