(function initOptions(root) {
  'use strict';

  const devModeInput = document.getElementById('dev-mode');
  const status = document.getElementById('status');

  loadSettings();
  devModeInput.addEventListener('change', saveSettings);

  async function loadSettings() {
    const settings = await root.BLOCK.storage.getSettings();
    devModeInput.checked = Boolean(settings.devMode);
  }

  async function saveSettings() {
    await root.BLOCK.storage.saveSettings({ devMode: devModeInput.checked });
    status.textContent = 'Settings saved locally.';
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
