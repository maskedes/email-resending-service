/* Shared feature icons — used by the landing page feature grid and the
   Navbar "Features" dropdown so both stay visually consistent. */

/* ─── REST API icon ─── */
export const RestApiIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M0 0h20v20H0z" fill="none" />
    <path fill="currentColor" d="M16 13c-1.3 0-2.4.8-2.8 2H9c0-.7-.2-1.3-.5-1.8l7.1-7.3c.3 0 .6.1.9.1C17.9 6 19 4.9 19 3.5S17.9 1 16.5 1S14 2.1 14 3.5c0 .3.1.7.2 1l-7 7.2c-.6-.5-1.4-.7-2.2-.7V6.8C6.2 6.4 7 5.3 7 4c0-1.7-1.3-3-3-3S1 2.3 1 4c0 1.3.8 2.4 2 2.8v4.7c-1.2.7-2 2-2 3.4c0 2.2 1.8 4 4 4c1.5 0 2.8-.8 3.4-2h4.7c.4 1.1 1.5 2 2.8 2c1.6 0 3-1.3 3-3C19 14.3 17.6 13 16 13" />
  </svg>
);

/* ─── SMTP Relay icon (send / relay) ─── */
export const SmtpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M0 0h20v20H0z" fill="none" />
    <path fill="currentColor" d="M16 1.1L4 5.9c-1.1.4-2 1.8-2 3v8.7c0 1.2.9 1.8 2 1.4l12-4.8c1.1-.4 2-1.8 2-3V2.5c0-1.2-.9-1.8-2-1.4m.6 2.6l-6 9.3l-6.7-4.5c-.1-.1-.4-.4-.2-.7c.2-.4.7-.2.7-.2l6.3 2.3s4.8-6.3 5.1-6.7c.1-.2.4-.3.7-.1s.2.5.1.6" />
  </svg>
);

/* ─── API Key Auth icon (key) ───
   NOTE: placeholder key glyph — swap with the icon pasted by the user if different. */
export const ApiKeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
);

/* ─── Delivery tracking icon (cube / package) ─── */
export const DeliveryTrackingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M0 0h32v32H0z" fill="none" />
    <path fill="currentColor" d="m29.482 8.624l-10-5.5a1 1 0 0 0-.964 0l-10 5.5a1 1 0 0 0 0 1.752L18 15.591V26.31l-3.036-1.67L14 26.391l4.518 2.485a1 1 0 0 0 .964 0l10-5.5A1 1 0 0 0 30 22.5v-13a1 1 0 0 0-.518-.876M19 5.142L26.925 9.5L19 13.858L11.075 9.5Zm9 16.767l-8 4.4V15.59l8-4.4Z" />
    <path fill="currentColor" d="M10 16H2v-2h8zm2 8H4v-2h8zm2-4H6v-2h8z" />
  </svg>
);

/* ─── BullMQ Queue icon (queue / workers) ─── */
export const BullMqIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M7 16.18V10H5v6.18c-1.16.41-2 1.51-2 2.82c0 1.65 1.35 3 3 3s3-1.35 3-3c0-1.3-.84-2.4-2-2.82M18 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M6 2a2 2 0 1 0 0 4a2 2 0 1 0 0-4m6 4a2 2 0 1 0 0 4a2 2 0 1 0 0-4" />
  </svg>
);

/* ─── Self-Hosted icon (server stack) ─── */
export const SelfHostedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M0 0h32v32H0z" fill="none" />
    <circle cx="9" cy="6" r="1" fill="currentColor" />
    <path fill="currentColor" d="M26 2H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h9v4h2v-4h9a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2m0 6H6V4h20Zm-9 20v-2h-2v2H4v2h24v-2z" />
    <circle cx="9" cy="20" r="1" fill="currentColor" />
    <path fill="currentColor" d="M6 24h20a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2m0-6h20v4H6Z" />
  </svg>
);
