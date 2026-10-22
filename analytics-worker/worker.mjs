import { handleEvent } from './events.mjs';
import { handleContent } from './content.mjs';
import { handleTraffic } from './traffic.mjs';

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === '/api/traffic') return handleTraffic(request, env);
    return new URL(request.url).pathname === '/api/content' ? handleContent(request, env) : handleEvent(request, env);
  },
  async scheduled(_controller, env) {
    await env.EVENTS_DB.prepare("DELETE FROM traffic_counts WHERE day < date('now', '-89 days')").run();
    await env.EVENTS_DB.prepare("DELETE FROM event_counts WHERE day < date('now', '-89 days')").run();
    await env.EVENTS_DB.prepare("DELETE FROM contact_requests WHERE received_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')").run();
  },
};
