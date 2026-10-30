# ENCMA midnight visual refresh

## Baseline

At the user's request, the application was restored to `9d460901ca4213c850089d942f2d3900efa5fc44`, the pre-notification CA-import build. This restoration is a new commit on the existing branch, not a reset of published history. Later Direct notification and Phase 6 native-call additions are not part of this candidate. The original build artifact remains available separately.

## Visual direction

The supplied reference is interpreted as midnight navy surfaces, cyan/teal accents, violet mentions, rounded cards, a subtle hexagonal authentication backdrop, and blue-to-teal primary actions. Existing controls, labels, translations, accessibility semantics, and navigation remain in place. No new dependencies or remote images are required.

- ENCMA's default palette is used independently of system light/dark appearance. Explicit user/server themes still override it.
- Authentication backgrounds use static vectors, with no startup animation or expensive native blur.
- Primary actions have a decorative non-interactive gradient. Disabled, secondary, inverted and destructive actions retain their semantic styles.
- Inputs, server rows, VPN status cards, and account groups receive rounded surfaces. Account information is centered in a navy header.
- The reference is a style direction, not a pixel-exact replacement of the app's layouts. Existing account options remain in their original order; no new team rail or actions are invented.

## Verification

Source validation and automated tests do not establish device acceptance. This candidate must first pass Android CI and then be checked on the POCO X7 / Android 16, especially VPN-to-server navigation, login, keyboard visibility, large text, TalkBack, server switching, and destructive/disabled controls. No claim is made that changing visuals fixes the previously reported startup issue.

WireGuard configuration, certificate validation, session logic, and notification behavior are those of the selected baseline; the visual patch does not alter them.
