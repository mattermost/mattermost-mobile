# How to Run Detox Tests

## Android

### Install Dependencies

From the root directory, run the following command to install the necessary dependencies:

```sh
npm install
```

### Inject Detox Settings

To inject the Detox settings into your project, navigate to the `detox` directory and run the following command:

```sh
npm run inject-detox-settings
```

### Update `minSdkVersion` for `react-native-image-picker`

On macOS machines, update the `minSdkVersion` of `react-native-image-picker` to 23 by running the following command from the root directory:

```sh
sed -i '' 's/minSdkVersion 21/minSdkVersion 23/' ./node_modules/react-native-image-picker/android/build.gradle
```

### Build detox android app

From the `detox` folder run:

```
npm run e2e:android-build
```