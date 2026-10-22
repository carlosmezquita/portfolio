// The recipient and Turnstile secret stay in the contact Worker's secret store.
(() => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const section = form.closest('.contact-footer');
  const endpoint = form.action;
  const button = form.querySelector('button[type="submit"]');
  const buttonLabel = form.querySelector('[data-submit-label]');
  const status = form.querySelector('[data-contact-status]');
  const widget = form.querySelector('[data-contact-verification]');
  const fields = ['name', 'email', 'message'].map((name) => form.elements.namedItem(name));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let widgetId;
  let token = '';
  let sending = false;
  let initialised = false;
  let initialisationObserver;
  form.noValidate = true;

  const setStatus = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
    form.dataset.state = state;
  };
  const updateButton = () => { button.disabled = sending || !token || form.dataset.state === 'success'; };
  const unavailable = () => {
    token = '';
    updateButton();
    setStatus('The form couldn’t connect. Please reload or message me on LinkedIn.', 'error');
  };

  // Enhance a visible form once; content is still visible if observers or JS fail.
  if (section && !reducedMotion.matches && 'IntersectionObserver' in window) {
    const entrance = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        section.classList.add('contact-entered');
        entrance.disconnect();
      }
    }, { threshold: 0.08 });
    entrance.observe(section);
    section.addEventListener('focusin', () => {
      entrance.disconnect();
      // Keyboard users should never have to wait for an entry animation.
      section.classList.remove('contact-entered');
    }, { once: true });
  }

  function validateField(field) {
    const value = field.value.trim();
    const maxLength = { name: 100, email: 254, message: 5000 }[field.name];
    const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
    let message = '';
    if (!value) message = field.name === 'name' ? 'Please enter your name.'
      : field.name === 'email' ? 'Please enter your email address.' : 'Please write a message.';
    else if (value.length > maxLength) {
      message = `Please use no more than ${maxLength} characters.`;
    } else if (field.name !== 'message' && /[\u0000-\u001f\u007f]/.test(value)) {
      message = 'Please use a single line without control characters.';
    } else if (field.name === 'email' && (field.validity.typeMismatch || !emailPattern.test(value)
        || value.split('@')[0].length > 64 || /^\.|\.@|\.\./.test(value)
        || value.split('@')[1].split('.').some((label) => label.length > 63))) {
      message = 'Please enter a valid email address.';
    } else if (field.name === 'message' && /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
      message = 'Please remove control characters from your message.';
    } else if (field.name === 'message' && value.length < 10) {
      message = 'Please add a little more detail—at least 10 characters.';
    }
    const error = document.getElementById(`${field.id}-error`);
    error.textContent = message;
    error.hidden = !message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !message;
  }

  for (const field of fields) {
    field.addEventListener('input', () => {
      // Only revisit an error after a submission; do not interrupt first-time typing.
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      if (form.dataset.state === 'success') {
        setStatus('');
        buttonLabel.textContent = 'Send message';
        updateButton();
      }
    });
  }

  async function initialise() {
    if (initialised) return;
    initialised = true;
    initialisationObserver?.disconnect();
    setStatus('Preparing secure delivery…', 'loading');
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
        sitekey, action: 'contact', theme: 'light', appearance: 'interaction-only',
        size: widget.getBoundingClientRect().width < 300 ? 'compact' : 'normal',
        callback(value) {
          token = value;
          widget.classList.remove('is-interactive');
          updateButton();
          if (['verification', 'loading'].includes(status.dataset.state)) setStatus('');
        },
        'before-interactive-callback'() {
          widget.classList.add('is-interactive');
          if (!sending && form.dataset.state !== 'success') setStatus('Please complete the quick verification to send.', 'verification');
        },
        'after-interactive-callback'() { widget.classList.remove('is-interactive'); },
        'expired-callback'() {
          token = '';
          updateButton();
          if (!sending && form.dataset.state !== 'success') setStatus('Refreshing verification…', 'loading');
        },
        'error-callback'() {
          token = '';
          updateButton();
          if (!sending && form.dataset.state !== 'success') {
            setStatus('Verification couldn’t load. Please reload or use LinkedIn.', 'verification');
          }
        },
      });
      if (status.dataset.state === 'loading') setStatus('');
    } catch { unavailable(); }
  }

  form.addEventListener('focusin', initialise, { once: true });
  if ('IntersectionObserver' in window) {
    initialisationObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) initialise();
    }, { rootMargin: '360px' });
    initialisationObserver.observe(form);
  } else initialise();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const validity = fields.map(validateField);
    if (validity.includes(false)) {
      fields[validity.indexOf(false)].focus();
      setStatus('Please check the highlighted fields.', 'error');
      return;
    }
    if (!token) {
      initialise();
      setStatus('Please complete the verification first.', 'verification');
      return;
    }
    const values = new FormData(form);
    sending = true;
    updateButton();
    buttonLabel.textContent = 'Sending';
    fields.forEach((field) => { field.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending your message…', 'sending');
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          name: values.get('name').trim(), email: values.get('email').trim(),
          message: values.get('message').trim(), website: values.get('website'),
          analytics_page: window.portfolioAnalytics?.page() ?? null,
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
      buttonLabel.textContent = 'Message sent';
      setStatus('Thank you. Your message has been sent to my inbox. I’ll reply personally using your email address.', 'success');
    } catch (error) {
      buttonLabel.textContent = 'Try again';
      setStatus(error.name === 'TimeoutError'
        ? 'The connection timed out. Delivery is unconfirmed; please wait before retrying.'
        : error.message === 'Failed to fetch'
          ? 'The connection failed. Please try again or message me on LinkedIn.'
          : error.message, 'error');
    } finally {
      token = '';
      sending = false;
      fields.forEach((field) => { field.disabled = false; });
      form.removeAttribute('aria-busy');
      updateButton();
      // Every retry needs a fresh single-use token. Success remains visible.
      if (widgetId !== undefined) window.turnstile.reset(widgetId);
    }
  });
})();
