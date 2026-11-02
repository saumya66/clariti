import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboardingStore } from '@/store/onboardingStore';

export function OnboardingModal({ open }: { open: boolean }) {
  const setComplete = useOnboardingStore((state) => state.setComplete);
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md gap-0 p-0 overflow-hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        hideCloseButton={true}
      >
        <div className="p-6 flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Claude is ready</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Clariti includes hosted AI credit for generating and executing tests. You do not need an API key.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">Your usage and remaining credit are available in Settings.</span>
          </div>
          <Button onClick={setComplete} className="w-full">Continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
