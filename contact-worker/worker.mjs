import { EmailMessage } from 'cloudflare:email';
import { handleContact } from './handler.mjs';
import { recordEvent } from '../analytics-worker/events.mjs';
import { storeRequest } from './inbox.mjs';

export default {
  fetch(request, env, ctx) {
    return handleContact(request, env, {
      verify: (body) => fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body, signal: AbortSignal.timeout(10000),
      }),
      deliver: (from, to, raw) => env.CONTACT_EMAIL.send(new EmailMessage(from, to, raw)),
      storeRequest: (fields) => {
        ctx.waitUntil(storeRequest(env.EVENTS_DB, fields)
          .catch(() => console.warn(JSON.stringify({ event: 'contact_inbox_unavailable' }))));
      },
      recordSuccess: (page) => {
        if (!env.EVENTS_DB) return;
        ctx.waitUntil(recordEvent(env.EVENTS_DB, 'contact_success', 'contact', page)
          .catch(() => console.warn(JSON.stringify({ event: 'contact_analytics_unavailable' }))));
      },
    });
  },
};
