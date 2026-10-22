import { handleEvent } from './events.mjs';

export default {
  fetch: handleEvent,
  async scheduled(_controller, env) {
    await env.EVENTS_DB.prepare("DELETE FROM event_counts WHERE day < date('now', '-89 days')").run();
  },
};
