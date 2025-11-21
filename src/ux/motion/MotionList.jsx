// src/ux/motion/MotionList.jsx
import { motion } from "framer-motion";
import { useMotionPrefs } from "./useMotionPrefs";
import { listStagger, listItem, opacityOnly } from "./variants";

export const MotionList = ({ children, as = "ul", className = "" }) => {
  const { prefersReducedMotion } = useMotionPrefs();
  const C = motion[as] || motion.ul;

  return (
    <C
      className={className}
      variants={prefersReducedMotion ? opacityOnly : listStagger()}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      {children}
    </C>
  );
};

export const MotionListItem = ({ children, as = "li", className = "", ...rest }) => {
  const I = motion[as] || motion.li;
  return (
    <I className={className} variants={listItem} {...rest}>
      {children}
    </I>
  );
};

export default MotionList;
