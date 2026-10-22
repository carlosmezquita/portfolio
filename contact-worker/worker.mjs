import { EmailMessage } from 'cloudflare:email';
import { handleContact } from './handler.mjs';

export default {
  fetch(request, env) {
    return handleContact(request, env, {
      verify: (body) => fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body, signal: AbortSignal.timeout(10000),
      }),
      deliver: (from, to, raw) => env.CONTACT_EMAIL.send(new EmailMessage(from, to, raw)),
    });
  },
};
