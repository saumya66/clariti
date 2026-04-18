import { create } from 'zustand';
import {
  executeTestsStream,
  provideGuidance,
  pauseExecution as apiPauseExecution,
  resumeExecution as apiResumeExecution,
  abortExecution as apiAbortExecution,
  CUProvider,
  type CloudTestCase,
  type TestStartEvent,
  type StepEvent,
  type NeedHelpEvent,
  type PausedEvent,
  type TestCompleteEvent,
  type SuiteCompleteEvent,
} from '../api/client';

export type TestRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type SuiteRunStatus = 'idle' | 'running' | 'complete' | 'error' | 'aborted';

export interface TestRun {
  id: string;
  test_key: string;
  title: string;
  goal: string;
  expected_result?: string | null;
  status: TestRunStatus;
  conclusion?: string;
  steps_executed?: number;
  test_number?: number;
}

export interface ActivityEntry {
  id: string;
  time: string;
  testId: string;
  action: string;
  description: string;
  type: 'click' | 'type' | 'scroll' | 'observe' | 'navigate' | 'wait' | 'guidance' | 'other';
  success: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

export interface GuidanceNeeded {
  testId: string;
  question: string;
  currentState: string;
  confidence?: 'high' | 'medium' | 'low';
}

function getActivityType(action: string): ActivityEntry['type'] {
  const a = action.toLowerCase();
  if (a.includes('click')) return 'click';
  if (a.includes('type') || a.includes('text') || a.includes('key')) return 'type';
  if (a.includes('scroll')) return 'scroll';
  if (a.includes('navigate') || a.includes('url') || a.includes('open') || a.includes('go')) return 'navigate';
  if (a.includes('wait')) return 'wait';
  if (a.includes('screenshot') || a.includes('observe') || a.includes('scan') || a.includes('search')) return 'observe';
  return 'other';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface TestSuiteExecutionState {
  status: SuiteRunStatus;
  featureId: string | null;
  featureName: string | null;
  windowTitle: string | null;
  tests: TestRun[];
  currentTestId: string | null;
  activityLog: ActivityEntry[];
  thinking: string;
  suiteResult: { passed: number; failed: number; skipped: number; total: number } | null;
  error: string | null;

  // Guidance / pause state
  guidanceNeeded: GuidanceNeeded | null;
  isPaused: boolean;

  setInitialTests: (tests: CloudTestCase[]) => void;
  startExecution: (params: {
    featureId: string;
    featureName: string;
    windowTitle: string;
    provider: CUProvider;
    token: string;
    userId: string;
  }) => Promise<void>;

  /** Submit guidance when the agent is stuck or paused */
  submitGuidance: (guidance: string) => Promise<void>;
  /** Manually pause execution after the current step */
  pauseExecution: () => Promise<void>;
  /** Resume execution after a manual pause, optionally with guidance */
  resumeExecution: (guidance?: string) => Promise<void>;
  /** Abort the entire run immediately */
  abortExecution: () => Promise<void>;

  reset: () => void;
}

// AbortController lives outside Zustand state (non-serialisable)
let _abortController: AbortController | null = null;

export const useTestSuiteExecutionStore = create<TestSuiteExecutionState>((set, get) => ({
  status: 'idle',
  featureId: null,
  featureName: null,
  windowTitle: null,
  tests: [],
  currentTestId: null,
  activityLog: [],
  thinking: '',
  suiteResult: null,
  error: null,
  guidanceNeeded: null,
  isPaused: false,

  setInitialTests: (testCases: CloudTestCase[]) => {
    set({
      tests: testCases.map((tc, i) => ({
        id: tc.id ?? `tc-${i}`,
        test_key: tc.test_key ?? `TC-${String(i + 1).padStart(3, '0')}`,
        title: tc.title,
        goal: tc.goal,
        expected_result: tc.expected_result,
        status: 'pending',
      })),
    });
  },

  startExecution: async ({ featureId, featureName, windowTitle, provider, token, userId }) => {
    const existingTests = get().tests;
    // Create a fresh AbortController for this run
    _abortController = new AbortController();

    set({
      status: 'running',
      featureId,
      featureName,
      windowTitle,
      tests: existingTests.map((t) => ({ ...t, status: 'pending' })),
      currentTestId: null,
      activityLog: [],
      thinking: '',
      suiteResult: null,
      error: null,
      guidanceNeeded: null,
      isPaused: false,
    });

    try {
      await executeTestsStream(
        featureId,
        {
          window_title: windowTitle,
          provider,
          cloud_feature_id: featureId,
          cloud_user_id: userId,
          cloud_token: token,
        },
        {
          onSuiteStart: () => {},

          onTestStart: (data: TestStartEvent) => {
            set((state) => ({
              tests: state.tests.map((t) =>
                t.id === data.test_id
                  ? { ...t, status: 'running', test_number: data.test_number }
                  : t.status === 'running'
                  ? { ...t, status: 'pending' }
                  : t
              ),
              currentTestId: data.test_id,
              activityLog: [],
              thinking: '',
              guidanceNeeded: null,
              isPaused: false,
            }));
          },

          onStep: (data: StepEvent) => {
            const description =
              data.reasoning?.trim() ||
              `${data.action}${data.target ? ` → ${data.target}` : ''}${data.value ? ` at ${data.value}` : ''}`;

            const entry: ActivityEntry = {
              id: `${data.test_id}-${data.step_number}-${Date.now()}`,
              time: formatTime(new Date()),
              testId: data.test_id,
              action: data.action,
              description,
              type: getActivityType(data.action),
              success: data.success,
              confidence: data.confidence,
            };

            set((state) => ({
              activityLog: [...state.activityLog, entry],
              thinking: '',
            }));
          },

          onNeedHelp: (data: NeedHelpEvent) => {
            // Add a guidance-request entry to the activity log
            const entry: ActivityEntry = {
              id: `${data.test_id}-help-${Date.now()}`,
              time: formatTime(new Date()),
              testId: data.test_id,
              action: 'stuck',
              description: data.question,
              type: 'guidance',
              success: false,
              confidence: data.confidence,
            };
            set((state) => ({
              activityLog: [...state.activityLog, entry],
              guidanceNeeded: {
                testId: data.test_id,
                question: data.question,
                currentState: data.current_state,
                confidence: data.confidence,
              },
            }));
          },

          onPaused: (data: PausedEvent) => {
            set({ isPaused: true, guidanceNeeded: null });
            // Add a paused marker to the activity log
            const entry: ActivityEntry = {
              id: `${data.test_id}-paused-${Date.now()}`,
              time: formatTime(new Date()),
              testId: data.test_id,
              action: 'paused',
              description: 'Execution paused — waiting for your guidance',
              type: 'guidance',
              success: true,
            };
            set((state) => ({ activityLog: [...state.activityLog, entry] }));
          },

          onTestComplete: (data: TestCompleteEvent) => {
            set((state) => ({
              tests: state.tests.map((t) =>
                t.id === data.test_id
                  ? {
                      ...t,
                      status: data.status,
                      conclusion: data.conclusion,
                      steps_executed: data.steps_executed,
                    }
                  : t
              ),
              guidanceNeeded: null,
              isPaused: false,
            }));
          },

          onSuiteComplete: (data: SuiteCompleteEvent) => {
            set({
              status: 'complete',
              suiteResult: {
                passed: data.passed,
                failed: data.failed,
                skipped: data.skipped,
                total: data.total,
              },
              currentTestId: null,
              thinking: '',
              guidanceNeeded: null,
              isPaused: false,
            });
          },

          onTestSkip: (data) => {
            set((state) => ({
              tests: state.tests.map((t) =>
                t.id === data.test_id ? { ...t, status: 'skipped' } : t
              ),
            }));
          },

          onAborted: () => {
            set({ status: 'idle', currentTestId: null, thinking: '', guidanceNeeded: null, isPaused: false });
          },

          onError: (message) => {
            set({ status: 'error', error: message, thinking: '', guidanceNeeded: null, isPaused: false });
          },
        },
        _abortController?.signal
      );
    } catch (err) {
      // AbortError is swallowed in executeTestsStream — any re-throw here is a real error
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Execution failed',
        thinking: '',
        guidanceNeeded: null,
        isPaused: false,
      });
    }
  },

  submitGuidance: async (guidance: string) => {
    const { featureId, guidanceNeeded } = get();
    if (!featureId || !guidanceNeeded) return;
    try {
      await provideGuidance(featureId, guidanceNeeded.testId, guidance);
      set({ guidanceNeeded: null });
    } catch (err) {
      console.error('Failed to submit guidance:', err);
    }
  },

  pauseExecution: async () => {
    const { featureId } = get();
    if (!featureId) return;
    try {
      await apiPauseExecution(featureId);
    } catch (err) {
      console.error('Failed to pause execution:', err);
    }
  },

  resumeExecution: async (guidance?: string) => {
    const { featureId } = get();
    if (!featureId) return;
    try {
      await apiResumeExecution(featureId, guidance);
      set({ isPaused: false, guidanceNeeded: null });
    } catch (err) {
      console.error('Failed to resume execution:', err);
    }
  },

  abortExecution: async () => {
    const { featureId } = get();
    // Cancel the SSE fetch immediately so the frontend stops reading
    _abortController?.abort();
    _abortController = null;
    // Tell the backend to stop the loop
    if (featureId) {
      try {
        await apiAbortExecution(featureId);
      } catch (err) {
        console.error('Failed to send abort signal to backend:', err);
      }
    }
    set({ status: 'aborted', currentTestId: null, thinking: '', guidanceNeeded: null, isPaused: false });
  },

  reset: () =>
    set({
      status: 'idle',
      featureId: null,
      featureName: null,
      windowTitle: null,
      tests: [],
      currentTestId: null,
      activityLog: [],
      thinking: '',
      suiteResult: null,
      error: null,
      guidanceNeeded: null,
      isPaused: false,
    }),
}));
