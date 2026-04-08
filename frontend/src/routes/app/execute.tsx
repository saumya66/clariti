import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Minus,
  MousePointer,
  Keyboard,
  ArrowUpDown,
  Eye,
  Navigation,
  Clock,
  Zap,
  AlertCircle,
  StopCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useFeatureTestCases } from '@/hooks/useProjectsQueries';
import { useTestSuiteExecutionStore, type TestRunStatus, type ActivityEntry } from '@/store/testSuiteExecutionStore';
import { cn } from '@/lib/utils';
import { z } from 'zod';

export const Route = createFileRoute('/app/execute')({
  validateSearch: z.object({
    featureId: z.string().optional(),
    windowTitle: z.string().optional(),
    featureName: z.string().optional(),
  }),
  component: ExecutePage,
});

// ─── Status icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: TestRunStatus }) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />;
    case 'failed':
      return <XCircle className="size-4 text-red-500 shrink-0" />;
    case 'running':
      return <Loader2 className="size-4 text-primary animate-spin shrink-0" />;
    case 'skipped':
      return <Minus className="size-4 text-muted-foreground shrink-0" />;
    default:
      return <Minus className="size-4 text-muted-foreground/40 shrink-0" />;
  }
}

// ─── Activity entry icon ──────────────────────────────────────────────────────

function ActivityIcon({ type, success }: { type: ActivityEntry['type']; success: boolean }) {
  const iconClass = 'size-3.5';
  const base = success ? '' : 'opacity-60';

  const colorMap: Record<ActivityEntry['type'], string> = {
    click:    'bg-blue-500/10 text-blue-500',
    type:     'bg-purple-500/10 text-purple-500',
    scroll:   'bg-slate-500/10 text-slate-500',
    observe:  'bg-muted text-muted-foreground',
    navigate: 'bg-emerald-500/10 text-emerald-600',
    wait:     'bg-amber-500/10 text-amber-500',
    other:    'bg-muted text-muted-foreground',
  };

  const IconComp = {
    click:    MousePointer,
    type:     Keyboard,
    scroll:   ArrowUpDown,
    observe:  Eye,
    navigate: Navigation,
    wait:     Clock,
    other:    Zap,
  }[type];

  return (
    <div className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', colorMap[type], base)}>
      <IconComp className={iconClass} />
    </div>
  );
}

// ─── Execute Page ─────────────────────────────────────────────────────────────

function ExecutePage() {
  const { featureId, windowTitle, featureName } = Route.useSearch();
  const { token, user } = useAuthStore();
  const { testCases } = useFeatureTestCases(featureId ?? '');
  const activityEndRef = React.useRef<HTMLDivElement>(null);
  const [thinkingExpanded, setThinkingExpanded] = React.useState(true);

  const {
    status,
    tests,
    currentTestId,
    activityLog,
    thinking,
    suiteResult,
    error,
    setInitialTests,
    startExecution,
    reset,
  } = useTestSuiteExecutionStore();

  // Pre-populate test list once test cases load
  React.useEffect(() => {
    if (testCases.length > 0 && status === 'idle') {
      setInitialTests(testCases);
    }
  }, [testCases, status, setInitialTests]);

  // Auto-start when params + tests are ready
  React.useEffect(() => {
    if (
      featureId &&
      windowTitle &&
      token &&
      status === 'idle' &&
      tests.length > 0
    ) {
      startExecution({
        featureId,
        featureName: featureName ?? '',
        windowTitle,
        provider: 'claude',
        token,
        userId: (user as { id?: string })?.id ?? '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests.length, status]);

  // Scroll activity log to bottom on new entries
  React.useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLog.length]);

  const currentTest = tests.find((t) => t.id === currentTestId);
  const completedCount = tests.filter((t) => t.status === 'passed' || t.status === 'failed' || t.status === 'skipped').length;
  const totalCount = tests.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isRunning = status === 'running';

  // ── No params / idle state ────────────────────────────────────────────────
  if (!featureId || !windowTitle) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Zap className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Execution Engine</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
          Select a test suite and click "Run All Tests" to start automated test execution.
        </p>
        <Link
          to="/app"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          Browse Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">

      {/* ── Left panel: test list ── */}
      <aside className="w-80 shrink-0 flex flex-col border-r border-border bg-card overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'size-2 rounded-full shrink-0',
              isRunning ? 'bg-emerald-500 animate-pulse' : status === 'complete' ? 'bg-emerald-500' : 'bg-red-500'
            )} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isRunning ? 'Running Tests' : status === 'complete' ? 'Run Complete' : 'Execution Error'}
            </span>
          </div>
          <h2 className="text-base font-bold text-foreground leading-tight line-clamp-2">
            {featureName || 'Test Suite'}
          </h2>
          {windowTitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{windowTitle}</p>
          )}

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {completedCount} / {totalCount}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Suite complete banner */}
        {status === 'complete' && suiteResult && (
          <div className="mx-3 mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-600 mb-1">Run Complete</p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-medium">{suiteResult.passed} passed</span>
              {suiteResult.failed > 0 && (
                <span className="text-red-500 font-medium">{suiteResult.failed} failed</span>
              )}
              {suiteResult.skipped > 0 && (
                <span className="text-muted-foreground">{suiteResult.skipped} skipped</span>
              )}
            </div>
          </div>
        )}

        {/* Error banner */}
        {status === 'error' && error && (
          <div className="mx-3 mt-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Test rows */}
        <div className="flex-1 overflow-y-auto py-2">
          {tests.map((test) => (
            <div
              key={test.id}
              className={cn(
                'flex items-center gap-3 px-5 py-2.5 transition-colors',
                test.status === 'running' && 'bg-primary/5 border-l-2 border-l-primary'
              )}
            >
              <span className="font-mono text-[10px] font-semibold text-muted-foreground w-12 shrink-0">
                {test.test_key}
              </span>
              <span className={cn(
                'flex-1 text-xs truncate',
                test.status === 'running' ? 'text-primary font-semibold' :
                test.status === 'passed'  ? 'text-foreground' :
                test.status === 'failed'  ? 'text-red-500' :
                'text-muted-foreground'
              )}>
                {test.title}
              </span>
              <StatusIcon status={test.status} />
            </div>
          ))}
        </div>

        {/* Abort / Reset */}
        <div className="p-4 border-t border-border">
          {isRunning ? (
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10 px-4 py-2 text-sm font-semibold transition-colors"
            >
              <StopCircle className="size-4" />
              Abort Run
            </button>
          ) : (
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 px-4 py-2 text-sm font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </aside>

      {/* ── Right panel: current test + live log ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">

        {/* Current test header */}
        {currentTest ? (
          <div className="px-8 pt-7 pb-6 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Step {currentTest.test_number ?? '—'} / {totalCount}
            </p>
            <h1 className="text-2xl font-black text-foreground leading-tight mb-2">
              {currentTest.test_key}: {currentTest.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-4">
              {currentTest.goal}
            </p>
            {currentTest.expected_result && (
              <div className="inline-flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 max-w-2xl">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700">
                  <span className="font-semibold">Expected result:</span> {currentTest.expected_result}
                </p>
              </div>
            )}
          </div>
        ) : status === 'complete' && suiteResult ? (
          <div className="px-8 pt-7 pb-6 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Execution Complete
            </p>
            <h1 className="text-2xl font-black text-foreground mb-2">
              {suiteResult.failed === 0 ? 'All Tests Passed' : `${suiteResult.failed} Test${suiteResult.failed !== 1 ? 's' : ''} Failed`}
            </h1>
            <div className="flex gap-4 mt-3">
              <span className="text-sm font-medium text-emerald-600 bg-emerald-500/10 rounded-full px-3 py-1">
                {suiteResult.passed} passed
              </span>
              {suiteResult.failed > 0 && (
                <span className="text-sm font-medium text-red-500 bg-red-500/10 rounded-full px-3 py-1">
                  {suiteResult.failed} failed
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="px-8 pt-7 pb-6 border-b border-border">
            <div className="flex items-center gap-2 animate-pulse">
              <Loader2 className="size-4 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Initializing execution…</p>
            </div>
          </div>
        )}

        {/* Live activity log */}
        <div className="flex-1 flex flex-col overflow-hidden px-8 py-6">
          <div className="rounded-2xl border border-border bg-card flex flex-col flex-1 overflow-hidden">
            {/* Log header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Live Activity Log
              </span>
              {isRunning && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Streaming
                </span>
              )}
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
              {activityLog.length === 0 && isRunning && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="size-3 animate-spin" />
                  Waiting for first action…
                </div>
              )}
              {activityLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5 w-16 tabular-nums">
                    {entry.time}
                  </span>
                  <ActivityIcon type={entry.type} success={entry.success} />
                  <p className={cn(
                    'text-xs leading-relaxed flex-1',
                    entry.success ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {entry.description}
                  </p>
                </div>
              ))}
              <div ref={activityEndRef} />
            </div>
          </div>
        </div>

        {/* Thinking section */}
        {(thinking || (isRunning && activityLog.length > 0)) && (
          <div className="px-8 pb-6">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setThinkingExpanded((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="flex size-5 items-center justify-center rounded-full bg-primary/10">
                    <Zap className="size-3 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {thinking ? 'Thinking…' : 'AI Reasoning'}
                  </span>
                  {thinking && (
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  )}
                </div>
                {thinkingExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>
              {thinkingExpanded && thinking && (
                <div className="px-5 pb-4 border-t border-border">
                  <p className="text-xs text-muted-foreground italic leading-relaxed mt-3">
                    {thinking}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
