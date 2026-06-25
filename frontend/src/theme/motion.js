// ─────────────────────────────────────────────────────────────
// CredChain motion system — shared Framer Motion presets.
// Honor prefers-reduced-motion at the component level via useReducedMotion().
// ─────────────────────────────────────────────────────────────

export const ease = {
  out: [0.16, 1, 0.3, 1], // smooth decel — entrances
  inOut: [0.65, 0, 0.35, 1], // moves
  spring: { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 },
  softSpring: { type: 'spring', stiffness: 220, damping: 26 },
};

export const dur = { micro: 0.15, base: 0.25, slow: 0.4 };

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
  exit: { opacity: 0, y: 8, transition: { duration: dur.micro } },
};

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: dur.base } },
  exit: { opacity: 0, transition: { duration: dur.micro } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: ease.spring },
  exit: { opacity: 0, scale: 0.98, transition: { duration: dur.micro } },
};

export const stagger = (gap = 0.06) => ({
  animate: { transition: { staggerChildren: gap } },
});

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
  exit: { opacity: 0, y: -8, transition: { duration: dur.micro } },
};

// hover lift for cards/buttons
export const hoverLift = { whileHover: { y: -2 }, whileTap: { scale: 0.98 } };
