import Eyebrow from './Eyebrow';
import Reveal from './Reveal';

const CARDS = [
  {
    title: 'Your engineers spend more time on tests than features',
    body: 'Every sprint, your most expensive people write and rewrite test code instead of shipping product.',
  },
  {
    title: "Your tests don't test what users see",
    body: 'They check functions, not the screen. The overlapping button, the endless spinner, the broken empty state — your customers catch those, not your suite.',
  },
  {
    title: 'Web, iOS, Android — you build QA three times',
    body: 'Different platforms, different tools, different scripts, different people, testing the same flows from scratch.',
  },
  {
    title: 'One small change turns the whole suite red',
    body: 'A rename or a redesign, and half your tests break. Eventually the team stops trusting them — and starts skipping them.',
  },
];

export default function ProblemSection() {
  return (
    <section id="problem" className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36">
      <div className="max-w-3xl">
        <Reveal>
          <Eyebrow>SOUND FAMILIAR?</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight text-white">
            Testing is quietly slowing your <span className="text-gradient">whole team</span> down.
          </h2>
        </Reveal>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08} className="h-full">
            <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/25 hover:bg-white/[0.04]">
              <span className="absolute inset-y-5 left-0 w-[3px] rounded-full bg-gradient-to-b from-violet-400 to-indigo-500" />
              <span className="font-mono text-xs text-white/30">0{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold leading-snug text-white">{c.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/50">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
