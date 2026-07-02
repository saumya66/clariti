import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import Eyebrow from './Eyebrow';
import Reveal from './Reveal';
import { EyeIcon, SparkIcon, ArrowRight, QuestionIcon, GavelIcon } from './Icons';

const NODES = [
  { key: 'SEE', Icon: EyeIcon, desc: 'Looks at the screen like a user.' },
  { key: 'THINK', Icon: SparkIcon, desc: 'Decides what to do next.' },
  { key: 'ACT', Icon: ArrowRight, desc: 'Clicks, types, moves through the app.' },
  { key: 'ASK', Icon: QuestionIcon, desc: 'Checks with you when unsure.' },
  { key: 'JUDGE', Icon: GavelIcon, desc: 'Decides what passed and what broke.' },
];

const SIZE = 460;
const R = 168;
const CENTER = SIZE / 2;

// node positions around a circle, starting at top
const positions = NODES.map((_, i) => {
  const angle = (-90 + i * (360 / NODES.length)) * (Math.PI / 180);
  return { x: CENTER + R * Math.cos(angle), y: CENTER + R * Math.sin(angle) };
});

export default function AgenticLoop() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = setInterval(() => setActive((a) => (a + 1) % NODES.length), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36">
      <div className="text-center">
        <Reveal className="flex justify-center">
          <Eyebrow>HOW IT THINKS</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mx-auto mt-5 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight text-white">
            Testing, the way a <span className="text-gradient">human does it.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
            Every test is a loop — look, decide, try, ask if unsure, judge the result — repeated
            until the job&apos;s done. The same loop your QA team runs in their head. Now it runs on
            its own.
          </p>
        </Reveal>
      </div>

      {/* Circular diagram (md+) */}
      <div className="mt-16 hidden justify-center md:flex">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          {/* ring */}
          <svg className="absolute inset-0" width={SIZE} height={SIZE} aria-hidden="true">
            <circle
              cx={CENTER}
              cy={CENTER}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1.5}
              strokeDasharray="4 6"
            />
          </svg>

          {/* traveling token */}
          <motion.div
            className="absolute z-20 h-4 w-4 rounded-full bg-violet-400 shadow-[0_0_24px_6px_rgba(168,85,247,0.6)]"
            animate={{
              left: positions[active].x - 8,
              top: positions[active].y - 8,
            }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ left: positions[0].x - 8, top: positions[0].y - 8 }}
          />

          {/* center label */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="font-mono text-[11px] tracking-[0.25em] text-white/30">THE LOOP</p>
            <p className="mt-1 text-2xl font-extrabold text-white">
              {NODES[active].key}
            </p>
            <p className="mx-auto mt-1 max-w-[150px] text-xs leading-snug text-white/45">
              {NODES[active].desc}
            </p>
          </div>

          {/* nodes */}
          {NODES.map((n, i) => {
            const isActive = i === active;
            const { x, y } = positions[i];
            const Icon = n.Icon;
            return (
              <div
                key={n.key}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: x, top: y }}
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.12 : 1,
                    borderColor: isActive ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.1)',
                    backgroundColor: isActive ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.03)',
                  }}
                  transition={{ duration: 0.4 }}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-2xl border backdrop-blur-sm"
                >
                  <Icon
                    className={`h-6 w-6 ${isActive ? 'text-violet-300' : 'text-white/40'}`}
                    strokeWidth={1.75}
                  />
                  <span
                    className={`font-mono text-[11px] font-semibold tracking-wide ${isActive ? 'text-white' : 'text-white/50'}`}
                  >
                    {n.key}
                  </span>
                </motion.div>
                {/* ASK → human branch */}
                {n.key === 'ASK' && (
                  <motion.div
                    animate={{ opacity: isActive ? 1 : 0.3 }}
                    className="absolute left-1/2 top-full mt-2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/50"
                  >
                    <span>🧑</span> you
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical list (mobile) */}
      <div className="mt-12 space-y-3 md:hidden">
        {NODES.map((n, i) => {
          const Icon = n.Icon;
          return (
            <Reveal key={n.key} delay={i * 0.06}>
              <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 ring-1 ring-violet-400/25">
                  <Icon className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <p className="font-mono text-xs font-semibold tracking-wide text-white">{n.key}</p>
                  <p className="text-sm text-white/55">{n.desc}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
