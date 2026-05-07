(function initBlockRules(root) {
  'use strict';

  const RULE_TYPES = Object.freeze({
    KEYWORD: 'keyword',
    SELECTOR: 'selector',
    DOMAIN: 'domain',
    REGEX: 'regex'
  });

  const DEFAULT_RULE_ENABLED = true;

  function createRule(input) {
    const now = new Date().toISOString();
    return normalizeRule({
      id: input.id || generateRuleId(),
      type: input.type || RULE_TYPES.KEYWORD,
      pattern: input.pattern || '',
      enabled: input.enabled !== undefined ? Boolean(input.enabled) : DEFAULT_RULE_ENABLED,
      createdAt: input.createdAt || now,
      note: input.note || ''
    });
  }

  function normalizeRule(rule) {
    return {
      id: String(rule.id || generateRuleId()),
      type: Object.values(RULE_TYPES).includes(rule.type) ? rule.type : RULE_TYPES.KEYWORD,
      pattern: String(rule.pattern || '').trim(),
      enabled: Boolean(rule.enabled),
      createdAt: rule.createdAt || new Date().toISOString(),
      note: String(rule.note || '').trim()
    };
  }

  function isValidRule(rule) {
    if (!rule || !Object.values(RULE_TYPES).includes(rule.type) || !String(rule.pattern || '').trim()) {
      return false;
    }

    if (rule.type === RULE_TYPES.SELECTOR) {
      return isValidSelector(rule.pattern);
    }

    if (rule.type === RULE_TYPES.DOMAIN) {
      return normalizeDomain(rule.pattern).length > 0;
    }

    if (rule.type === RULE_TYPES.REGEX) {
      return isSafeRegex(rule.pattern);
    }

    return true;
  }

  function getEnabledRules(rules) {
    return (rules || []).map(normalizeRule).filter((rule) => rule.enabled && isValidRule(rule));
  }

  function findTextMatches(text, rules) {
    const normalizedText = String(text || '').toLowerCase();
    if (!normalizedText.trim()) {
      return [];
    }

    return getEnabledRules(rules).filter((rule) => {
      if (rule.type === RULE_TYPES.KEYWORD) {
        return normalizedText.includes(rule.pattern.toLowerCase());
      }

      if (rule.type === RULE_TYPES.REGEX) {
        const regex = compileRegex(rule.pattern);
        return regex ? regex.test(text) : false;
      }

      return false;
    });
  }

  function normalizeDomain(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
      return '';
    }

    try {
      const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
      return cleanDomain(url.hostname);
    } catch (error) {
      return cleanDomain(raw.split('/')[0]);
    }
  }

  function domainMatchesHostname(pattern, hostname) {
    const domain = normalizeDomain(pattern);
    const host = cleanDomain(hostname);
    return Boolean(domain && host && (host === domain || host.endsWith(`.${domain}`)));
  }

  function getDomainRulesForHostname(rules, hostname) {
    return getEnabledRules(rules).filter((rule) => rule.type === RULE_TYPES.DOMAIN && domainMatchesHostname(rule.pattern, hostname));
  }

  function isValidSelector(selector) {
    if (!selector || typeof document === 'undefined') {
      return Boolean(String(selector || '').trim());
    }

    try {
      document.createDocumentFragment().querySelector(selector);
      return true;
    } catch (error) {
      return false;
    }
  }

  function isSafeRegex(pattern) {
    if (!pattern || pattern.length > 120) {
      return false;
    }

    // Keep the MVP conservative by rejecting nested quantifiers that commonly cause catastrophic backtracking.
    if (/[+*?}][+*?{]/.test(pattern) || /\([^)]*[+*][^)]*\)[+*{]/.test(pattern)) {
      return false;
    }

    return Boolean(compileRegex(pattern));
  }

  function compileRegex(pattern) {
    try {
      return new RegExp(pattern, 'i');
    } catch (error) {
      return null;
    }
  }

  function cleanDomain(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^\*\./, '')
      .replace(/^www\./, '')
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/^\.+|\.+$/g, '');
  }

  function generateRuleId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') {
      return root.crypto.randomUUID();
    }
    return `rule_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  const api = {
    RULE_TYPES,
    createRule,
    normalizeRule,
    isValidRule,
    getEnabledRules,
    findTextMatches,
    normalizeDomain,
    domainMatchesHostname,
    getDomainRulesForHostname,
    isValidSelector,
    isSafeRegex
  };

  root.BLOCK = root.BLOCK || {};
  root.BLOCK.rules = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
