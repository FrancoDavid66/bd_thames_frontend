// src/ux/motion/useMotionPrefs.js
import { useReducedMotion } from "framer-motion";

export const useMotionPrefs = () => {
  const prefersReducedMotion = useReducedMotion();
  return { prefersReducedMotion };
};
