(function initBlockContent(root) {
  'use strict';

  const BLOCKED_ATTRIBUTE = 'data-block-hidden';
  const SCANNED_ATTRIBUTE = 'data-block-scanned';
  const MAX_TEXT_NODE_LENGTH = 2000;
  const MAX_CONTAINER_TEXT_LENGTH = 6000;
  const SCAN_DEBOUNCE_MS = 150;

  let rules = [];
  let settings = { devMode: false };
  let observer;
  let scheduledScan;

  bootstrap();

  async function bootstrap() {
    try {
      [rules, settings] = await Promise.all([
        root.BLOCK.storage.getRules(),
        root.BLOCK.storage.getSettings()
      ]);
      applyDomainPageRule();
      scanDocument();
      observeMutations();
      listenForRuleUpdates();
    } catch (error) {
      console.error('BLOCK content script failed to start', error);
    }
  }

  function listenForRuleUpdates() {
    chrome.runtime.onMessage.addListener((message) => {
      if (!message || !['BLOCK_RULES_CHANGED', 'BLOCK_RULE_ADDED'].includes(message.type)) {
        return;
      }
      refreshRulesAndScan();
    });
  }

  async function refreshRulesAndScan() {
    rules = await root.BLOCK.storage.getRules();
    scanDocument();
  }

  function applyDomainPageRule() {
    const domainMatches = root.BLOCK.rules.getDomainRulesForHostname(rules, root.location.hostname);
    if (!domainMatches.length || isProtectedElement(document.documentElement)) {
      return;
    }

    logBlock('Domain rule matched this page. Hiding document body content.', domainMatches[0]);
    if (document.body) {
      hideElement(document.body, domainMatches[0], 'domain');
    }
  }

  function observeMutations() {
    observer = new MutationObserver((mutations) => {
      const addedNodes = mutations.flatMap((mutation) => Array.from(mutation.addedNodes || []));
      scheduleScan(addedNodes);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function scheduleScan(nodes) {
    clearTimeout(scheduledScan);
    scheduledScan = setTimeout(() => {
      if (!nodes || !nodes.length) {
        scanDocument();
        return;
      }
      nodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanElement(node);
        } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          scanElement(node.parentElement);
        }
      });
    }, SCAN_DEBOUNCE_MS);
  }

  function scanDocument() {
    scanElement(document.body || document.documentElement);
  }

  function scanElement(rootElement) {
    if (!rootElement || isProtectedElement(rootElement)) {
      return;
    }

    applySelectorRules(rootElement);
    scanTextNodes(rootElement);
  }

  function applySelectorRules(rootElement) {
    root.BLOCK.rules.getEnabledRules(rules)
      .filter((rule) => rule.type === root.BLOCK.rules.RULE_TYPES.SELECTOR)
      .forEach((rule) => {
        let matches = [];
        try {
          if (rootElement.matches && rootElement.matches(rule.pattern)) {
            matches.push(rootElement);
          }
          matches = matches.concat(Array.from(rootElement.querySelectorAll(rule.pattern)));
        } catch (error) {
          logBlock('Skipping invalid selector rule', rule);
          return;
        }

        matches.forEach((element) => {
          if (!isProtectedElement(element)) {
            hideElement(element, rule, 'selector');
          }
        });
      });
  }

  function scanTextNodes(rootElement) {
    const walker = document.createTreeWalker(
      rootElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || node.nodeValue.length > MAX_TEXT_NODE_LENGTH || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          const parent = node.parentElement;
          if (!parent || shouldSkipElement(parent)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const matches = root.BLOCK.rules.findTextMatches(node.nodeValue, rules);
      if (!matches.length) {
        return;
      }

      const container = findReasonableContainer(node.parentElement);
      if (container) {
        hideElement(container, matches[0], 'text');
      }
    });
  }

  function findReasonableContainer(element) {
    let current = element;
    let fallback = null;

    while (current && !isProtectedElement(current)) {
      if (shouldSkipElement(current)) {
        return fallback;
      }

      const textLength = (current.innerText || current.textContent || '').trim().length;
      const tag = current.tagName.toLowerCase();
      const isSemanticContainer = ['article', 'aside', 'li', 'section', 'figure', 'blockquote', 'tr'].includes(tag);
      const isCommonCard = current.matches('[role="article"], [role="listitem"], .card, .item, .post, .comment, .ad, [class*="card"], [class*="item"]');

      if (textLength > 0 && textLength <= MAX_CONTAINER_TEXT_LENGTH) {
        fallback = current;
      }

      if ((isSemanticContainer || isCommonCard) && textLength <= MAX_CONTAINER_TEXT_LENGTH) {
        return current;
      }

      current = current.parentElement;
    }

    return fallback && !isProtectedElement(fallback) ? fallback : null;
  }

  function hideElement(element, rule, reason) {
    if (!element || isProtectedElement(element) || element.hasAttribute(BLOCKED_ATTRIBUTE)) {
      return;
    }

    element.setAttribute(BLOCKED_ATTRIBUTE, reason);
    element.setAttribute('data-block-rule-id', rule.id);
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('display', 'none', 'important');
    logBlock(`Hidden element by ${reason} rule`, rule, element);
  }

  function shouldSkipElement(element) {
    if (!element || element.hasAttribute(BLOCKED_ATTRIBUTE)) {
      return true;
    }

    const tag = element.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'template', 'textarea', 'input', 'select', 'option', 'code', 'pre'].includes(tag)) {
      return true;
    }

    if (element.closest(`[${BLOCKED_ATTRIBUTE}], [${SCANNED_ATTRIBUTE}="skip"]`)) {
      return true;
    }

    const style = root.getComputedStyle ? root.getComputedStyle(element) : null;
    return Boolean(style && (style.visibility === 'hidden' || style.display === 'none'));
  }

  function isProtectedElement(element) {
    if (!element || !element.tagName) {
      return false;
    }
    return ['html', 'head'].includes(element.tagName.toLowerCase());
  }

  function logBlock(message, rule, element) {
    if (settings.devMode || root.localStorage.getItem('BLOCK_DEBUG') === 'true') {
      console.debug('[BLOCK]', message, { rule, element });
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
