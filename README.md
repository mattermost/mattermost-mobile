# Mattermost Mobile (un-released) 

This is an unreleased project for replacing the Mattermost iOS and Android apps with new mobile apps using React Native and Redux. The project is not yet stable, and the instructions are for internal use currently (i.e. probably out-of-date until we stablize). 

We'll post updates to our [Forums](http://forum.mattermost.org/) and [Twitter](https://twitter.com/mattermosthq) when we're ready to bring in more community contributors. 

[Our early roadmap was discussed on the Mattermost forums in October 2016](http://forum.mattermost.org/t/roadmap-for-next-generation-mobile-apps-in-react-native/2339) and we'll have more updates as the project evolves. Priorities are shifting so please only use the dates in the post as a highly approximate guide. 

Mattermost is an open source Slack-alternative used by thousands of companies around the world in 11 languages. Learn more at https://mattermost.com.

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
