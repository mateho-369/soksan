import { motion, useReducedMotion } from 'framer-motion';
import { staggerItem, staggerList } from './motion';

/**
 * Wraps list items so they fade + slide in staggered instead of popping in
 * all at once. The parent must be a motion element (or wrap your own) —
 * this component renders the animated container + exposes item variants.
 */
export default function StaggerList({
  children,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'section';
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[Tag];

  return (
    <MotionTag className={className} variants={staggerList} initial="hidden" animate="show">
      {children}
    </MotionTag>
  );
}

/** Wrap each child of StaggerList in this to get the entrance animation. */
export function StaggerItem({
  children,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[Tag];

  return (
    <MotionTag className={className} variants={staggerItem}>
      {children}
    </MotionTag>
  );
}
