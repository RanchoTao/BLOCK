const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/shared/rules.js');

test('keyword rules match text case-insensitively', () => {
  const blacklist = [rules.createRule({ type: 'keyword', pattern: 'Sponsored' })];
  const matches = rules.findTextMatches('This is a sponsored card', blacklist);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].pattern, 'Sponsored');
});

test('disabled rules do not match text', () => {
  const blacklist = [rules.createRule({ type: 'keyword', pattern: 'ad', enabled: false })];
  assert.equal(rules.findTextMatches('ad', blacklist).length, 0);
});

test('domain normalization and subdomain matching are conservative', () => {
  assert.equal(rules.normalizeDomain('https://www.Example.com/path'), 'example.com');
  assert.equal(rules.domainMatchesHostname('example.com', 'cdn.example.com'), true);
  assert.equal(rules.domainMatchesHostname('example.com', 'badexample.com'), false);
});

test('unsafe regex patterns are rejected', () => {
  assert.equal(rules.isSafeRegex('(a+)+'), false);
  assert.equal(rules.isSafeRegex('sponsored|promoted'), true);
});
