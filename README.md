# BLOCK

BLOCK is an open-source, local-first blacklist tool for hiding annoying, unwanted, or hated content with the simplest possible interaction.

The long-term idea is broad: users should eventually be able to block ads, recommendation cards, popups, useless platform features, keywords, phrases, domains, and UI elements across multiple platforms. This repository currently contains the first MVP only: a Chrome Manifest V3 browser extension that affects webpages loaded in Chrome-compatible browsers.

## Current MVP scope

The MVP Chrome extension can:

- Maintain local blacklist rules for keywords / phrases, CSS selectors, domains, and conservative advanced regex patterns.
- Hide matching text content on webpages by hiding a nearby reasonable container instead of only removing the text node.
- Hide DOM elements matching CSS selector rules.
- Block requests to domain rules with Chrome `declarativeNetRequest` dynamic rules.
- Hide the page body when the current page hostname matches an enabled domain rule.
- Add selected webpage text to the blacklist from the right-click context menu.
- View, add, edit, delete, enable, and disable rules in the popup UI.
- Store rules and settings locally with `chrome.storage.local`.
- Re-apply rules on page load and for dynamically added DOM nodes through `MutationObserver`.

BLOCK does **not** collect user data, does **not** send blacklist data to external servers, and does **not** include analytics.

## Repository structure

```text
manifest.json              Chrome Manifest V3 entrypoint
src/background.js          Service worker, context menu, domain request blocking
src/content.js             Webpage scanner and DOM hider
src/shared/rules.js        Rule creation, validation, matching, and domain helpers
src/shared/storage.js      chrome.storage.local wrapper
src/popup/                 Popup UI for rule management
src/options/               Settings and rule-type documentation page
tests/                     Node tests for shared matching helpers
ROADMAP.md                 Future platform roadmap
```

## Install the unpacked extension in Chrome

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder that contains `manifest.json`.
6. Pin the BLOCK extension if you want fast access to the popup.

After editing extension files locally, return to `chrome://extensions` and click the reload button for BLOCK.

## Add blacklist rules

### From selected text

1. Select text on any normal webpage.
2. Right-click the selection.
3. Click **Add to BLOCK blacklist**.
4. BLOCK saves a keyword rule locally and asks the content script to rescan the current tab.

### From the popup

1. Click the BLOCK toolbar icon.
2. Choose a rule type:
   - **Keyword / phrase**: hides a conservative container containing matching text.
   - **CSS selector**: hides elements matching a selector such as `.ad-card` or `[aria-label="Sponsored"]`.
   - **Domain**: blocks network requests to a domain and hides the page body when visiting that hostname.
   - **Regex (advanced)**: matches text nodes with a short, validated regular expression. Risky-looking patterns are rejected.
3. Enter the pattern and an optional note.
4. Click **Add rule**.
5. Use each rule card to edit the pattern/note, enable or disable the rule, or delete it.

### Development logging

Open the extension options page and enable development mode to log hide events to the page console. You can also set `localStorage.BLOCK_DEBUG = 'true'` on a page for quick debugging.

## Known limitations

- This MVP is a browser extension only. It can affect webpages in the browser, not native desktop apps, Android apps, iOS apps, or content outside Chrome-compatible browsers.
- Text hiding is intentionally conservative. It may miss some unwanted content to avoid hiding entire pages or important layout containers.
- CSS selector rules are powerful and can break a page if the selector is too broad.
- Domain blocking uses Chrome Manifest V3 `declarativeNetRequest` dynamic rules and is limited by browser extension APIs.
- The right-click action currently adds selected text as a keyword rule; it does not infer selectors or domains automatically.
- Regex support is basic and intentionally restricted to reduce performance risk.
- Local data does not sync between browsers or devices.

## Run tests

```sh
npm test
```

## Future roadmap

See [ROADMAP.md](ROADMAP.md) for later stages, including Browser Extension v1, desktop prototypes, Android accessibility-service experiments, iOS constraints, and optional cloud sync that remains off by default.
