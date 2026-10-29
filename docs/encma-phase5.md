# ENCMA Phase 5: UI modernization

Phase 5 preserves the ENCMA Android identity, per-app WireGuard gate, Mattermost session behavior, and all Phase 4 functionality. Work is split into small reviewable UI increments.

## Authentication header increment

The server-connection and login screens now share an ENCMA authentication header containing the existing ENCMA artwork, product name, and the localized tagline **Your team, connected.** The header uses the active Mattermost theme for text and secondary-text contrast.

- The component renders only when the runtime application ID is `com.encma.hxmain`; other application IDs keep their existing authentication layout.
- Existing server URL, display-name, advanced authentication-secret, login, SSO, and navigation behavior is unchanged.
- No new network request, backend contract, permission, or stored credential is introduced.
- This is an authentication UI increment, not a claim that every ENCMA screen has been redesigned.

## Device acceptance still required

Verify the server and login screens on Android hardware in light and dark themes, including a narrow phone and a tablet. Confirm that the header does not obscure inputs, validation errors, SSO options, or keyboard behavior. These layout checks are not established by component tests or the CI release build alone.
