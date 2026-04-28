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
  | 'game_role_selection'
  | 'share_link_click';

interface GtagWindow extends Window {
  gtag?: (command: 'event', eventName: string, params?: Record<string, unknown>) => void;
}

export const trackEvent = (eventName: EventNames, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    const win = window as unknown as GtagWindow;
    // Console log for easier debugging
    console.log(`[Analytics] Event: ${eventName}`, properties);

    if (win.gtag) {
      win.gtag('event', eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn(`[Analytics] gtag no disponible para el evento: ${eventName}`);
    }
  }
};
