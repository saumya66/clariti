import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Monitor,
  MousePointer,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Save,
  CheckCircle,
  ArrowRight,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPermissions, type PermissionsStatus } from '@/api/client';
import { useKeyStore } from '@/store/keyStore';
import { useOnboardingStore } from '@/store/onboardingStore';

type PermPhase =
  | { phase: 'checking' }
  | { phase: 'granted' }
  | { phase: 'missing'; perms: PermissionsStatus }
  | { phase: 'error'; message: string };

type Step = 'permissions' | 'apiKey';

export function OnboardingModal({ open }: { open: boolean }) {
  const setComplete = useOnboardingStore((s) => s.setComplete);
  const { setKey } = useKeyStore();

  // ── Step tracking ──────────────────────────────────────────────
  const [step, setStep] = useState<Step>('permissions');

  // ── Permissions step state ─────────────────────────────────────
  const [permState, setPermState] = useState<PermPhase>({ phase: 'checking' });

  const checkPerms = useCallback(async () => {
    setPermState({ phase: 'checking' });
    try {
      const perms = await getPermissions();
      if (perms.screen_recording && perms.accessibility) {
        setPermState({ phase: 'granted' });
      } else {
        setPermState({ phase: 'missing', perms });
      }
    } catch {
      setPermState({
        phase: 'error',
        message: 'Could not check permissions. Please restart AutoQA and try again.',
      });
    }
  }, []);

  useEffect(() => {
    if (open && step === 'permissions') checkPerms();
  }, [open, step, checkPerms]);

  // ── API key step state ─────────────────────────────────────────
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  async function handleSaveKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setSaving(true);
    setKeyError(null);
    try {
      await window.electronAPI.saveAnthropicKey(trimmed);
      setKey(trimmed);
      setComplete();
    } catch (e) {
      setKeyError((e as Error).message ?? 'Failed to save key');
    } finally {
      setSaving(false);
    }
  }

  function handleSkipKey() {
    setComplete();
  }

  // ── Render ─────────────────────────────────────────────────────
  const totalSteps = 2;
  const currentStepNum = step === 'permissions' ? 1 : 2;

  return (
    <Dialog open={open}>
      {/* Prevent closing by clicking outside or pressing Escape */}
      <DialogContent
        className="sm:max-w-md gap-0 p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        {/* Progress bar */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-1 bg-primary transition-all duration-300"
            style={{ width: `${(currentStepNum / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Header */}
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">
                {step === 'permissions' ? 'Grant permissions' : 'Add your API key'}
              </DialogTitle>
              <span className="text-xs text-muted-foreground">
                Step {currentStepNum} of {totalSteps}
              </span>
            </div>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {step === 'permissions'
                ? 'AutoQA needs these macOS permissions to capture screenshots and control your apps.'
                : 'AutoQA uses Claude to generate and execute test cases. Your key is stored encrypted in your OS keychain.'}
            </DialogDescription>
          </DialogHeader>

          {/* ── Step 1: Permissions ── */}
          {step === 'permissions' && (
            <div className="flex flex-col gap-4">
              {permState.phase === 'checking' && (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Checking permissions…</span>
                </div>
              )}

              {permState.phase === 'error' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                    <Shield className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{permState.message}</p>
                  </div>
                  <Button variant="outline" onClick={checkPerms} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </Button>
                </div>
              )}

              {(permState.phase === 'missing' || permState.phase === 'granted') && (
                <>
                  <div className="flex flex-col gap-2">
                    <PermissionRow
                      icon={<Monitor className="w-4 h-4" />}
                      label="Screen Recording"
                      granted={
                        permState.phase === 'granted' ||
                        (permState.phase === 'missing' && permState.perms.screen_recording)
                      }
                      onOpenSettings={() => {
                        window.electronAPI?.requestScreenRecording?.();
                      }}
                    />
                    <PermissionRow
                      icon={<MousePointer className="w-4 h-4" />}
                      label="Accessibility"
                      granted={
                        permState.phase === 'granted' ||
                        (permState.phase === 'missing' && permState.perms.accessibility)
                      }
                      onOpenSettings={() => {
                        window.electronAPI?.requestAccessibility?.();
                      }}
                    />
                  </div>

                  {permState.phase === 'missing' && (
                    <p className="text-xs text-muted-foreground">
                      Click "Open Settings" next to each missing permission, grant access, then click "Check again".
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={checkPerms} className="flex-1 gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Check again
                    </Button>
                    <Button
                      onClick={() => setStep('apiKey')}
                      disabled={permState.phase !== 'granted'}
                      className="flex-1 gap-2"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 2: API Key ── */}
          {step === 'apiKey' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <Key className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground font-mono">
                  Stored with OS-level encryption — never sent to our servers
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="onboarding-api-key" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Anthropic API Key
                </Label>
                <div className="relative">
                  <Input
                    id="onboarding-api-key"
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                    placeholder="sk-ant-api03-..."
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {keyError && <p className="text-xs text-destructive">{keyError}</p>}
              </div>

              <p className="text-xs text-muted-foreground">
                Get your key at{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSkipKey}
                  className="flex-1 text-muted-foreground"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim() || saving}
                  className="flex-1 gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save & finish'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PermissionRow({
  icon,
  label,
  granted,
  onOpenSettings,
}: {
  icon: ReactNode;
  label: string;
  granted: boolean;
  onOpenSettings?: () => void | Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className={granted ? 'text-emerald-500' : 'text-amber-500'}>{icon}</span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            granted
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-amber-500/10 text-amber-500'
          }`}
        >
          {granted ? 'Granted' : 'Required'}
        </span>
      </div>
      {!granted && onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Open Settings
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
      {granted && <CheckCircle className="h-4 w-4 text-emerald-500" />}
    </div>
  );
}
