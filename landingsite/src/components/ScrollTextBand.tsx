import { motion, useScroll, useTransform } from 'motion/react';

interface ScrollTextBandProps {
  /** repeated pill text, e.g. "VISION · REASONING · ..." */
  text: string;
  className?: string;
}

/**
 * Scroll-linked horizontal text band. As the page scrolls vertically, the two
 * rows drift horizontally in opposite directions (driven by scrollY), on top of
 * a base auto-marquee so it's alive even when static.
 */
export default function ScrollTextBand({ text, className = '' }: ScrollTextBandProps) {
  const { scrollY } = useScroll();
  const driftLeft = useTransform(scrollY, (v) => (v % 4000) * -0.15);
  const driftRight = useTransform(scrollY, (v) => (v % 4000) * 0.15);

  const words = `${text}  ${text}  ${text}`;

  return (
    <div className={`relative select-none overflow-hidden py-4 ${className}`} aria-hidden="true">
      <motion.div style={{ x: driftLeft }} className="flex whitespace-nowrap">
        <span className="text-gradient bg-clip-text font-sans text-[13vw] font-extrabold leading-none tracking-tight sm:text-[9vw] md:text-[7vw]">
          {words}
        </span>
      </motion.div>
      <motion.div style={{ x: driftRight }} className="mt-1 flex whitespace-nowrap">
        <span
          className="font-sans text-[13vw] font-extrabold leading-none tracking-tight text-transparent sm:text-[9vw] md:text-[7vw]"
          style={{ WebkitTextStroke: '1px rgba(168,85,247,0.28)' }}
        >
          {words}
        </span>
      </motion.div>
    </div>
  );
}
