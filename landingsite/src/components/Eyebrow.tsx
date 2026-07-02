export default function Eyebrow({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.2em] text-violet-300/90">
      <span className="h-px w-8 bg-gradient-to-r from-violet-400/60 to-transparent" />
      {children}
    </span>
  );
}
