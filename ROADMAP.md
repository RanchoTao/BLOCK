# BLOCK Roadmap

BLOCK starts as a local-first Chrome extension MVP. Future work should add capabilities carefully without claiming universal blocking before platform adapters actually exist.

## Stage 1: Browser extension v1

- Improve rule suggestions from page selection, including optional selector suggestions.
- Add import/export for local rule backups.
- Add rule grouping, search, and bulk enable/disable actions.
- Add per-site allowlists and per-site rule scopes.
- Add clearer inline feedback for blocked items without making pages noisy.
- Add more automated tests for content-script heuristics with DOM fixtures.
- Review Manifest V3 dynamic rule limits and expose useful error states in the UI.
- Package releases for Chrome Web Store and compatible Chromium browsers.

## Stage 2: Desktop app prototype

- Explore a desktop companion app for managing rule libraries locally.
- Design platform adapters instead of one monolithic blocker.
- Investigate OS-level window metadata, local hosts-file style domain blocking, and browser profile integrations.
- Keep all sensitive blacklist data local unless the user explicitly enables sync.

## Stage 3: Android accessibility-service prototype

- Prototype an Android Accessibility Service that can detect and hide or navigate away from unwanted UI elements where Android permits it.
- Clearly explain accessibility permissions and risks before users enable the service.
- Avoid collecting app content remotely.
- Add conservative safeguards so rules do not make apps unusable.

## Stage 4: iOS limitations and Screen Time style approach

- Document iOS platform restrictions honestly: third-party apps cannot freely inspect or alter arbitrary app UIs.
- Explore Safari Web Extension support for browser content.
- Explore Screen Time / content-blocker style approaches where Apple APIs permit them.
- Avoid marketing claims that BLOCK can hide arbitrary content across iOS apps.

## Stage 5: Optional cloud sync, off by default

- Keep the default experience fully local.
- If sync is added, make it opt-in, encrypted where possible, and easy to disable.
- Provide transparent export/delete controls.
- Never upload browsing content or rule matches without explicit user consent.
