import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PopIn } from './AnimatedNumber';
import { springs } from './motion';

export function GemToast({
  moment,
  onDismiss,
}: {
  moment: { postId: number; title: string } | null;
  onDismiss: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          className="gem-toast"
          role="status"
          initial={reduced ? false : { opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={springs.bouncy}
          onClick={onDismiss}
        >
          <PopIn className="gem-icon">💎</PopIn>
          <div>
            <strong>Hidden gem confirmed!</strong>
            <p>Your post about {moment.title} is helping travelers find it.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
