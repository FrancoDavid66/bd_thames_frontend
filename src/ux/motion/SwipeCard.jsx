// src/ux/motion/SwipeCard.jsx
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { swipeCard } from "./variants";

/**
 * Uso:
 * <SwipeCard onApprove={() => {}} onReject={() => {}}>
 *   ...contenido...
 * </SwipeCard>
 */
const THRESHOLD = 120;

const SwipeCard = ({ children, onApprove, onReject, className = "" }) => {
  const [leaving, setLeaving] = useState(null); // "approve" | "reject" | null
  const ref = useRef(null);

  return (
    <motion.div
      ref={ref}
      className={`select-none touch-pan-y ${className}`}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      variants={swipeCard}
      initial="initial"
      whileDrag="drag"
      animate={leaving ? leaving : "back"}
      onDragEnd={(_, info) => {
        if (info.offset.x > THRESHOLD) {
          setLeaving("approve");
          onApprove && onApprove();
        } else if (info.offset.x < -THRESHOLD) {
          setLeaving("reject");
          onReject && onReject();
        }
      }}
    >
      {children}
    </motion.div>
  );
};

export default SwipeCard;
