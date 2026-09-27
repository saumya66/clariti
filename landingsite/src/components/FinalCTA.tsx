import Aurora from './Aurora';
import Reveal from './Reveal';
import { BookDemoButton, WatchDemoButton } from './CTAButtons';
import { trackEvent } from '../lib/analytics';

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden pb-16 pt-32 sm:pb-20 sm:pt-40">
      <Aurora className="opacity-80" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.22), transparent 65%)' }}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-[clamp(2.2rem,5.5vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-white">
            Autonomous. Visual. Relentless. <br className="hidden sm:block" />
            <span className="text-gradient">This is your new QA.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Software testing doesn&apos;t need another framework. It needs eyes.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-9">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <BookDemoButton size="lg" className="w-full sm:w-auto" trackingLocation="final_cta" />
              <WatchDemoButton size="lg" variant="ghost" className="w-full sm:w-auto" trackingLocation="final_cta" />
            </div>
            <p className="mx-auto mt-12 max-w-xl text-base leading-relaxed text-white/55 sm:mt-14 sm:text-lg">
              Have feedback, questions, or something you need?
              <br />
              Do reach us at —{' '}
              <a
                href="mailto:heyclariti@gmail.com"
                onClick={() => trackEvent('contact_email_click', { cta_location: 'final_cta' })}
                className="font-medium text-violet-300 transition-colors hover:text-violet-200"
              >
                heyclariti@gmail.com
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
