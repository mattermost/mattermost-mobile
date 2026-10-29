# ENCMA Phase 5: UI modernization

Phase 5 preserves the ENCMA Android identity, per-app WireGuard gate, Mattermost session behavior, and all Phase 4 functionality. Work is split into small reviewable UI increments.

## Authentication header increment

The server-connection and login screens now share an ENCMA authentication header containing the existing ENCMA artwork, product name, and the localized tagline **Your team, connected.** The header uses the active Mattermost theme for text and secondary-text contrast.

- The component renders only when the runtime application ID is `com.encma.hxmain`; other application IDs keep their existing authentication layout.
- Existing server URL, display-name, advanced authentication-secret, login, SSO, and navigation behavior is unchanged.
- No new network request, backend contract, permission, or stored credential is introduced.
- This is an authentication UI increment, not a claim that every ENCMA screen has been redesigned.

## Channel-list controls increment

The channel-list **Find channels** and unread-filter controls now use a more rounded surface with a subtle border for the ENCMA application ID. Their existing 40 dp dimensions, spacing, navigation, and filtering behavior are retained. ENCMA screen-reader labels identify the search action and whether the unread filter will be enabled or cleared.

Other application IDs retain the original visual styling; the existing Mattermost search-field snapshot remains part of the focused test selection. This is another contained UI increment, not a whole-app redesign.

## Home navigation and branding increment

For the ENCMA application ID, visible home navigation now contains only **Channels** and **Account**. Search, Recent Mentions, and Saved Messages no longer occupy bottom destinations. The Threads shortcut is hidden from the channel list and from Find channels results, while Channels, conversation categories, Find channels, conversation opening, and thread/reply functionality remain intact. Other application IDs retain their existing destinations and Threads shortcuts.

The ENCMA branding sweep also covers:

- Localized product names in onboarding, invitations, alerts, calls, review/share text, and native security fallbacks. Localized wording is preserved where possible; brand-bearing messages in locales that transliterate the old name use branded English copy instead.
- ENCMA artwork for the system avatar and the built-in product emoji alias. The internal emoji alias remains unchanged for message compatibility.
- ENCMA product fallbacks in Settings, Terms of Service alerts, managed-device prompts, and log-sharing subjects. Administrator-defined custom site names remain unchanged.
- Removal of ENCMA-visible Mattermost community, powered-by, default policy, help, troubleshooting, server-upgrade, review/forum, and report destinations. Custom administrator help and support links still work. Without a custom ENCMA report destination, the existing platform share/logs flow is used instead of an upstream website or mailbox.
- Android managed-configuration labels now use the ENCMA product name.

Copyright and open-source attribution remain visible. Server-provided legal text and user content are not rewritten. Technical Mattermost package names, protocol identifiers, compatibility checks, license files, and internal component names are intentionally preserved.

## Validation

Initial local validation for the navigation/branding increment completed with **21 focused suites, 219 passing tests, 2 pre-existing skipped tests, and 1 passing snapshot**. The exact expanded CI selection then passed locally with **40 suites, 512 passing tests, 2 pre-existing skipped tests, and 2 passing snapshots**. Full ESLint, TypeScript, and diff whitespace checks also passed. These are focused test selections, not a claim that the repository's entire Jest suite is green.

The focused CI selection includes the new ENCMA tests and the affected existing suites, using exact test paths so route files containing parentheses cannot be skipped by regular-expression path matching.

## Device acceptance

The authentication-header increment was reported working on the user's Android device. Broader light/dark, narrow-phone, tablet, validation-error, SSO, and keyboard layout coverage remains good practice for subsequent UI increments.

The channel-list controls increment and the navigation/branding increment still require device review. For the latter, confirm that:

1. Only Channels and Account appear in the bottom bar; channels and conversations still open, and Find channels remains available without a Threads result.
2. Onboarding, invitations, calls/security prompts, and the system avatar show ENCMA rather than the old product branding.
3. About shows the ENCMA name/logo and legal attribution without Mattermost community, powered-by, or default policy links.
4. Mattermost-owned help, troubleshooting, and support fallbacks are absent, while custom administrator destinations still work. Do not send real logs during this check.
5. The old product emoji alias renders ENCMA artwork and the behavior remains correct in the selected app locale.

Component tests and a CI release build do not establish visual or device acceptance.
