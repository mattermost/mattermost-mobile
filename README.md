# Mattermost Mobile

This project is the Mattermost mobile client from [https://mattermost.org](https://mattermost.org).

It's written in JavaScript using React Native.

# Installing Dependencies
Follow the [React Native Getting Started Guide](https://facebook.github.io/react-native/docs/getting-started.html) for detailed instructions on setting up your local machine for development.

### Generating Signed APK
To create a release build that can be installed on an Android device you must create a signed apk file.
To do so you'll need to generate a keystore file using the following command:
```
keytool -genkey -v \
  -keystore example-release-key.keystore \
  -alias example-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```
This will prompt you to enter a password and some optional metadata. The resulting file (`example-release-key.keystore`) should be moved to the `mattermost-mobile/android/app` directory.
In your your home directory there should be a directory called `.gradle`. Inside of it there should be a file called `gradle.properties`. Create it if it is not there. In `~/.gradle/gradle.properties` add the following:
```
MATTERMOST_RELEASE_STORE_FILE=example-release-key.keystore
MATTERMOST_RELEASE_KEY_ALIAS=example-key-alias
MATTERMOST_RELEASE_STORE_PASSWORD=example
MATTERMOST_RELEASE_KEY_PASSWORD=example
```
Instead of these example values you should use whatever input you provided in the interactive keytool command. However, these keys shouldn't be changed. They need to match the environment variables (or gradle properties) being expected in the `signingConfigs` section of `android/app/build.gradle`.

Then to generate the apk file run: `cd android && ./gradlew assembleRelease`. That should create a signed apk file located at `android/app/build/outputs/apk/app-release.apk`. After downloading that file onto an Android device, you can install it as a fully packaged app.
