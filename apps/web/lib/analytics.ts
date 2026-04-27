/**
 * Utilidades para el seguimiento de eventos en Google Analytics 4
 */

type EventNames = 
  | 'join_waitlist_click' 
  | 'registration_submit' 
  | 'feedback_banner_click'
  | 'game_start'
  | 'game_contact_submit'
  | 'game_beta_interest'
  | 'game_finish'
  | 'share_link_click';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const trackEvent = (eventName: EventNames, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  } else {
    console.warn(`[Analytics] gtag no disponible para el evento: ${eventName}`);
  }
};
