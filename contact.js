// The recipient and Turnstile secret stay in the contact Worker's secret store.
(() => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const endpoint = form.action;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-contact-status]');
  const widget = form.querySelector('[data-contact-verification]');
  let widgetId;
  let token = '';
  let sending = false;

  const setStatus = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
  };
  const updateButton = () => { button.disabled = sending || !token; };
  const unavailable = () => {
    token = '';
    updateButton();
    setStatus('The form couldn’t connect. Please reload or message me on LinkedIn.', 'error');
  };

  async function initialise() {
    try {
      const response = await fetch(`${endpoint}/config`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Configuration unavailable');
      const { sitekey } = await response.json();
      if (typeof sitekey !== 'string' || !sitekey) throw new Error('Missing sitekey');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      widgetId = window.turnstile.render(widget, {
        sitekey, action: 'contact', theme: 'light', size: 'flexible',
        callback(value) {
          token = value;
          updateButton();
          if (status.dataset.state === 'verification') setStatus('');
        },
        'expired-callback'() {
          token = '';
          updateButton();
          if (!sending) setStatus('Please complete the verification again.', 'verification');
        },
        'error-callback'() {
          token = '';
          updateButton();
          setStatus('Verification couldn’t load. Please reload or use LinkedIn.', 'error');
        },
      });
      if (status.dataset.state === 'loading') setStatus('');
    } catch { unavailable(); }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    if (!token) {
      setStatus('Please complete the verification first.', 'verification');
      return;
    }
    sending = true;
    updateButton();
    button.firstChild.textContent = 'Sending… ';
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending your message…');
    try {
      const fields = new FormData(form);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          name: fields.get('name'), email: fields.get('email'),
          message: fields.get('message'), website: fields.get('website'),
          'cf-turnstile-response': token,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        if (response.status === 429) throw new Error('Too many attempts. Please wait a minute and try again.');
        if (response.status === 403) throw new Error('Verification expired. Please verify again and resend.');
        if (response.status === 400) throw new Error('Please check your name, email and message, then try again.');
        throw new Error('Your message couldn’t be sent. Please try again or use LinkedIn.');
      }
      form.reset();
      setStatus('Thanks—your message is on its way to my inbox.', 'success');
    } catch (error) {
      setStatus(error.name === 'TimeoutError'
        ? 'The connection timed out. Delivery is unconfirmed; please wait before retrying.'
        : error.message === 'Failed to fetch'
          ? 'The connection failed. Please try again or message me on LinkedIn.'
          : error.message, 'error');
    } finally {
      // Tokens are single-use, including attempts where the email send fails.
      token = '';
      sending = false;
      button.firstChild.textContent = 'Send message ';
      form.removeAttribute('aria-busy');
      updateButton();
      if (widgetId !== undefined) window.turnstile.reset(widgetId);
    }
  });

  setStatus('Loading verification…', 'loading');
  initialise();
})();
