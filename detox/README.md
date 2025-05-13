# How to Run Detox Tests

This guide will help you set up and run Detox tests for your project.

## Install Dependencies

First, navigate to the root directory of your project and install the necessary dependencies by running:

```sh
npm install
```

navigate to the `detox` folder and run `npm install`

## Android

### Build Detox Android App

To build the Detox Android app, navigate to the `detox` folder and run:

```sh
npm run e2e:android-inject-settings

npm run e2e:android-build
```

The debug apk will be built and available at `android/app/build/outputs/apk/debug/app-debug.apk`

### Run Detox Android Tests

#### Create emulator

```sh
./create_android_emulator.sh SDK_VERSION AVD_NAME

# example ./create_android_emulator.sh 34 pixel_5a_avd
# example ./create_android_emulator.sh 34 pixel_5a_avd --headless
# If we want to see the emulator logs. Run it in debug mode example ./create_android_emulator.sh 34 pixel_5a_avd --debug
```

To execute the Detox tests on Android, navigate to the `detox` folder and run:

```sh
npm run e2e:android-test

# To run a particular tests

npm run e2e:android-test <path to test file>
```

## iOS

### Build iOS Simulator

To build the iOS simulator for Detox, navigate to the `detox` folder and run:

```sh
npm run e2e:ios-build
```

This will build the Simulor .zip file at the root folder.

Create a folder named `mobile-artifacts` at the project root. Unzip the zip file and move the mattermost app under `mobile-artifacts.`

```sh
# From project root
mkdir mobile-artifacts
```

### Run iOS Tests

To execute the Detox tests on iOS, navigate to the `detox` folder and run:

```sh
npm run e2e:ios-test

# To run a particular tests

npm run e2e:android-test path to test file.
```

#### TIP : For iOS, you can download the simulator from `~Mobile: Test build` or `~Release: Mobile Apps` channel in the community.

### Results

The Local Runs generate artifacts under `detox/artifacts/ios-debug-**` or `detox/artifacts/android-debug-**`.
You can see the html report, failure screenshot under that folder.
