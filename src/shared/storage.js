(function initBlockStorage(root) {
  'use strict';

  const STORAGE_KEY = 'block.rules';
  const SETTINGS_KEY = 'block.settings';
  const DEFAULT_SETTINGS = Object.freeze({
    devMode: false
  });

  function getChromeStorageArea() {
    if (!root.chrome || !root.chrome.storage || !root.chrome.storage.local) {
      throw new Error('chrome.storage.local is not available');
    }
    return root.chrome.storage.local;
  }

  async function getRules() {
    const storage = getChromeStorageArea();
    const result = await storage.get({ [STORAGE_KEY]: [] });
    return (result[STORAGE_KEY] || []).map(root.BLOCK.rules.normalizeRule);
  }

  async function saveRules(rules) {
    const storage = getChromeStorageArea();
    const normalized = (rules || []).map(root.BLOCK.rules.normalizeRule);
    await storage.set({ [STORAGE_KEY]: normalized });
    return normalized;
  }

  async function addRule(input) {
    const rules = await getRules();
    const rule = root.BLOCK.rules.createRule(input);
    if (!root.BLOCK.rules.isValidRule(rule)) {
      throw new Error('Invalid BLOCK rule');
    }
    rules.unshift(rule);
    await saveRules(rules);
    return rule;
  }

  async function updateRule(id, patch) {
    const rules = await getRules();
    const index = rules.findIndex((rule) => rule.id === id);
    if (index === -1) {
      throw new Error('Rule not found');
    }

    const updated = root.BLOCK.rules.normalizeRule({ ...rules[index], ...patch, id });
    if (!root.BLOCK.rules.isValidRule(updated)) {
      throw new Error('Invalid BLOCK rule');
    }

    rules[index] = updated;
    await saveRules(rules);
    return updated;
  }

  async function deleteRule(id) {
    const rules = await getRules();
    const filtered = rules.filter((rule) => rule.id !== id);
    await saveRules(filtered);
    return filtered.length !== rules.length;
  }

  async function getSettings() {
    const storage = getChromeStorageArea();
    const result = await storage.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
    return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
  }

  async function saveSettings(settings) {
    const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    const storage = getChromeStorageArea();
    await storage.set({ [SETTINGS_KEY]: merged });
    return merged;
  }

  const api = {
    STORAGE_KEY,
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
    getRules,
    saveRules,
    addRule,
    updateRule,
    deleteRule,
    getSettings,
    saveSettings
  };

  root.BLOCK = root.BLOCK || {};
  root.BLOCK.storage = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
