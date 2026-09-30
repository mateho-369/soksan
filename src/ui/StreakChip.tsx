import { motion, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useStreak } from './useStreak';
import { springs } from './motion';

export default function StreakChip() {
  const streak = useStreak();
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={`streak-chip ${streak.isNewToday ? 'fresh' : ''}`}
      initial={reduced ? false : { opacity: 0, scale: 0.7, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={springs.bouncy}
      title={`${streak.count} day streak`}
      aria-label={`${streak.count} day opening streak`}
    >
      <Flame size={14} strokeWidth={2.6} />
      <b className="num-roll">{streak.count}</b>
    </motion.div>
  );
}
