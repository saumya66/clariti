import { useState } from 'react';
import { Eye, EyeOff, Key, Save } from 'lucide-react';
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
import { useKeyStore } from '@/store/keyStore';
import { useOnboardingStore } from '@/store/onboardingStore';

export function OnboardingModal({ open }: { open: boolean }) {
  const setComplete = useOnboardingStore((s) => s.setComplete);
  const { setKey } = useKeyStore();

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

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md gap-0 p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton={true}
      >
        <div className="p-6 flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add your API key</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              AutoQA uses Claude to generate and execute test cases. Your key is stored encrypted in
              your OS keychain.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Key className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground font-mono">
              Stored with OS-level encryption — never sent to our servers
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="onboarding-api-key"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
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
      </DialogContent>
    </Dialog>
  );
}
