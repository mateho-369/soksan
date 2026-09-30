import type { Transition } from 'framer-motion';

/**
 * Shared Framer Motion presets — the ONLY spring definitions in the app.
 * Every animated component imports from here so motion feels identical on
 * every screen (and tuning is a one-file change).
 */
export const springs = {
  /** Buttons, chips — quick physical response. */
  snappy: { type: 'spring', stiffness: 520, damping: 24, mass: 0.7 } as Transition,
  /** Like button pop, badges — playful overshoot. */
  bouncy: { type: 'spring', stiffness: 420, damping: 13, mass: 0.8 } as Transition,
  /** Cards entering a list — soft landing. */
  gentle: { type: 'spring', stiffness: 260, damping: 26 } as Transition,
} as const;

/** Press-down feedback applied to every tappable element. */
export const pressable = {
  whileTap: { scale: 0.96 },
  transition: springs.snappy,
} as const;

/** Staggered list entrance (used with a motion parent `variants`). */
export const staggerList = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
} as const;

export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: springs.gentle },
} as const;
