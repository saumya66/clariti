import { create } from 'zustand';
import {
  executeTestsStream,
  CUProvider,
  type CloudTestCase,
  type TestStartEvent,
  type StepEvent,
  type TestCompleteEvent,
  type SuiteCompleteEvent,
} from '../api/client';

export type TestRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type SuiteRunStatus = 'idle' | 'running' | 'complete' | 'error';

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
  type: 'click' | 'type' | 'scroll' | 'observe' | 'navigate' | 'wait' | 'other';
  success: boolean;
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

  setInitialTests: (tests: CloudTestCase[]) => void;
  startExecution: (params: {
    featureId: string;
    featureName: string;
    windowTitle: string;
    provider: CUProvider;
    token: string;
    userId: string;
  }) => Promise<void>;
  reset: () => void;
}

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
            };

            set((state) => ({
              activityLog: [...state.activityLog, entry],
              thinking: '',
            }));
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
            });
          },

          onTestSkip: (data) => {
            set((state) => ({
              tests: state.tests.map((t) =>
                t.id === data.test_id ? { ...t, status: 'skipped' } : t
              ),
            }));
          },

          onError: (message) => {
            set({ status: 'error', error: message, thinking: '' });
          },
        }
      );
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Execution failed',
        thinking: '',
      });
    }
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
    }),
}));
