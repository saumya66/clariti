type EventParameter = string | number | boolean;

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, parameters?: Record<string, EventParameter>) => void;
  }
}

export function trackEvent(eventName: string, parameters: Record<string, EventParameter> = {}) {
  if (typeof window !== 'undefined') {
    window.gtag?.('event', eventName, parameters);
  }
}
