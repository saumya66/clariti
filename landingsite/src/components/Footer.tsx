import { LogoMark } from './Icons';

const LINKS = [
  { label: 'Docs', href: '#' },
  { label: 'GitHub', href: '#' },
  { label: 'Changelog', href: '#' },
  { label: 'Status', href: '#' },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0f]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-12 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <LogoMark className="h-8 w-8" />
          <div>
            <p className="font-bold text-white">Clariti</p>
            <p className="text-sm text-white/40">QA that thinks.</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="group relative text-sm text-white/50 transition-colors hover:text-white"
            >
              {l.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-violet-400 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/5 py-5">
        <p className="text-center text-xs text-white/30">
          © 2026 Clariti. Built for teams who ship.
        </p>
      </div>
    </footer>
  );
}
