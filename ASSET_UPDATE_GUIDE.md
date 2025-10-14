# Asset Update Guide for Mattermost Mobile

## Overview
This guide explains how to update app icons and splash screens in the Mattermost Mobile project. Follow these steps in exact order whenever you change assets in the `assets/base/` folder.

## Prerequisites
- Make sure you have updated your custom icons and splash screens in `assets/base/release/` folder
- Keep the same file names as the original assets
- Ensure all required image sizes are provided

## Step-by-Step Process

### Step 1: Generate Assets
Run the asset generation script to create the distribution folder:
```bash
node scripts/generate-assets.js
```

### Step 2: Copy Assets to Android
Copy the generated assets to Android native folders:
```bash
# Copy Android app icons
cp -r dist/assets/release/icons/android/* android/app/src/main/res/

# Copy Android splash screens  
cp -r dist/assets/release/splash_screen/android/* android/app/src/main/res/
```

### Step 3: Copy Assets to iOS
Copy the generated assets to iOS native folders:
```bash
# Copy iOS app icons
cp dist/assets/release/icons/ios/* ios/Mattermost/Images.xcassets/AppIcon.appiconset/

# Copy iOS splash backgrounds
cp dist/assets/release/splash_screen/ios/SplashBackground.imageset/* ios/Mattermost/Images.xcassets/SplashBackground.imageset/

# Copy iOS splash icons
cp dist/assets/release/splash_screen/ios/SplashIcon.imageset/* ios/Mattermost/Images.xcassets/SplashIcon.imageset/
```

### Step 4: Clean Project
Clean the project to remove any cached files:
```bash
npm run clean
```

### Step 5: Install Dependencies
Install or update project dependencies:
```bash
npm install
```

### Step 6: Start Metro Bundler
Start the React Native Metro bundler:
```bash
npm start
```

### Step 7: Run the App
Build and run the app on your target platform:
```bash
# For iOS
npm run ios

# For Android  
npm run android
```

## Important Notes

- **Always follow this exact order** - skipping steps may result in assets not updating properly
- **Keep original file names** - changing file names will break the asset references
- **Provide all required sizes** - missing image sizes may cause build failures
- **Test on both platforms** - iOS and Android handle assets differently

## Troubleshooting

### Assets not updating?
1. Make sure you copied to the correct native folders
2. Clean the project completely: `npm run clean`
3. For Android: `cd android && ./gradlew clean && cd ..`
4. For iOS: `cd ios && xcodebuild clean -workspace Mattermost.xcworkspace -scheme Mattermost && cd ..`
5. Rebuild the app

### Build errors?
1. Check that all required image sizes are present
2. Verify file names match exactly
3. Ensure images are in correct format (PNG for most assets)

## Asset Locations

### Source Assets (Your Custom Assets)
- App Icons: `assets/base/release/icons/`
- Splash Screens: `assets/base/release/splash_screen/`

### Android Native Locations
- App Icons: `android/app/src/main/res/mipmap-*/`
- Splash Screens: `android/app/src/main/res/drawable-*/`

### iOS Native Locations  
- App Icons: `ios/Mattermost/Images.xcassets/AppIcon.appiconset/`
- Splash Backgrounds: `ios/Mattermost/Images.xcassets/SplashBackground.imageset/`
- Splash Icons: `ios/Mattermost/Images.xcassets/SplashIcon.imageset/`

---

**Remember:** This process must be repeated every time you update assets in the `assets/base/` folder.