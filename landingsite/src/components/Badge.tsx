type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type RunStatus = 'RUNNING' | 'QUEUED' | 'PASSED' | 'FAILED';

const priorityStyles: Record<Priority, string> = {
  CRITICAL: 'text-rose-300 border-rose-400/30 bg-rose-400/10',
  HIGH: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  MEDIUM: 'text-sky-300 border-sky-400/30 bg-sky-400/10',
  LOW: 'text-white/50 border-white/15 bg-white/5',
};

const statusStyles: Record<RunStatus, string> = {
  RUNNING: 'text-violet-300 border-violet-400/30 bg-violet-400/10',
  QUEUED: 'text-white/40 border-white/15 bg-white/5',
  PASSED: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  FAILED: 'text-rose-300 border-rose-400/30 bg-rose-400/10',
};

export function PriorityBadge({ level }: { level: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide ${priorityStyles[level]}`}
    >
      {level}
    </span>
  );
}

export function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide ${statusStyles[status]}`}
    >
      {status === 'RUNNING' && (
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse-soft" />
      )}
      {status}
    </span>
  );
}

export type { Priority, RunStatus };
