import { useState } from 'react';
import { BOOK_DEMO_URL, DEMO_VIDEO_URL } from '../lib/config';
import DemoModal from './DemoModal';
import { ArrowUpRight, PlayIcon } from './Icons';

type Size = 'md' | 'lg';

const sizeCls: Record<Size, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-[15px]',
};

export function WatchDemoButton({
  size = 'lg',
  variant = 'light',
  className = '',
}: {
  size?: Size;
  variant?: 'light' | 'ghost';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const base =
    variant === 'light'
      ? 'bg-white text-[#0a0a0f] hover:bg-white/90'
      : 'border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]';
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`group inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-[0.98] ${sizeCls[size]} ${base} ${className}`}
      >
        <PlayIcon className="h-3.5 w-3.5 translate-x-[1px]" />
        Watch Demo
      </button>
      <DemoModal open={open} onClose={() => setOpen(false)} videoUrl={DEMO_VIDEO_URL} />
    </>
  );
}

export function BookDemoButton({
  size = 'lg',
  className = '',
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <a
      href={BOOK_DEMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold text-white shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98] ${sizeCls[size]} ${className}`}
      style={{ background: 'linear-gradient(120deg,#8b5cf6,#7c3aed 55%,#6366f1)' }}
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden="true"
      />
      Book a Demo
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}
