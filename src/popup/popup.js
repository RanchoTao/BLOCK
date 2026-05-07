(function initPopup(root) {
  'use strict';

  const form = document.getElementById('rule-form');
  const typeInput = document.getElementById('rule-type');
  const patternInput = document.getElementById('rule-pattern');
  const noteInput = document.getElementById('rule-note');
  const message = document.getElementById('form-message');
  const list = document.getElementById('rules-list');
  const emptyState = document.getElementById('empty-state');
  const refreshButton = document.getElementById('refresh-button');
  const template = document.getElementById('rule-template');

  form.addEventListener('submit', addRule);
  refreshButton.addEventListener('click', renderRules);
  renderRules();

  async function addRule(event) {
    event.preventDefault();
    message.textContent = '';

    try {
      await root.BLOCK.storage.addRule({
        type: typeInput.value,
        pattern: patternInput.value,
        note: noteInput.value
      });
      form.reset();
      message.textContent = 'Rule added locally.';
      await notifyDnrSync();
      await renderRules();
    } catch (error) {
      message.textContent = error.message;
    }
  }

  async function renderRules() {
    const rules = await root.BLOCK.storage.getRules();
    list.textContent = '';
    emptyState.hidden = rules.length > 0;

    rules.forEach((rule) => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector('.rule-card');
      const enabled = node.querySelector('.rule-enabled');
      const type = node.querySelector('.rule-type');
      const pattern = node.querySelector('.rule-pattern');
      const note = node.querySelector('.rule-note');
      const meta = node.querySelector('.rule-meta');
      const save = node.querySelector('.save-rule');
      const remove = node.querySelector('.delete-rule');

      card.dataset.ruleId = rule.id;
      enabled.checked = rule.enabled;
      type.textContent = rule.type;
      pattern.value = rule.pattern;
      note.value = rule.note;
      meta.textContent = `Created ${new Date(rule.createdAt).toLocaleString()}`;

      enabled.addEventListener('change', () => updateRule(rule.id, { enabled: enabled.checked }));
      save.addEventListener('click', () => updateRule(rule.id, { pattern: pattern.value, note: note.value }));
      remove.addEventListener('click', () => deleteRule(rule.id));

      list.append(node);
    });
  }

  async function updateRule(id, patch) {
    try {
      await root.BLOCK.storage.updateRule(id, patch);
      message.textContent = 'Rule updated.';
      await notifyDnrSync();
      await renderRules();
    } catch (error) {
      message.textContent = error.message;
    }
  }

  async function deleteRule(id) {
    await root.BLOCK.storage.deleteRule(id);
    message.textContent = 'Rule deleted.';
    await notifyDnrSync();
    await renderRules();
  }

  async function notifyDnrSync() {
    try {
      await chrome.runtime.sendMessage({ type: 'BLOCK_SYNC_DNR' });
    } catch (error) {
      // Storage changes also trigger background sync; this is only a best-effort immediate nudge.
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
