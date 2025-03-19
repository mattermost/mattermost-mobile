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
npm run e2e:android-build
```

### Run Detox Android Tests

To execute the Detox tests on Android, navigate to the `detox` folder and run:

```sh
npm run e2e:android-test
```

## iOS

### Build iOS Simulator

To build the iOS simulator for Detox, navigate to the `detox` folder and run:

```sh
npm run e2e:ios-build
```

### Run iOS Tests

To execute the Detox tests on iOS, navigate to the `detox` folder and run:

```sh
npm run e2e:ios-test
```