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

## Device acceptance

The authentication-header increment was reported working on the user's Android device. Broader light/dark, narrow-phone, tablet, validation-error, SSO, and keyboard layout coverage remains good practice for subsequent UI increments.

The channel-list controls increment still requires device review. Confirm that both controls remain visible and easy to use with and without the unread filter, and verify the actual filter results and Find channels navigation. Component tests and the CI release build do not establish that visual acceptance.
