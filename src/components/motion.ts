import type { Variants } from "framer-motion";

// Shared staggered fade-in used by every page section. Framer Motion honours
// prefers-reduced-motion through <MotionConfig reducedMotion="user"> in App.
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
