import * as React from 'react';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
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
  PauseCircle,
  PlayCircle,
  MessageSquare,
  Send,
  ArrowLeft,
  RotateCcw,
  Ban,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useFeatureTestCases } from '@/hooks/useProjectsQueries';
import { useTestSuiteExecutionStore, type TestRunStatus, type ActivityEntry } from '@/store/testSuiteExecutionStore';
import { cn } from '@/lib/utils';
import { z } from 'zod';

export const Route = createFileRoute('/app/execute')({
  validateSearch: z.object({
    featureId: z.string().optional(),
    projectId: z.string().optional(),
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
    guidance: 'bg-orange-500/10 text-orange-500',
    other:    'bg-muted text-muted-foreground',
  };

  const IconComp: Record<ActivityEntry['type'], React.ElementType> = {
    click:    MousePointer,
    type:     Keyboard,
    scroll:   ArrowUpDown,
    observe:  Eye,
    navigate: Navigation,
    wait:     Clock,
    guidance: MessageSquare,
    other:    Zap,
  };

  const Icon = IconComp[type];

  return (
    <div className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', colorMap[type], base)}>
      <Icon className={iconClass} />
    </div>
  );
}

// ─── Guidance panel ───────────────────────────────────────────────────────────

function GuidancePanel({
  question,
  currentState,
  isPaused,
  onSubmit,
}: {
  question?: string;
  currentState?: string;
  isPaused: boolean;
  onSubmit: (guidance: string) => void;
}) {
  const [text, setText] = React.useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <div className="mx-8 mb-4 rounded-2xl border border-orange-400/30 bg-orange-500/5 overflow-hidden">
      {/* Banner */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-orange-400/20 bg-orange-500/10">
        <MessageSquare className="size-4 text-orange-500 shrink-0" />
        <span className="text-sm font-semibold text-orange-600">
          {isPaused ? 'Execution paused — your turn' : 'Agent needs your guidance'}
        </span>
      </div>

      {/* Question / state */}
      {(question || currentState) && (
        <div className="px-5 pt-4 pb-2 space-y-1.5">
          {currentState && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current state
            </p>
          )}
          {currentState && (
            <p className="text-xs text-muted-foreground leading-relaxed">{currentState}</p>
          )}
          {question && (
            <p className="text-sm text-foreground leading-relaxed font-medium mt-2">{question}</p>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-4 pt-2 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          placeholder={
            isPaused
              ? 'Tell the agent what to do next… (Cmd+Enter to send)'
              : 'Help the agent — describe what it should do… (Cmd+Enter to send)'
          }
          rows={2}
          className="flex-1 resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="inline-flex items-center justify-center size-10 rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0 self-end"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Execute Page ─────────────────────────────────────────────────────────────

function ExecutePage() {
  const { featureId, projectId, windowTitle, featureName } = Route.useSearch();
  const { token, user } = useAuthStore();
  const router = useRouter();
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
    guidanceNeeded,
    isPaused,
    setInitialTests,
    startExecution,
    submitGuidance,
    pauseExecution,
    resumeExecution,
    abortExecution,
    reset,
  } = useTestSuiteExecutionStore();

  // Pre-populate test list once test cases load
  React.useEffect(() => {
    if (testCases.length > 0 && status === 'idle') {
      setInitialTests(testCases);
    }
  }, [testCases, status, setInitialTests]);

  // Auto-start when params + tests are ready — never re-trigger after abort/error/complete
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
  const completedCount = tests.filter((t) => ['passed', 'failed', 'skipped'].includes(t.status)).length;
  const totalCount = tests.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isRunning = status === 'running';
  const isDone = status === 'complete' || status === 'error' || status === 'aborted';

  // Whether to show the guidance panel
  const showGuidance = isRunning && (!!guidanceNeeded || isPaused);

  const handleRunAgain = () => {
    reset();
    // Re-set tests from loaded testCases then let the auto-start effect fire
    if (testCases.length > 0) setInitialTests(testCases);
  };

  const backTo = projectId && featureId
    ? `/app/projects/${projectId}/tests/${featureId}`
    : projectId
    ? `/app/projects/${projectId}`
    : '/app';

  // ── No params state ───────────────────────────────────────────────────────
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

  // ── Status label helpers ──────────────────────────────────────────────────
  const statusDot = isPaused
    ? 'bg-orange-400'
    : isRunning
    ? 'bg-emerald-500 animate-pulse'
    : status === 'complete'
    ? 'bg-emerald-500'
    : status === 'aborted'
    ? 'bg-muted-foreground'
    : 'bg-red-500';

  const statusLabel = isPaused
    ? 'Paused'
    : isRunning
    ? guidanceNeeded
      ? 'Waiting for guidance'
      : 'Running Tests'
    : status === 'complete'
    ? 'Run Complete'
    : status === 'aborted'
    ? 'Run Aborted'
    : 'Execution Error';

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">

      {/* ── Left panel: test list ── */}
      <aside className="w-80 shrink-0 flex flex-col border-r border-border bg-card overflow-hidden">

        {/* Back nav */}
        <div className="px-4 pt-4 pb-0">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to test suite
          </Link>
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('size-2 rounded-full shrink-0', statusDot)} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {statusLabel}
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
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  status === 'complete' && suiteResult?.failed === 0 ? 'bg-emerald-500' :
                  status === 'aborted' ? 'bg-muted-foreground' :
                  'bg-primary'
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Suite complete banner */}
        {status === 'complete' && suiteResult && (
          <div className="mx-3 mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-600 mb-1">Run Complete</p>
            <div className="flex gap-3 text-xs">
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

        {/* Aborted banner */}
        {status === 'aborted' && (
          <div className="mx-3 mt-3 rounded-xl bg-muted border border-border px-4 py-3 flex items-center gap-2">
            <Ban className="size-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Run was aborted</p>
          </div>
        )}

        {/* Error banner */}
        {status === 'error' && error && (
          <div className="mx-3 mt-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive leading-relaxed">{error}</p>
          </div>
        )}

        {/* Test rows */}
        <div className="flex-1 overflow-y-auto py-2">
          {tests.map((test) => (
            <div
              key={test.id}
              className={cn(
                'flex items-center gap-3 px-5 py-2.5 transition-colors border-l-2',
                test.status === 'running'  ? 'bg-primary/5 border-l-primary' :
                test.status === 'failed'   ? 'border-l-red-500/60' :
                test.status === 'passed'   ? 'border-l-emerald-500/40' :
                'border-l-transparent'
              )}
            >
              <span className="font-mono text-[10px] font-semibold text-muted-foreground w-12 shrink-0">
                {test.test_key}
              </span>
              <span className={cn(
                'flex-1 text-xs truncate',
                test.status === 'running' ? 'text-primary font-semibold' :
                test.status === 'passed'  ? 'text-foreground' :
                test.status === 'failed'  ? 'text-red-500 font-medium' :
                'text-muted-foreground'
              )}>
                {test.title}
              </span>
              <StatusIcon status={test.status} />
            </div>
          ))}
        </div>

        {/* Actions footer */}
        <div className="p-4 border-t border-border space-y-2">
          {/* Running controls */}
          {isRunning && !isPaused && !guidanceNeeded && (
            <button
              onClick={() => pauseExecution()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-orange-400/40 text-orange-500 hover:bg-orange-500/10 px-4 py-2 text-sm font-semibold transition-colors"
            >
              <PauseCircle className="size-4" />
              Pause &amp; Guide
            </button>
          )}
          {isRunning && (
            <button
              onClick={() => abortExecution()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10 px-4 py-2 text-sm font-semibold transition-colors"
            >
              <StopCircle className="size-4" />
              Abort Run
            </button>
          )}

          {/* Post-run controls */}
          {isDone && (
            <>
              <button
                onClick={handleRunAgain}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
              >
                <RotateCcw className="size-3.5" />
                Run Again
              </button>
              <Link
                to={backTo}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 px-4 py-2 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to Test Suite
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* ── Right panel: current test + live log ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">

        {/* Current test header */}
        {currentTest ? (
          <div className="px-8 pt-7 pb-6 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Test {currentTest.test_number ?? '—'} of {totalCount}
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
                  <span className="font-semibold">Expected: </span>{currentTest.expected_result}
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
              {suiteResult.failed === 0
                ? '🎉 All Tests Passed'
                : `${suiteResult.failed} Test${suiteResult.failed !== 1 ? 's' : ''} Failed`}
            </h1>
            <div className="flex gap-3 mt-3">
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
        ) : status === 'aborted' ? (
          <div className="px-8 pt-7 pb-6 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Run Aborted
            </p>
            <h1 className="text-2xl font-black text-foreground mb-2">Execution stopped</h1>
            <p className="text-sm text-muted-foreground">
              {completedCount > 0
                ? `Completed ${completedCount} of ${totalCount} tests before stopping.`
                : 'No tests were completed.'}
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="px-8 pt-7 pb-6 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Execution Error
            </p>
            <h1 className="text-2xl font-black text-foreground mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{error}</p>
          </div>
        ) : (
          <div className="px-8 pt-7 pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Initializing execution…</p>
            </div>
          </div>
        )}

        {/* Live activity log */}
        <div className="flex-1 flex flex-col overflow-hidden px-8 py-5">
          <div className="rounded-2xl border border-border bg-card flex flex-col flex-1 overflow-hidden">
            {/* Log header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Activity Log
              </span>
              {isRunning && !isPaused && !guidanceNeeded && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Live
                </span>
              )}
              {(isPaused || !!guidanceNeeded) && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-orange-500">
                  <PauseCircle className="size-3" />
                  Waiting for you
                </span>
              )}
              {isDone && activityLog.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {activityLog.length} action{activityLog.length !== 1 ? 's' : ''}
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
              {activityLog.length === 0 && isDone && (
                <p className="text-xs text-muted-foreground py-2">No actions recorded.</p>
              )}
              {activityLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5 w-16 tabular-nums">
                    {entry.time}
                  </span>
                  <ActivityIcon type={entry.type} success={entry.success} />
                  <div className="flex-1 flex items-start gap-2 min-w-0">
                    <p className={cn(
                      'text-xs leading-relaxed flex-1',
                      entry.success ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {entry.description}
                    </p>
                    {entry.confidence === 'low' && entry.type !== 'guidance' && (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-yellow-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-600 border border-yellow-400/30">
                        low confidence
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={activityEndRef} />
            </div>
          </div>
        </div>

        {/* Guidance panel — shown when stuck or manually paused */}
        {showGuidance && (
          <GuidancePanel
            question={guidanceNeeded?.question}
            currentState={guidanceNeeded?.currentState}
            isPaused={isPaused}
            onSubmit={(guidance) => {
              if (isPaused) {
                resumeExecution(guidance);
              } else {
                submitGuidance(guidance);
              }
            }}
          />
        )}

        {/* Skip guidance / resume — available for both manual pause and agent need_help */}
        {isRunning && (isPaused || !!guidanceNeeded) && (
          <div className="px-8 pb-5 flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">Don't need to guide?</span>
            <button
              onClick={() => {
                if (isPaused) {
                  resumeExecution();
                } else {
                  // Dismiss agent guidance and let it continue on its own
                  submitGuidance('Continue on your own best judgement.');
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 px-4 py-1.5 text-sm font-medium transition-colors"
            >
              <PlayCircle className="size-4" />
              Skip &amp; Resume
            </button>
          </div>
        )}

        {/* AI Reasoning (thinking) */}
        {(thinking || (isRunning && activityLog.length > 0)) && (
          <div className="px-8 pb-5">
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
