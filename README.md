# Mattermost Mobile (unreleased) 

This is an unreleased project for replacing the Mattermost iOS and Android apps with new mobile apps using React Native and Redux. The project is not yet stable, and the instructions are for internal use currently (i.e. probably out-of-date until we stablize). 

We'll post updates to our [Forums](http://forum.mattermost.org/) and [Twitter](https://twitter.com/mattermosthq) when we're ready to bring in more community contributors. 

[Our early roadmap was discussed on the Mattermost forums in October 2016](http://forum.mattermost.org/t/roadmap-for-next-generation-mobile-apps-in-react-native/2339) and we'll have more updates as the project evolves. Priorities are shifting so please only use the dates in the post as a highly approximate guide. 

Mattermost is an open source Slack-alternative used by thousands of companies around the world in 11 languages. Learn more at https://mattermost.com.

# How to Contribute

### Testing

The apps are currently under development with a beta release planned for March. We cut a new build every Monday, so people can test it our and see what's new.

If you would like to help with testing the apps, you can:

1. [Sign up for our team site](https://pre-release.mattermost.com/signup_user_complete/?id=f1924a8db44ff3bb41c96424cdc20676)
2. Join the [Native Mobile Apps channel](https://pre-release.mattermost.com/core/channels/native-mobile-apps) to see what's new
3. Ask to be added as a beta tester by sending a direct message to `@lindsay` with your email address and device OS (iOS or Android)
4. Install the `Mattermost RN` app
5. Check the [Native Mobile Apps channel](https://pre-release.mattermost.com/core/channels/native-mobile-apps) or search for `#rnchangelog` for an outline of the latest changes (example [here](https://pre-release.mattermost.com/core/pl/tepdema9yirupdzjjamxk6wj3c))
5. File any bugs you find by posting in the [Native Mobile Apps channel](https://pre-release.mattermost.com/core/channels/native-mobile-apps) with:
  - Device information
  - Repro steps
  - Observed behavior (including screenshot / video when possible)
  - Expected behavior

### Contribute Code 

We're not quite ready to accept external contributions yet - when things are ready, issues with a [Help Wanted] title will be posted in the [GitHub Issues section](https://github.com/mattermost/mattermost-mobile/issues).

# Installing Dependencies
Follow the [React Native Getting Started Guide](https://facebook.github.io/react-native/docs/getting-started.html) for detailed instructions on setting up your local machine for development.

# Detailed configuration:

## Mac

- General requirements

    - XCode 8.1
    - Install watchman
        $ brew install watchman

- Clone repository and configure:
    ```bash
    $ git clone git@github.com:mattermost/mattermost-mobile.git
    $ cd mattermost-mobile
    $ npm install
    $ npm install -g react-native-cli
    ```

- Run application
    ```bash
    $ make run
    ```

## Linux:

- General requiriments:

  - JDK 7 or greater
  - Android SDK
  - Virtualbox
  - An Android emulator: Genymotion or Android emulator. If using genymotion ensure that it uses existing adb tools (Settings: "Use custom Android SDK Tools")
  - Install watchman (do this globally):
      ```bash
      $ git clone https://github.com/facebook/watchman.git
      $ cd watchman
      $ git checkout master
      $ ./autogen.sh
      $ ./configure make
      $ sudo make install
      ```
      Configure your kernel to accept a lot of file watches, using a command like:
      ```bash
      $ sudo sysctl -w fs.inotify.max_user_watches=1048576
      ```

- Clone repository and configure:
    ```bash
    $ git clone git@github.com:mattermost/mattermost-mobile.git
    $ cd mattermost-mobile
    $ npm install
    $ npm install -g react-native-cli
    ```

  - Add or edit file `src/config/config.secret.json` and add the url to the Mattermost server that you will use to develop:
    `{
       "DefaultServerUrl": "https://pre-release.mattermost.com"
    }`

    To use a local Mattermost server you will need to configure the "DefaultServerUrl" depending on the emulator you will use:
      * IOs:        "DefaultServerUrl": "http://localhost:8065"
      * Android:    "DefaultServerUrl": "http://10.0.2.2:3000"
      * Genymotion: "DefaultServerUrl": "http://10.0.3.2:8065"

- Run application
  - Start emulator
  - Start react packager: `$ react-native start`
  - Run in emulator: `$ react-native run-android`
