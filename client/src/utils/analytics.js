const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID;

export function trackPageView(pathname) {
  if (!import.meta.env.PROD || !/^G-[A-Z0-9]+$/.test(measurementId || '')) return;
  if (!['/', '/catalogue', '/shortlist'].includes(pathname) && !/^\/cards\/[^/]+$/.test(pathname)) return;
  if (window.location.hostname !== 'mtcards.in' && window.location.hostname !== 'www.mtcards.in') return;

  if (!document.getElementById('mtcards-google-tag')) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false, allow_google_signals: false });
    const script = document.createElement('script');
    script.id = 'mtcards-google-tag';
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
  }

  window.gtag('event', 'page_view', {
    send_to: measurementId,
    page_location: window.location.origin + pathname,
    page_referrer: '',
    page_title: document.title
  });
}
