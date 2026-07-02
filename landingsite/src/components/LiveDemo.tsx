import Eyebrow from './Eyebrow';
import Reveal from './Reveal';
import RunnerMockup from './RunnerMockup';
import CountUp from './CountUp';
import { WatchDemoButton } from './CTAButtons';

const STATS = [
  { value: 8, suffix: '', label: 'steps taken' },
  { value: 1, suffix: '', label: 'bug caught' },
  { value: 0, suffix: '', label: 'tests written' },
];

export default function LiveDemo() {
  return (
    <section id="demo" className="relative overflow-hidden py-28 sm:py-36">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(124,58,237,0.12), transparent 70%)' }}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <div className="text-center">
          <Reveal className="flex justify-center">
            <Eyebrow>LIVE DEMO</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mx-auto mt-5 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight text-white">
              Watch it catch a bug <span className="text-gradient">your tests would miss.</span>
            </h2>
          </Reveal>
        </div>

        <Reveal delay={0.1} y={36} className="mt-12">
          <RunnerMockup animateLog />
        </Reveal>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
                <div className="text-4xl font-extrabold text-gradient sm:text-5xl">
                  <CountUp to={s.value} suffix={s.suffix} />
                </div>
                <p className="mt-2 text-sm text-white/50">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15} className="mt-10 flex justify-center">
          <WatchDemoButton size="lg" variant="light" />
        </Reveal>
      </div>
    </section>
  );
}
