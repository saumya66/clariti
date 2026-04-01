import * as React from 'react';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import {
  FlaskConical,
  Plus,
  CalendarDays,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Circle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { CreateTestFlow } from '@/components/CreateTestFlow';
import { useProject, useProjectFeatures } from '@/hooks/useProjectsQueries';
import { cn } from '@/lib/utils';
import type { Feature } from '@/api/client';

export const Route = createFileRoute('/app/projects/$projectId/')({
  component: ProjectBentoPage,
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function FeatureStatusDot({ status }: { status?: string }) {
  const isReady = status === 'context_ready' || status === 'tests_generated';
  return isReady
    ? <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
    : <Circle className="size-3.5 text-muted-foreground/40 shrink-0" />;
}

function ProjectBentoPage() {
  const { projectId } = Route.useParams();
  const router = useRouter();
  const { project } = useProject(projectId);
  const { features, loading: featuresLoading } = useProjectFeatures(projectId);
  const [createTestOpen, setCreateTestOpen] = React.useState(false);

  if (!project) return null;

  const hasContext = !!project.context_summary;
  const previewFeatures = features.slice(0, 5);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/app" className="text-muted-foreground hover:text-foreground">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{project.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Bento grid */}
      <div className="grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* ── Hero card ── */}
        <div className="relative col-span-1 flex flex-col overflow-hidden rounded-2xl bg-violet-600 p-6 sm:col-span-2 lg:col-span-2">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -right-4 size-64 rounded-full bg-white/5" />

          {/* Badge */}
          <div className="mb-4 w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
            Active Project
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="mt-2 max-w-md text-sm leading-relaxed text-violet-200">
              {project.description}
            </p>
          )}

          {/* Stats row */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">
                Test Suites
              </span>
              <span className="text-xl font-bold text-white">
                {featuresLoading ? '—' : features.length}
              </span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">
                Context
              </span>
              <span className={cn(
                'text-sm font-semibold',
                hasContext ? 'text-emerald-300' : 'text-violet-200'
              )}>
                {hasContext ? '● Ready' : '○ Not set'}
              </span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">
                Created
              </span>
              <span className="text-sm font-medium text-white">
                {formatDate(project.created_at)}
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 flex items-center gap-3">
            <Button
              size="sm"
              className="bg-white text-violet-700 hover:bg-violet-50"
              onClick={() => setCreateTestOpen(true)}
            >
              <Plus className="size-3.5" />
              New Test Suite
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => router.navigate({ to: '/app/projects/$projectId/tests', params: { projectId } })}
            >
              View all suites
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Test Suites card ── */}
        <button
          onClick={() => router.navigate({ to: '/app/projects/$projectId/tests', params: { projectId } })}
          className="group col-span-1 flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-auto">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <FlaskConical className="size-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Test Suites</h2>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </div>

          {featuresLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <div className="h-12 w-20 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : features.length > 0 ? (
            <>
              {/* Big number — right-aligned decorative stat */}
              <div className="flex flex-col items-end flex-1 py-4 pt-8" style={{ textAlign: 'right' }}>
                <span className="text-8xl font-black text-foreground/90 tabular-nums leading-none tracking-tighter">
                  {features.length}
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-1">
                  suite{features.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Status breakdown */}
              {(() => {
                const ready = features.filter((f: Feature) => f.status === 'context_ready' || f.status === 'tests_generated').length;
                const pending = features.length - ready;
                return (
                  <div className="flex items-center justify-end gap-2 flex-wrap mt-1">
                    {ready > 0 && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 rounded-full px-2.5 py-0.5">
                        {ready} ready
                      </span>
                    )}
                    {pending > 0 && (
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
                        {pending} pending
                      </span>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <FlaskConical className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No suites yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Create your first to get started.</p>
              </div>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setCreateTestOpen(true); }}>
                <Plus className="size-3.5" />
                New Suite
              </Button>
            </div>
          )}
        </button>

        {/* ── AI Context / Project Info — full width ── */}
        {hasContext ? (
          <button
            onClick={() => router.navigate({ to: '/app/projects/$projectId/context', params: { projectId } })}
            className="group col-span-1 flex flex-col rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-amber-400/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-2 lg:col-span-3"
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10">
                <Sparkles className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">AI Insight</p>
                <h2 className="text-sm font-semibold text-foreground">Project Context Summary</h2>
              </div>
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {project.context_summary}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              View full context <ChevronRight className="size-3" />
            </div>
          </button>
        ) : (
          <div className="col-span-1 flex flex-col rounded-2xl border border-border bg-card p-5 sm:col-span-2 lg:col-span-3">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Project Info</h2>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Created</p>
                <p className="font-medium text-foreground">{formatDate(project.created_at)}</p>
              </div>
              {project.description && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Description</p>
                  <p>{project.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* New Test Suite Dialog */}
      <Dialog open={createTestOpen} onOpenChange={setCreateTestOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] min-h-[540px] w-[95vw] overflow-hidden flex flex-col p-0">
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <CreateTestFlow onClose={() => setCreateTestOpen(false)} projectId={projectId} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
