import css from './dashboard.css';
import adminCss from './admin.css';
import { handleDashboard } from './handler.mjs';

export default {
  fetch(request, env) { return handleDashboard(request, env, `${css}\n${adminCss}`); },
};
