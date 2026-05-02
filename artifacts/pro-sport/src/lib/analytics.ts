type EventNames =
  | 'join_waitlist_click'
  | 'registration_submit'
  | 'feedback_banner_click'
  | 'game_start'
  | 'game_contact_submit'
  | 'game_beta_interest'
  | 'game_finish'
  | 'share_link_click';

type GtagFn = (command: string, eventName: string, params?: Record<string, unknown>) => void;
type WindowWithGtag = Window & typeof globalThis & { gtag?: GtagFn };

export const trackEvent = (eventName: EventNames, properties?: Record<string, unknown>) => {
  const w = typeof window !== 'undefined' ? (window as WindowWithGtag) : undefined;
  if (w) {
    console.log(`[Analytics] Event: ${eventName}`, properties);
    if (w.gtag) {
      w.gtag('event', eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    }
  }
};
