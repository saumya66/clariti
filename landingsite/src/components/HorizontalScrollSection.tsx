import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface HorizontalScrollSectionProps {
  children: ReactNode;
  /** height of the scroll track in vh; larger = slower horizontal travel */
  trackVh?: number;
  /** how far the inner track translates, e.g. ["0%", "-66%"] */
  xRange?: [string, string];
  className?: string;
  /** stack vertically below this width (px) */
  mobileBreakpoint?: number;
}

/**
 * Sticky pinned horizontal scroll: a tall outer container pins an inner viewport
 * and translates its track along X as you scroll vertically. Falls back to a
 * normal vertical stack on small screens / reduced motion.
 */
export default function HorizontalScrollSection({
  children,
  trackVh = 300,
  xRange = ['0%', '-66%'],
  className = '',
  mobileBreakpoint = 768,
}: HorizontalScrollSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const check = () =>
      setPinned(window.innerWidth >= mobileBreakpoint && !mqReduced.matches);
    check();
    window.addEventListener('resize', check);
    mqReduced.addEventListener?.('change', check);
    return () => {
      window.removeEventListener('resize', check);
      mqReduced.removeEventListener?.('change', check);
    };
  }, [mobileBreakpoint]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });
  const x = useTransform(scrollYProgress, [0, 1], xRange);

  if (!pinned) {
    return (
      <div className={`flex flex-col gap-8 ${className}`}>{children}</div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: `${trackVh}vh` }} className={className}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <motion.div style={{ x }} className="flex gap-8 px-6 sm:px-10 will-change-transform">
          {children}
        </motion.div>
      </div>
    </div>
  );
}
