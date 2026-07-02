import { motion } from 'motion/react';
import ScrollTextBand from './ScrollTextBand';

const LINES = [
  { text: "You didn't hire brilliant engineers to babysit test scripts.", strong: true },
  {
    text: 'Think about your best QA person. They never read your code. They opened the app, clicked around like a real user, noticed when something felt off, and asked when they weren\u2019t sure.',
    strong: false,
  },
  { text: "That's testing. Clariti finally does it that way.", strong: true },
];

export default function Manifesto() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      {/* starfield */}
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.12), transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {LINES.map((l, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, filter: 'blur(8px)', y: 16 }}
            whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            viewport={{ once: true, margin: '0px 0px -20% 0px' }}
            transition={{ duration: 0.8, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={
              l.strong
                ? 'mx-auto mb-6 max-w-3xl text-[clamp(1.6rem,3.6vw,2.75rem)] font-extrabold leading-[1.15] tracking-tight text-white'
                : 'mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-white/55 sm:text-xl'
            }
          >
            {l.strong && i === LINES.length - 1 ? (
              <>
                That&apos;s testing. <span className="text-gradient">Clariti finally does it that way.</span>
              </>
            ) : (
              l.text
            )}
          </motion.p>
        ))}
      </div>

      <div className="relative z-10 mt-16">
        <ScrollTextBand text="SEES YOUR UI · THINKS LIKE A TESTER · ASKS WHEN UNSURE · JUDGES THE RESULT · WORKS EVERYWHERE · " />
      </div>
    </section>
  );
}
