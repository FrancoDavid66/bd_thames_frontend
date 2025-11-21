// src/ux/motion/variants.js
// Duraciones cortas (180–240 ms). Cartoon-like suave, sin abrumar.

const D = 0.20; // segundos
const E_SPRING = { type: "spring", damping: 22, stiffness: 240, mass: 0.9 };
const E_SOFT = { type: "tween", ease: "easeOut" };

// Para usuarios con "reduce motion"
export const opacityOnly = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: D, ...E_SOFT } },
  exit: { opacity: 0, y: 12, transition: { duration: D, ...E_SOFT } },
};

export const listStagger = (stagger = 0.06) => ({
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: stagger, delayChildren: 0.02 },
  },
});

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: D, ...E_SOFT } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: D, ...E_SOFT } },
};

export const pageRight = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: D, ...E_SOFT } },
  exit: { opacity: 0, x: -16, transition: { duration: D, ...E_SOFT } },
};

export const hoverLift = {
  initial: { y: 0 },
  hover: { y: -2, transition: { duration: 0.15 } },
  tap: { scale: 0.98, transition: { duration: 0.12 } },
};

export const pressable = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.12 } },
  tap: { scale: 0.98, transition: { duration: 0.12 } },
};

// Item para listas (usa fadeInUp)
export const listItem = fadeInUp;

// Swipe (approve/reject) con feedback suave
export const swipeCard = {
  initial: { rotate: 0, scale: 1, opacity: 1 },
  drag: { scale: 1.02, rotate: 2, transition: E_SPRING },
  approve: { x: 480, rotate: 12, opacity: 0, transition: E_SPRING },
  reject: { x: -480, rotate: -12, opacity: 0, transition: E_SPRING },
  back: { x: 0, rotate: 0, scale: 1, opacity: 1, transition: E_SPRING },
};
