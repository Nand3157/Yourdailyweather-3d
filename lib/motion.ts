import type { Transition } from "motion/react";

/**
 * The product's single motion voice: one spring for entrances and
 * interactions (Material-3 style — springs interrupt gracefully).
 * Components pair it with useReducedMotion(): when the user asks for
 * reduced motion, everything collapses to a near-instant opacity fade.
 */
export const SPRING: Transition = { type: "spring", stiffness: 260, damping: 30 };

/** useReducedMotion() yields boolean | null (null = not yet mounted). */
export function motionTransition(reduced: boolean | null): Transition {
  return reduced ? { duration: 0.15 } : SPRING;
}
