// Preserve links shared by the previous portfolio window interface.
const legacyProjects = { '#project/surfay': '#surfay', '#project/urbot': '#urbot', '#project/cadeira': '#cadeira' };
const destination = legacyProjects[window.location.hash];
if (destination) {
  window.history.replaceState(null, '', destination);
  document.querySelector(destination)?.scrollIntoView();
}
