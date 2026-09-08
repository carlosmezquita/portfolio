// Keep the shared OS window aligned with the embedded document.
if (window.parent !== window) {
    document.documentElement.classList.add('embedded');
    document.querySelectorAll('a[target="_top"]').forEach(link => {
        link.addEventListener('click', event => {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            window.parent.postMessage('portfolio:close-project', location.origin);
        });
    });
    window.parent.postMessage({ type: 'portfolio:project-ready', path: location.pathname, title: document.title }, location.origin);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            window.parent.postMessage('portfolio:close-project', location.origin);
        }
    });
}

