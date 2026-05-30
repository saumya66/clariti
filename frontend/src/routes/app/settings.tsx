import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Eye, EyeOff, Save, Trash2, CheckCircle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useKeyStore } from '@/store/keyStore';

export const Route = createFileRoute('/app/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { hasKey, setKey } = useKeyStore();
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await window.electronAPI.saveAnthropicKey(trimmed);
      setKey(trimmed);
      setInputValue('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to save key');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    setError(null);
    try {
      await window.electronAPI.deleteAnthropicKey();
      setKey(null);
      setInputValue('');
    } catch (e) {
      setError((e as Error).message ?? 'Failed to remove key');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your API credentials. Keys are stored encrypted in your OS keychain and never leave your machine.
          </p>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Key className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">Anthropic API Key</CardTitle>
                  <CardDescription className="text-xs">
                    Used for Claude-powered test execution and AI features
                  </CardDescription>
                </div>
              </div>
              {hasKey && (
                <Badge variant="secondary" className="gap-1.5 text-emerald-600 bg-emerald-500/10">
                  <CheckCircle className="h-3 w-3" />
                  Saved
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {hasKey && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                <span className="text-sm font-mono text-muted-foreground">
                  sk-ant-••••••••••••••••••••••
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={saving}
                  className="h-7 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="api-key" className="text-xs uppercase tracking-wide text-muted-foreground">
                {hasKey ? 'Replace key' : 'Enter your API key'}
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="sk-ant-api03-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                onClick={handleSave}
                disabled={!inputValue.trim() || saving}
                className="w-full gap-2"
              >
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save key'}
                  </>
                )}
              </Button>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
