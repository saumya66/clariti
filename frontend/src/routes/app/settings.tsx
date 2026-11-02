import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getAICredit, type AICredit } from '@/api/client';

export const Route = createFileRoute('/app/settings')({ component: SettingsPage });

const asDollars = (microusd: number) => `$${(microusd / 1_000_000).toFixed(2)}`;

function SettingsPage() {
  const [credit, setCredit] = useState<AICredit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAICredit().then(setCredit).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Could not load AI credit.');
    });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clariti provides hosted Claude access. No personal API key is required.
          </p>
        </div>
        <Separator />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Coins className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Free AI credit</CardTitle>
                <CardDescription className="text-xs">Used by test generation, execution, and learning</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!credit && !error && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {credit && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Remaining', credit.remaining_microusd],
                  ['Used', credit.spent_microusd],
                  ['Allowance', credit.free_credit_microusd],
                ].map(([label, amount]) => (
                  <div key={String(label)} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-lg font-semibold">{asDollars(Number(amount))}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
