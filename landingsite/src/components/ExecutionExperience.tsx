import { motion } from 'motion/react';
import Eyebrow from './Eyebrow';
import Reveal from './Reveal';
import RunnerMockup from './RunnerMockup';
import { CheckIcon } from './Icons';

const CHECKS = [
  'Watch every step live',
  'Step in and guide it',
  'Every run recorded',
  'Replay any run, anytime',
];

export default function ExecutionExperience() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-28 sm:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Reveal className="flex">
            <Eyebrow>THE EXECUTION EXPERIENCE</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight text-white">
              See everything. A <span className="text-gradient">glass box,</span> not a black box.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/55">
              Watch each step as it happens — what Clariti did, why, and what it found. Jump in and
              steer it anytime. And because every run is saved step by step, you can replay exactly
              what happened whenever you need to.
            </p>
          </Reveal>

          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CHECKS.map((c, i) => (
              <motion.li
                key={c}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2.5 text-sm text-white/70"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                  <CheckIcon className="h-3 w-3" strokeWidth={2.5} />
                </span>
                {c}
              </motion.li>
            ))}
          </ul>
        </div>

        <Reveal delay={0.1} x={0} y={30}>
          <RunnerMockup animateLog />
        </Reveal>
      </div>
    </section>
  );
}
