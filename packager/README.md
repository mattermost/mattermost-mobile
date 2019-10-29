### Steps to update the moduleNames.js and modulePaths.js

1. Uncomment the code snippet in index.js
2. Run the app on an Android device/simulator in development mode
3. Open the App, enable the JavaScript debugger from the debug menu, and open the debugger
4. Copy the console output starting with `module.exports =` into `packager/moduleNames.js`
4. Run `node packager/generateModulePaths.js`
5. Run `./node_modules/.bin/eslint --fix packager/module*`
6. Open modulePaths.js
7. Remove entries for files that don't need to exist on app load:
	- announcement_banner
	- options_context
	- remove_markdown
	- retry_bar_indicator
	- search_bar
	- sidebars
	- swiper
	- team_icon
	- react-deep-force-update
	- react-devtools-core
	- react-native-video
	- react-native/Libraries/Core/Devtools
	- react-native/Libraries/Utilities/deepFreezeAndThrowOnMutationInDev
	- react-native/Libraries/YellowBox
	- redux-devtools-instrument
	- remove-redux-devtools
	- remotedev-utils
	- socketcluster-client
	- stacktrace-parser
	- react-navigation
8. Change development versions of certain files to production ones:
	- configureStore.dev.js -> configureStore.prod.js
	- react/cjs/react.development.js -> react/cjs/react.production.min.js
	- schedule/cjs/scheduler-tracing.development.js -> schedule/cjs/scheduler-tracing.production.min.js
