Mattermost Mobile - White Label Assets (generated)

Structure mirrors `assets/override/release/*` per Mattermost docs.
Copy this entire `release` folder into your project at `assets/override/` to override defaults.

Icons
-----
Android:
- icons/android/mipmap-*/ic_launcher.png — mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi
- icons/android/playstore/ic_playstore_512.png — Play Store upload helper

iOS:
- icons/ios/Icon-App-*.png — complete iOS AppIcon set including 1024px

Splash
------
Android:
- splash_screen/android/drawable-*/background.png — portrait splash backgrounds
  (mdpi: 320x480, hdpi: 480x800, xhdpi: 720x1280, xxhdpi: 960x1600, xxxhdpi: 1280x1920)

iOS:
- splash_screen/ios/Default-*.png — common portrait launch images sized for iPhone/iPad families

Notes
-----
- Source icon: ios_1024.png (resized with high-quality filtering).
- Source splash background: splash.svg (vector-rasterized per size).

If your project expects different file names, replace with these images keeping the target names from
`assets/base/release` in the Mattermost repo.
