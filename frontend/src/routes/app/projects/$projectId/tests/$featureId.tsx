import * as React from 'react';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import {
  FlaskConical,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Play,
  Sparkles,
  AlertCircle,
  ListChecks,
  Zap,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { CreateTestFlow } from '@/components/CreateTestFlow';
import { useProject, useProjectFeatures, useFeatureTestCases } from '@/hooks/useProjectsQueries';
import { cn } from '@/lib/utils';
import type { CloudTestCase } from '@/api/client';

export const Route = createFileRoute('/app/projects/$projectId/tests/$featureId')({
  component: FeatureDetailPage,
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
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function priorityAccentBorder(priority: string | null | undefined) {
  switch (priority) {
    case 'critical': return 'border-l-red-500';
    case 'high':     return 'border-l-orange-400';
    case 'medium':   return 'border-l-amber-400';
    case 'low':      return 'border-l-green-500';
    default:         return 'border-l-border';
  }
}

function priorityBadge(priority: string | null | undefined) {
  switch (priority) {
    case 'critical': return 'bg-red-500/10 text-red-500';
    case 'high':     return 'bg-orange-500/10 text-orange-500';
    case 'medium':   return 'bg-amber-500/10 text-amber-500';
    case 'low':      return 'bg-green-500/10 text-green-600';
    default:         return 'bg-muted text-muted-foreground';
  }
}

function categoryBadge(category: string | null | undefined) {
  switch (category) {
    case 'functional':   return 'bg-primary/10 text-primary';
    case 'negative':     return 'bg-red-500/10 text-red-400';
    case 'ui':           return 'bg-purple-500/10 text-purple-500';
    case 'edge_case':    return 'bg-amber-500/10 text-amber-500';
    case 'accessibility':return 'bg-teal-500/10 text-teal-500';
    default:             return 'bg-muted text-muted-foreground';
  }
}

const PRIORITY_META: { key: string; label: string; dot: string }[] = [
  { key: 'critical', label: 'Critical Priority', dot: 'bg-red-500' },
  { key: 'high',     label: 'High Priority',     dot: 'bg-orange-400' },
  { key: 'medium',   label: 'Medium Priority',   dot: 'bg-amber-400' },
  { key: 'low',      label: 'Low Priority',      dot: 'bg-green-500' },
];

function TestCaseCard({ tc }: { tc: CloudTestCase }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className={cn(
        'rounded-xl border border-border border-l-4 bg-card overflow-hidden transition-shadow hover:shadow-sm',
        priorityAccentBorder(tc.priority)
      )}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-4 px-4 py-3.5 text-left hover:bg-muted/20 transition-colors"
      >
        {/* Test key */}
        <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground mt-0.5 w-12">
          {tc.test_key}
        </span>

        {/* Name + badges + goal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {tc.category && (
              <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded-full uppercase tracking-wide', categoryBadge(tc.category))}>
                {tc.category.replace('_', ' ')}
              </span>
            )}
            <span className={cn('px-2 py-0.5 text-[11px] font-medium rounded-full uppercase tracking-wide', priorityBadge(tc.priority))}>
              {tc.priority ?? 'medium'}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">{tc.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tc.goal}</p>
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-muted-foreground mt-0.5">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
          {tc.expected_result && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Expected Result
              </p>
              <p className="text-sm text-emerald-600 leading-relaxed">{tc.expected_result}</p>
            </div>
          )}
          {tc.created_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3" />
              Added {relativeTime(tc.created_at)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 animate-pulse">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="h-10 w-16 rounded bg-muted" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-3 rounded bg-muted" />)}
      </div>
    </div>
  );
}

function FeatureDetailPage() {
  const { projectId, featureId } = Route.useParams();
  const router = useRouter();
  const { project } = useProject(projectId);
  const { features, refetch: refetchFeatures } = useProjectFeatures(projectId);
  const { testCases, loading, error, refetch: refetchTests } = useFeatureTestCases(featureId);
  const [addTestOpen, setAddTestOpen] = React.useState(false);

  const feature = features.find((f) => f.id === featureId);

  const priorityCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tc of testCases) {
      const p = tc.priority ?? 'medium';
      counts[p] = (counts[p] ?? 0) + 1;
    }
    return counts;
  }, [testCases]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
      <div className="max-w-6xl mx-auto w-full">
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
                <Link to="/app/projects/$projectId" params={{ projectId }} className="text-muted-foreground hover:text-foreground">
                  {project?.name ?? '…'}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/app/projects/$projectId/tests" params={{ projectId }} className="text-muted-foreground hover:text-foreground">
                  Test Suites
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{feature?.name ?? '…'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
              {feature?.name ?? 'Test Suite'}
            </h1>
            {feature?.description && (
              <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">
                {feature.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setAddTestOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary hover:shadow-md active:scale-95"
            >
              <Plus className="size-4" />
              Add Test
            </button>
            <button
              onClick={() => router.navigate({ to: '/app/execute' })}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
            >
              <Play className="size-3.5 fill-current" />
              Run All Tests
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">

          {/* ── Left: test cases ── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border border-l-4 border-l-muted bg-card px-4 py-3.5 animate-pulse space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-12 rounded bg-muted" />
                      <div className="h-4 w-24 rounded bg-muted" />
                    </div>
                    <div className="h-4 w-56 rounded bg-muted" />
                    <div className="h-3 w-80 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3">
                <AlertCircle className="size-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : testCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-16 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ListChecks className="size-8" />
                </div>
                <h2 className="mt-5 text-base font-semibold text-foreground">No test cases yet</h2>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
                  Use the test creation flow to generate AI-powered test cases for this suite.
                </p>
                <button
                  onClick={() => setAddTestOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                >
                  <Sparkles className="size-4" />
                  Generate with AI
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {testCases.map((tc) => (
                  <TestCaseCard key={tc.id ?? tc.test_key} tc={tc} />
                ))}
              </div>
            )}
          </div>

          {/* ── Right: sidebar ── */}
          <div className="w-72 shrink-0 flex flex-col gap-4 sticky top-0">

            {/* Suite Statistics card */}
            {loading ? (
              <SidebarSkeleton />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-foreground">Suite Statistics</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                    Live
                  </span>
                </div>

                {/* Total count */}
                <div className="mb-4">
                  <span className="text-5xl font-black text-foreground tabular-nums tracking-tighter leading-none">
                    {testCases.length}
                  </span>
                  <span className="ml-2 text-sm font-medium text-muted-foreground">Total Tests</span>
                </div>

                {/* Priority breakdown */}
                <div className="space-y-2.5">
                  {PRIORITY_META.map(({ key, label, dot }) => (
                    priorityCounts[key] ? (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn('size-2 rounded-full shrink-0', dot)} />
                          <span className="text-xs text-muted-foreground">{label}</span>
                        </div>
                        <span className={cn(
                          'text-xs font-bold rounded-full px-2 py-0.5 tabular-nums',
                          key === 'critical' ? 'bg-red-500/10 text-red-500' :
                          key === 'high'     ? 'bg-orange-500/10 text-orange-500' :
                          key === 'medium'   ? 'bg-amber-500/10 text-amber-500' :
                                              'bg-green-500/10 text-green-600'
                        )}>
                          {priorityCounts[key]}
                        </span>
                      </div>
                    ) : null
                  ))}
                </div>

                {/* Context summary */}
                {feature?.context_summary && (
                  <div className="mt-5 pt-4 border-t border-border">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Sparkles className="size-3" />
                      Context Summary
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-5">
                      {feature.context_summary}
                    </p>
                  </div>
                )}

                {/* Footer */}
                {feature?.updated_at && (
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Updated {relativeTime(feature.updated_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                      Sync Active
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Deep Coverage Insight card */}
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex size-7 items-center justify-center rounded-lg bg-white/15">
                  <Zap className="size-3.5" />
                </div>
                <span className="text-sm font-semibold">Deep Coverage Insight</span>
              </div>
              <p className="text-xs leading-relaxed text-primary-foreground/80 mb-4">
                {testCases.length === 0
                  ? 'No test cases yet. Generate AI-powered tests based on the feature context to get started.'
                  : `${testCases.length} test${testCases.length !== 1 ? 's' : ''} generated. Review critical and high priority cases first. Add edge cases for full coverage.`
                }
              </p>
              <button
                onClick={() => setAddTestOpen(true)}
                className="w-full rounded-xl bg-white/15 hover:bg-white/25 transition-colors py-2 text-xs font-semibold text-primary-foreground"
              >
                Generate Tests
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Add Test Dialog */}
      <Dialog open={addTestOpen} onOpenChange={setAddTestOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] min-h-135 w-[95vw] overflow-hidden flex flex-col p-0">
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <CreateTestFlow
              onClose={() => {
                setAddTestOpen(false);
                refetchTests();
                refetchFeatures();
              }}
              projectId={projectId}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
