import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import { springs } from './motion';

/**
 * The app's one and only like affordance — spring pop on the heart plus an
 * 8-particle burst in the sunset accent colors. Replaces every plain
 * color-flip heart so the reward moment feels identical everywhere.
 *
 * Honors prefers-reduced-motion: the heart still fills, but nothing flies.
 */
export default function LikeButton({
  liked,
  count,
  onToggle,
  size = 'md',
  variant = 'pill',
  compact = false,
  label,
}: {
  liked: boolean;
  count?: number;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'rail' | 'plain';
  compact?: boolean;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);

  const particles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2 + 0.4;
        return {
          id: index,
          x: Math.cos(angle) * 26,
          y: Math.sin(angle) * 26,
          color: index % 2 === 0 ? 'var(--accent)' : 'var(--accent-gold)',
        };
      }),
    [],
  );

  const handleClick = () => {
    if (!liked && !reduced) setBurstKey((key) => key + 1);
    onToggle();
  };

  const iconSize = size === 'lg' ? 26 : size === 'sm' ? 16 : 19;

  return (
    <motion.button
      type="button"
      className={`like-button like-${variant} like-${size} ${liked ? 'liked' : ''}`}
      onClick={handleClick}
      whileTap={reduced ? undefined : { scale: 0.88 }}
      transition={springs.snappy}
      aria-pressed={liked}
      aria-label={label || (liked ? 'Unlike' : 'Like')}
    >
      <span className="like-heart-wrap">
        <motion.span
          className="like-heart"
          animate={
            reduced || !liked
              ? { scale: 1 }
              : { scale: [1, 1.4, 0.92, 1.08, 1] }
          }
          transition={liked && !reduced ? { duration: 0.5, times: [0, 0.3, 0.55, 0.8, 1] } : { duration: 0.2 }}
        >
          <Heart width={iconSize} height={iconSize} fill={liked ? 'currentColor' : 'none'} />
        </motion.span>

        <AnimatePresence>
          {burstKey > 0 && (
            <span key={burstKey} className="like-burst" aria-hidden="true">
              {particles.map((particle) => (
                <motion.i
                  key={particle.id}
                  style={{ background: particle.color }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: particle.x, y: particle.y, opacity: 0, scale: 0.35 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                />
              ))}
            </span>
          )}
        </AnimatePresence>
      </span>

      {typeof count === 'number' && <AnimatedNumber value={count} compact={compact} className="like-count" />}
    </motion.button>
  );
}
