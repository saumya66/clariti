import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** seconds */
  delay?: number;
  /** px of upward travel */
  y?: number;
  /** px of horizontal travel (for slide-in-from-side) */
  x?: number;
  once?: boolean;
  as?: 'div' | 'span' | 'li' | 'tr';
}

/**
 * Lightweight scroll-reveal wrapper built on motion `whileInView`.
 * Respects prefers-reduced-motion via motion's reducedMotion handling.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  x = 0,
  once = true,
  as = 'div',
}: RevealProps) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
