# ENCMA Android artwork

These SVGs are the source artwork for the Android ENCMA identity. The rendered PNGs live in the existing Android resource directories, the matching canonical release directories under `assets/base/release/`, and `assets/base/images/encma-icon.png`.

- Navy: `#101C33`
- Teal: `#2DD4BF`
- Off-white: `#F8FAFC`
- Dark splash background: `#090A0B`

`encma-icon.svg` supplies legacy launcher icons and the in-app icon. `encma-foreground.svg` is transparent and keeps the mark inside the adaptive-icon safe zone. `encma-notification.svg` is monochrome for Android status-bar tinting. The two splash SVGs contain transparent backgrounds so the existing light/dark Android background resources remain effective.

The existing Mattermost artwork outside the Android ENCMA resource paths is intentionally retained for other application IDs and platforms.
