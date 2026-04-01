import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  FlaskConical,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ListChecks,
  AlertCircle,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useProject, useProjectFeatures, useFeatureTestCases } from '@/hooks/useProjectsQueries';
import { cn } from '@/lib/utils';
import type { CloudTestCase } from '@/api/client';

export const Route = createFileRoute('/app/projects/$projectId/tests/$featureId')({
  component: FeatureDetailPage,
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function priorityBadge(priority: string | null | undefined) {
  switch (priority) {
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/30';
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    case 'medium':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    case 'low':
      return 'bg-green-500/10 text-green-600 border-green-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function categoryBadge(category: string | null | undefined) {
  switch (category) {
    case 'functional':
      return 'bg-blue-500/10 text-blue-500';
    case 'negative':
      return 'bg-red-500/10 text-red-400';
    case 'ui':
      return 'bg-purple-500/10 text-purple-400';
    case 'edge_case':
      return 'bg-amber-500/10 text-amber-500';
    case 'accessibility':
      return 'bg-teal-500/10 text-teal-500';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function TestCaseCard({ tc }: { tc: CloudTestCase }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="shrink-0 mt-0.5">
          <span className="text-muted-foreground text-xs font-mono">{tc.test_key}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {tc.category && (
              <span className={cn('px-2 py-0.5 text-xs rounded-full', categoryBadge(tc.category))}>
                {tc.category.replace('_', ' ')}
              </span>
            )}
            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded-full border',
                priorityBadge(tc.priority)
              )}
            >
              {tc.priority ?? 'medium'}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{tc.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tc.goal}</p>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border space-y-4 pt-3">
          {tc.expected_result && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Expected Result
              </p>
              <p className="text-sm text-green-500">{tc.expected_result}</p>
            </div>
          )}
          {tc.created_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" /> Added {formatDate(tc.created_at)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FeatureDetailPage() {
  const { projectId, featureId } = Route.useParams();
  const { project } = useProject(projectId);
  const { features } = useProjectFeatures(projectId);
  const { testCases, loading, error } = useFeatureTestCases(featureId);

  const feature = features.find((f) => f.id === featureId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
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
            <BreadcrumbPage>{feature?.name ?? '…'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FlaskConical className="size-4" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {feature?.name ?? 'Test Suite'}
          </h1>
        </div>
        {feature?.description && (
          <p className="text-sm text-muted-foreground mt-1 ml-11">{feature.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3 ml-11 text-xs text-muted-foreground">
          {feature?.created_at && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> Created {formatDate(feature.created_at)}
            </span>
          )}
          {!loading && (
            <span className="flex items-center gap-1">
              <ListChecks className="size-3" />
              {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Loading test cases…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : testCases.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ListChecks className="size-7" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">No test cases saved yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Run through the test creation flow and save your generated test cases to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {testCases.map((tc) => (
            <TestCaseCard key={tc.id ?? tc.test_key} tc={tc} />
          ))}
        </div>
      )}

      {/* Back link */}
      <div className="mt-6">
        <Link
          to="/app/projects/$projectId/tests"
          params={{ projectId }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="size-3.5 rotate-180" />
          Back to Test Suites
        </Link>
      </div>
    </div>
  );
}
