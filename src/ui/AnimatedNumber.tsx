import { useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { compactCount } from './format';
import { pressable, springs } from './motion';

/**
 * Counters that roll instead of jumping. Tabular numerals (via .num-roll)
 * keep digit widths constant, so the animation never shifts layout.
 */
export default function AnimatedNumber({
  value,
  className = '',
  compact = false,
}: {
  value: number;
  className?: string;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const formatted = compact ? compactCount(value) : value.toLocaleString();

  if (reduced) {
    return <span className={`num-roll ${className}`}>{formatted}</span>;
  }

  return <RollingNumber value={value} className={className} compact={compact} />;
}

function RollingNumber({
  value,
  className,
  compact,
}: {
  value: number;
  className: string;
  compact: boolean;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;

    const controls = animate(from, value, {
      duration: 0.55,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value]);

  return <span className={`num-roll ${className}`}>{compact ? compactCount(display) : display.toLocaleString()}</span>;
}

/** Physical tap wrapper: 0.96 press-down + spring release. Use for any
 *  button/affordance that should feel touchable. */
export function Tap({
  children,
  className,
  onClick,
  ariaLabel,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      {...pressable}
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      type="button"
    >
      {children}
    </motion.button>
  );
}

/** Small spring-in wrapper for badges/moments (gem confirmation etc.). */
export function PopIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springs.bouncy}
    >
      {children}
    </motion.div>
  );
}
