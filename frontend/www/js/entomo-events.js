/**
 * Bus d'événements applicatifs (rafraîchissement inter-écrans sans rechargement).
 */
if (!window.EntomoEvents) {
const EntomoEvents = {
  dispatch(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(`entomo:${name}`, { detail }));
  },
  on(name, handler) {
    window.addEventListener(`entomo:${name}`, (e) => handler(e.detail || {}));
  },
};

window.EntomoEvents = EntomoEvents;
}
