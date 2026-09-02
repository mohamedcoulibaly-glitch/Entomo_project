document.addEventListener('DOMContentLoaded', async () => {
  const messagesEl = document.getElementById('assistant-messages');
  const form = document.getElementById('assistant-form');
  const input = document.getElementById('assistant-input');
  const suggestionsEl = document.getElementById('assistant-suggestions');

  function appendMessage(role, text, meta = {}) {
    const bubble = document.createElement('div');
    bubble.className = role === 'user'
      ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand-primary text-white px-4 py-3 text-sm'
      : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-800 dark:text-gray-100';
    bubble.textContent = text;
    if (role === 'assistant' && meta.provider && meta.provider !== 'rules') {
      const badge = document.createElement('p');
      badge.className = 'text-[10px] text-gray-400 mt-1';
      badge.textContent = `via ${meta.provider}`;
      bubble.appendChild(badge);
    }
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderSuggestions(items = []) {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = items.map(item => `
      <button type="button" class="assistant-suggestion px-3 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-brand-primary/10">
        ${item}
      </button>`).join('');
    suggestionsEl.querySelectorAll('.assistant-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.textContent.trim();
        form.requestSubmit();
      });
    });
  }

  try {
    const context = await apiAssistant.context();
    appendMessage('assistant', `Bonjour. Je peux vous aider sur ${context.sites_active} site(s), ${context.captures_pending} capture(s) à valider et la synchronisation DHIS2.`);
    renderSuggestions(['Combien de captures à valider ?', 'État DHIS2', 'Modèles déployés']);
  } catch {
    appendMessage('assistant', 'Assistant connecté. Posez votre question sur la surveillance entomologique.');
  }

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    appendMessage('user', message);
    input.value = '';
    try {
      const res = await apiAssistant.chat(message);
      appendMessage('assistant', res.reply, { provider: res.provider });
      renderSuggestions(res.suggestions || []);
    } catch (err) {
      appendMessage('assistant', 'Je n’ai pas pu joindre le serveur. Vérifiez votre connexion.');
    }
  });
});
