import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  complete: boolean;
  setComplete: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      complete: false,
      setComplete: () => set({ complete: true }),
      reset: () => set({ complete: false }),
    }),
    {
      name: 'autoqa-onboarding',
    }
  )
);
