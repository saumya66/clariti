import { motion } from 'motion/react';
import Eyebrow from './Eyebrow';
import { EyeIcon, SparkIcon, QuestionIcon, GavelIcon, CheckIcon } from './Icons';
import AppWindow from './AppWindow';

// ── Per-pillar mockups ──────────────────────────────────────────────────────

function VisionMock() {
  return (
    <AppWindow breadcrumb="clariti › scan › viewport 1280×800">
      <div className="relative p-5">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          <div className="h-2.5 w-24 rounded bg-white/15" />
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <div className="h-8 rounded-md border border-rose-400/40 bg-rose-400/5" />
              <span className="absolute -top-2 right-2 rounded bg-rose-500/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white">
                text truncated
              </span>
            </div>
            <div className="h-8 w-16 rounded-md bg-violet-500/70" />
          </div>
          <div className="mt-3 h-2 w-3/4 rounded bg-white/10" />
          <div className="mt-2 h-2 w-1/2 rounded bg-white/10" />
        </div>
        <div className="mt-3 flex items-center justify-between font-mono text-[11px]">
          <span className="text-white/30">CTA · ok</span>
          <span className="rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-rose-300">
            2 visual issues
          </span>
        </div>
      </div>
    </AppWindow>
  );
}

function ThinkMock() {
  const steps = [
    'Goal: complete checkout with a coupon.',
    'I see a cart with 2 items → click "Checkout".',
    'A coupon field appeared → type "SAVE20".',
    'Total dropped 20% → proceed to payment.',
  ];
  return (
    <AppWindow breadcrumb="clariti › reasoning › next action">
      <div className="space-y-2.5 p-5 font-mono text-[12px]">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="text-violet-400">›</span>
            <span className={i === steps.length - 1 ? 'text-white/85' : 'text-white/50'}>{s}</span>
          </div>
        ))}
        <div className="flex gap-2.5">
          <span className="text-violet-400">›</span>
          <span className="inline-flex items-center gap-1 text-white/85">
            deciding
            <span className="inline-flex gap-0.5">
              <span className="h-1 w-1 animate-pulse-soft rounded-full bg-violet-400" />
              <span className="h-1 w-1 animate-pulse-soft rounded-full bg-violet-400" style={{ animationDelay: '0.2s' }} />
              <span className="h-1 w-1 animate-pulse-soft rounded-full bg-violet-400" style={{ animationDelay: '0.4s' }} />
            </span>
          </span>
        </div>
      </div>
    </AppWindow>
  );
}

function AskMock() {
  return (
    <AppWindow breadcrumb="clariti › run #428 › paused">
      <div className="p-5">
        <div className="flex items-center gap-2 text-amber-300">
          <span className="text-base">⏸</span>
          <span className="text-sm font-semibold">Clariti is paused</span>
          <span className="ml-auto font-mono text-[11px] text-white/35">step 6 of 12</span>
        </div>
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/70">
          I see a dialog I didn&apos;t expect: &ldquo;Choose your sign-in method&rdquo;. Which should
          I pick?
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/5 px-3 py-2">
          <span className="font-mono text-[12px] text-white/70">Use &ldquo;Sign in with Google&rdquo;</span>
          <span className="ml-auto font-mono text-[10px] text-white/30">↵ continue</span>
        </div>
      </div>
    </AppWindow>
  );
}

function JudgeMock() {
  const rows = [
    { t: 'Sign in with valid credentials', ok: true },
    { t: 'Dashboard renders under 2s', ok: true },
    { t: 'Avatar upload rejects > 2MB', ok: false },
  ];
  return (
    <AppWindow breadcrumb="clariti › verdict › auth-flow.suite">
      <div className="p-5">
        {rows.map((r) => (
          <div key={r.t} className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${r.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}
            >
              {r.ok ? <CheckIcon className="h-3 w-3" /> : '✕'}
            </span>
            <span className="text-sm text-white/75">{r.t}</span>
            <span
              className={`ml-auto font-mono text-[11px] ${r.ok ? 'text-emerald-300' : 'text-rose-300'}`}
            >
              {r.ok ? 'PASS' : 'FAIL'}
            </span>
          </div>
        ))}
        <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-xs leading-relaxed text-white/50">
          <span className="text-white/70">Why it failed:</span> a 3MB file uploaded without an error
          — the size limit isn&apos;t enforced on the client.
        </p>
      </div>
    </AppWindow>
  );
}

// ── Pillars data ─────────────────────────────────────────────────────────────

const PILLARS = [
  {
    tag: 'Vision',
    Icon: EyeIcon,
    label: 'IT SEES',
    title: 'It actually looks at your screen.',
    body: 'Clariti sees your app the way your users do — the real, rendered UI. So it catches the things your current tests can\u2019t even look for: cut-off text, a spinner that never stops, a layout that breaks on one screen size.',
    Mock: VisionMock,
  },
  {
    tag: 'Reasoning',
    Icon: SparkIcon,
    label: 'IT THINKS',
    title: 'It figures out the next step on its own.',
    body: 'No script to maintain. Clariti looks at where it is, decides what to do next, and adapts as your product changes. Redesign a page or rename a button — it just keeps going.',
    Mock: ThinkMock,
  },
  {
    tag: 'Human-in-the-loop',
    Icon: QuestionIcon,
    label: 'IT ASKS',
    title: "When it's unsure, it checks with you.",
    body: 'No silent failures, no guessing. If something\u2019s ambiguous, Clariti pauses and asks — in plain English. You answer once, it remembers. You stay in control without babysitting every run.',
    Mock: AskMock,
  },
  {
    tag: 'Verdict',
    Icon: GavelIcon,
    label: 'IT JUDGES',
    title: 'It tells you what passed, what broke, and why.',
    body: 'Clariti decides whether each flow actually worked and explains its reasoning. Every run is recorded step by step, so you can see exactly what it did — and replay it anytime.',
    Mock: JudgeMock,
  },
];

export default function Pillars() {
  return (
    <section id="product" className="relative mx-auto max-w-6xl px-6 py-28 sm:py-32">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <Eyebrow>WHY IT WORKS</Eyebrow>
          <h2 className="mt-5 max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-tight text-white">
            It works like your <span className="text-gradient">best QA hire.</span>
          </h2>
        </motion.div>
      </div>

      <div className="mt-20 space-y-24 sm:space-y-28">
        {PILLARS.map((p, i) => {
          const reversed = i % 2 === 1;
          const Icon = p.Icon;
          const Mock = p.Mock;
          return (
            <div
              key={p.label}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              {/* Copy */}
              <motion.div
                initial={{ opacity: 0, x: reversed ? 40 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '0px 0px -15% 0px' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={reversed ? 'lg:order-2' : ''}
              >
                <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <Icon className="h-4 w-4 text-violet-300" />
                  <span className="font-mono text-[11px] font-semibold tracking-widest text-white/70">
                    {p.label}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-[11px] text-white/40">{p.tag}</span>
                </div>
                <h3 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-tight tracking-tight text-white">
                  {p.title}
                </h3>
                <p className="mt-4 max-w-md text-base leading-relaxed text-white/55">{p.body}</p>
              </motion.div>

              {/* Mockup */}
              <motion.div
                initial={{ opacity: 0, x: reversed ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '0px 0px -15% 0px' }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={reversed ? 'lg:order-1' : ''}
              >
                <Mock />
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
