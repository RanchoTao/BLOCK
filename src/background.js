try {
  importScripts('shared/rules.js', 'shared/storage.js');
} catch (error) {
  console.error('BLOCK failed to load shared modules', error);
}

const CONTEXT_MENU_ID = 'block-add-selected-text';
const DNR_RULE_ID_BASE = 10000;
const DNR_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other'
];

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Add to BLOCK blacklist',
    contexts: ['selection']
  });
  await syncDeclarativeNetRequestRules();
});

chrome.runtime.onStartup.addListener(() => {
  syncDeclarativeNetRequestRules();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText) {
    return;
  }

  const selectedText = info.selectionText.trim();
  if (!selectedText) {
    return;
  }

  const rule = await chrome.storage.local
    .get({ [BLOCK.storage.STORAGE_KEY]: [] })
    .then(async () => BLOCK.storage.addRule({
      type: BLOCK.rules.RULE_TYPES.KEYWORD,
      pattern: selectedText,
      note: 'Added from page selection'
    }));

  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'BLOCK_RULE_ADDED', rule }).catch(() => {
      // The current tab may not have a content script, for example chrome:// pages.
    });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[BLOCK.storage.STORAGE_KEY]) {
    syncDeclarativeNetRequestRules();
    notifyTabsRulesChanged();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'BLOCK_SYNC_DNR') {
    return false;
  }

  syncDeclarativeNetRequestRules()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function notifyTabsRulesChanged() {
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(
    tabs.map((tab) => {
      if (!tab.id) {
        return Promise.resolve();
      }
      return chrome.tabs.sendMessage(tab.id, { type: 'BLOCK_RULES_CHANGED' });
    })
  );
}

async function syncDeclarativeNetRequestRules() {
  const rules = await BLOCK.storage.getRules();
  const domainRules = BLOCK.rules
    .getEnabledRules(rules)
    .filter((rule) => rule.type === BLOCK.rules.RULE_TYPES.DOMAIN)
    .map((rule, index) => toDnrRule(rule, index))
    .filter(Boolean);

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules
    .filter((rule) => rule.id >= DNR_RULE_ID_BASE)
    .map((rule) => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: domainRules
  });
}

function toDnrRule(rule, index) {
  const domain = BLOCK.rules.normalizeDomain(rule.pattern);
  if (!domain) {
    return null;
  }

  return {
    id: DNR_RULE_ID_BASE + index,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: DNR_RESOURCE_TYPES
    }
  };
}
