import { useEffect, useState } from 'react';
import { NAV_LINKS } from '../lib/config';
import { BookDemoButton } from './CTAButtons';
import { LogoMark } from './Icons';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        className={`flex w-full max-w-5xl items-center gap-4 rounded-full px-4 py-2.5 transition-all duration-300 ${
          scrolled
            ? 'border border-white/10 bg-[#0e0e16]/80 shadow-lg shadow-black/30 backdrop-blur-xl'
            : 'border border-transparent bg-transparent'
        }`}
      >
        <a href="#top" className="flex items-center gap-2.5 pl-1">
          <LogoMark className="h-7 w-7" />
          <span className="text-[17px] font-bold tracking-tight text-white">Clariti</span>
        </a>

        <div className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm text-white/60 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="ml-auto hidden md:block">
          <BookDemoButton size="md" />
        </div>

        {/* Mobile toggle */}
        <button
          className="ml-auto rounded-full border border-white/10 p-2 text-white/70 md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="absolute inset-x-4 top-[72px] rounded-2xl border border-white/10 bg-[#0e0e16]/95 p-3 backdrop-blur-xl md:hidden">
          <div className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 px-1">
              <BookDemoButton size="md" className="w-full" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
