/** Compatibilité : les pages gardent tailwind.config sans CDN runtime. */
window.tailwind = window.tailwind || { config: function () {} };
