// Keep the native OS window aligned with the embedded document.
if (window.parent !== window) {
    window.parent.postMessage({ type: 'portfolio:project-ready', path: location.pathname, title: document.title }, location.origin);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            window.parent.postMessage('portfolio:close-project', location.origin);
        }
    });
}
