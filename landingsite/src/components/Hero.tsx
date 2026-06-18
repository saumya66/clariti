import { useState } from 'react';
import Aurora from './Aurora';
import BlurText from './BlurText';

const TAGLINE = 'It Sees. It Thinks. It Acts. It Judges. Just like your QA would.';

// ── Timing ─────────────────────────────────────────────────────────────────
const CLARITI_DURATION  = 1000;   // ms the "Clariti" blur-in takes
const TAGLINE_START     = 800;    // starts slightly before Clariti finishes
const TAGLINE_DONE      = TAGLINE_START + TAGLINE.split(' ').length * 75;
const BODY_DELAY        = TAGLINE_DONE + 250;
const CTA_DELAY         = BODY_DELAY + 500;

export default function Hero() {
  const [email, setEmail]         = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL ?? '';
      console.log('apiUrl', apiUrl);
      await fetch(`${apiUrl}/api/v1/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Fail silently — still show success to the user
    }
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#09090b] overflow-hidden">
      <Aurora />

      {/* Hero */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-10 pt-4 sm:pb-20">
        <div className="text-center max-w-4xl mx-auto">

          {/* ── Main hero word ── */}
          <h1 className="text-[clamp(3rem,10vw,6.5rem)] font-black tracking-[-0.04em] leading-[0.95] text-white">
            <BlurText
              text="Clariti"
              startDelay={150}
              wordDelay={0}
              duration={CLARITI_DURATION / 1000}
            />
          </h1>

          {/* ── Full tagline, one continuous sentence ── */}
          <p className="mt-3 sm:mt-5 text-lg sm:text-2xl md:text-3xl font-semibold leading-snug tracking-tight text-white/70">
            <BlurText
              text={TAGLINE}
              startDelay={TAGLINE_START}
              wordDelay={75}
              duration={0.55}
            />
          </p>

          {/* ── Thesis label ── */}
          <p
            className="animate-fade-up mt-5 sm:mt-8 inline-block font-handwriting font-semibold text-2xl sm:text-3xl text-white/90 animate-draw-underline"
            style={{
              animationDelay: `${BODY_DELAY}ms`,
              '--underline-delay': `${BODY_DELAY + 600}ms`,
            } as React.CSSProperties}
          >
            Our Thesis
          </p>

          {/* ── Thesis heading ── */}
          <h2
            className="animate-fade-up mt-2 text-base sm:text-lg md:text-xl font-bold text-white max-w-2xl mx-auto leading-snug"
            style={{ animationDelay: `${BODY_DELAY + 100}ms` }}
          >
            True end-to-end testing shouldn't require writing code — it's a bottleneck.
          </h2>

          {/* ── Thesis body ── */}
          <p
            className="animate-fade-up mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed"
            style={{ animationDelay: `${BODY_DELAY + 150}ms` }}
          >
            The most effective way to test software is to replicate how a human QA
            works—seeing the interface, reasoning through flows, and evaluating outcomes.
          </p>
          <p
            className="animate-fade-up mt-2 text-sm sm:text-base md:text-lg text-white/40 max-w-2xl mx-auto leading-relaxed"
            style={{ animationDelay: `${BODY_DELAY + 300}ms` }}
          >
          Naturally platform-agnostic, capable of detecting UI issues code-based tests miss, and built to handle rapidly evolving applications.
          </p>

          {/* ── CTA bridge ── */}
          <p
            className="animate-fade-up mt-5 sm:mt-8 text-sm text-white/55 max-w-md mx-auto"
            style={{ animationDelay: `${CTA_DELAY - 150}ms` }}
          >
            Sounds interesting? We're launching soon. Leave your email below and
            we'll let you know when we're ready!
          </p>

          {/* ── CTA ── */}
          <div
            className="animate-fade-up mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            style={{ animationDelay: `${CTA_DELAY}ms` }}
          >
            {submitted ? (
              <div className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-6 py-3 text-indigo-300 text-sm font-medium">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                You're on the list — we'll be in touch!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col items-center sm:flex-row gap-3 w-full">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 w-full sm:w-auto rounded-xl bg-white/[0.06] border border-white/[0.12] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-500/60 focus:bg-white/[0.09] transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="shrink-0 w-[40%] sm:w-auto rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {loading ? 'Saving…' : 'Notify Me'}
                </button>
              </form>
            )}
          </div>

          <p
            className="animate-fade-up mt-4 text-xs text-white/20"
            style={{ animationDelay: `${CTA_DELAY + 200}ms` }}
          >
            No spam. Just a launch notification.
          </p>
        </div>
      </main>
    </div>
  );
}
