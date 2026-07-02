import AppWindow from './AppWindow';
import { PriorityBadge, StatusBadge, type Priority, type RunStatus } from './Badge';

interface TestRow {
  title: string;
  priority: Priority;
  status: RunStatus;
}

interface LogRow {
  t: string;
  marker: string;
  text: string;
}

const DEFAULT_TESTS: TestRow[] = [
  { title: 'Sign in with valid credentials', priority: 'CRITICAL', status: 'RUNNING' },
  { title: 'Dashboard empty state renders', priority: 'HIGH', status: 'QUEUED' },
  { title: 'Upload avatar under 2MB', priority: 'HIGH', status: 'QUEUED' },
  { title: 'Password reset email sent', priority: 'MEDIUM', status: 'PASSED' },
  { title: 'Logout clears session', priority: 'MEDIUM', status: 'PASSED' },
  { title: 'Expired session redirects', priority: 'LOW', status: 'PASSED' },
];

const DEFAULT_LOG: LogRow[] = [
  { t: '0.2s', marker: '·', text: 'Opened app. Identifying main navigation.' },
  { t: '0.8s', marker: '›', text: 'Click → "Sign in" button (top-right)' },
  { t: '1.4s', marker: '›', text: 'Type → user@example.com' },
  { t: '2.1s', marker: '›', text: 'Type → •••••••• (password)' },
  { t: '2.6s', marker: '›', text: 'Click → Submit' },
];

interface RunnerMockupProps {
  breadcrumb?: string;
  tests?: TestRow[];
  log?: LogRow[];
  className?: string;
  /** if true, log lines animate in one at a time on view */
  animateLog?: boolean;
}

export default function RunnerMockup({
  breadcrumb = 'clariti › run #428 › auth-flow.suite',
  tests = DEFAULT_TESTS,
  log = DEFAULT_LOG,
  className = '',
  animateLog = false,
}: RunnerMockupProps) {
  return (
    <AppWindow breadcrumb={breadcrumb} live className={className}>
      <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr]">
        {/* Test cases */}
        <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
          <p className="mb-3 font-mono text-[11px] tracking-widest text-white/35">
            TEST CASES · {tests.length}
          </p>
          <ul className="space-y-1.5">
            {tests.map((tt, i) => (
              <li
                key={i}
                className={`rounded-lg border px-3 py-2 transition-colors ${
                  tt.status === 'RUNNING'
                    ? 'border-violet-400/30 bg-violet-500/10'
                    : 'border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      tt.status === 'PASSED'
                        ? 'bg-emerald-400'
                        : tt.status === 'RUNNING'
                          ? 'bg-violet-400 animate-pulse-soft'
                          : 'bg-white/25'
                    }`}
                  />
                  <span className="truncate text-[13px] text-white/80">{tt.title}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 pl-3.5">
                  <PriorityBadge level={tt.priority} />
                  <StatusBadge status={tt.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Activity log */}
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[11px] tracking-widest text-white/35">ACTIVITY LOG</p>
            <div className="flex gap-1.5">
              <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/50">
                Pause &amp; Guide
              </span>
              <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/50">
                Stop
              </span>
            </div>
          </div>
          <ul className="space-y-2.5 font-mono text-[12px]">
            {log.map((row, i) => (
              <li
                key={i}
                className="flex gap-2.5"
                style={
                  animateLog
                    ? {
                        animation: 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
                        animationDelay: `${i * 140}ms`,
                        opacity: 0,
                      }
                    : undefined
                }
              >
                <span className="w-8 shrink-0 text-white/30">{row.t}</span>
                <span className="shrink-0 text-violet-400">{row.marker}</span>
                <span className="text-white/65">{row.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppWindow>
  );
}

export type { TestRow, LogRow };
