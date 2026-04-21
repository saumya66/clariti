import * as React from 'react';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import {
  History,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Monitor,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useProject, useProjectFeatures, useFeatureTestRuns } from '@/hooks/useProjectsQueries';
import { cn } from '@/lib/utils';
import type { CloudTestRun } from '@/api/client';

export const Route = createFileRoute(
  '/app/projects/$projectId/tests/$featureId/runs/'
)({
  component: PastRunsPage,
});

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function RunStatusBadge({ status, passed, failed, skipped }: { status: string; passed: number; failed: number; skipped: number }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        <Loader2 className="size-3.5 animate-spin" />
        Running
      </span>
    );
  }
  if (status === 'completed') {
    if (failed === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="size-3.5" />
          All passed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500">
        <XCircle className="size-3.5" />
        {failed} failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {status}
    </span>
  );
}

function RunRow({
  run,
  projectId,
  featureId,
  featureName,
  index,
}: {
  run: CloudTestRun;
  projectId: string;
  featureId: string;
  featureName: string;
  index: number;
}) {
  const router = useRouter();

  const handleClick = () => {
    router.navigate({
      to: '/app/execute',
      search: {
        featureId,
        projectId,
        featureName,
        runId: run.id,
      },
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-5 px-6 py-4 transition-colors hover:bg-muted/40 text-left',
        index !== 0 && 'border-t border-border'
      )}
    >
      {/* Run number / icon */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <History className="size-4" />
      </div>

      {/* Run info */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          Run #{index + 1}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {run.target_window && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-48">
              <Monitor className="size-3 shrink-0" />
              {run.target_window}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {run.provider} · {run.total_tests} test{run.total_tests !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Result summary + date */}
      <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-32">
        <RunStatusBadge
          status={run.status}
          passed={run.passed}
          failed={run.failed}
          skipped={run.skipped}
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {run.status === 'completed' && (
            <>
              <span className="text-emerald-600 font-medium">{run.passed}p</span>
              {run.failed > 0 && <span className="text-red-500 font-medium">{run.failed}f</span>}
              {run.skipped > 0 && <span>{run.skipped}s</span>}
              <span>·</span>
            </>
          )}
          <span>{relativeTime(run.created_at)}</span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

function PastRunsPage() {
  const { projectId, featureId } = Route.useParams();
  const { project } = useProject(projectId);
  const { features } = useProjectFeatures(projectId);
  const { runs, loading, error } = useFeatureTestRuns(featureId);

  const feature = features.find((f) => f.id === featureId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
    <div className="max-w-4xl mx-auto w-full flex flex-col flex-1">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/app" className="text-muted-foreground hover:text-foreground">
                Projects
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/app/projects/$projectId"
                params={{ projectId }}
                className="text-muted-foreground hover:text-foreground"
              >
                {project?.name ?? '…'}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/app/projects/$projectId/tests"
                params={{ projectId }}
                className="text-muted-foreground hover:text-foreground"
              >
                Test Suites
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/app/projects/$projectId/tests/$featureId"
                params={{ projectId, featureId }}
                className="text-muted-foreground hover:text-foreground"
              >
                {feature?.name ?? '…'}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Past Runs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Past Runs</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {loading ? (
              <span className="animate-pulse">Loading…</span>
            ) : (
              <>
                Execution history for{' '}
                <span className="font-medium text-foreground">{feature?.name ?? '…'}</span>
              </>
            )}
          </p>
        </div>
        <Link
          to="/app/projects/$projectId/tests/$featureId"
          params={{ projectId, featureId }}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground active:scale-95"
        >
          <ArrowLeft className="size-3.5" />
          Back to Suite
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-4 px-6 py-4',
                i !== 0 && 'border-t border-border'
              )}
            >
              <div className="size-9 rounded-xl bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-56 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <History className="size-8" />
          </div>
          <h2 className="mt-5 text-base font-semibold text-foreground">No runs yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
            Run your test suite to see execution history here.
          </p>
          <Link
            to="/app/projects/$projectId/tests/$featureId"
            params={{ projectId, featureId }}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            Go to Test Suite
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-5 border-b border-border px-6 py-3">
            <div className="size-9" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Run
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-32 text-right">
              Result · Date
            </span>
            <span className="w-4" />
          </div>

          {/* Rows — most recent first (API returns sorted by created_at desc) */}
          {runs.map((run, i) => (
            <RunRow
              key={run.id}
              run={run}
              projectId={projectId}
              featureId={featureId}
              featureName={feature?.name ?? ''}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
