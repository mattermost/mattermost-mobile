# Mattermost Mobile Apps Changelog

## v1.8.0 Release
- Release Date: April 27, 2018
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Highlights

#### Image performance
- Images are now downloaded and stored locally for better performance

#### Flagged Posts and Recent Mentions
- Access all your flagged posts and recent mentions from the buttons in the sidebar

#### Muted Channels
- Added support for Muted Channels released with Mattermost server v4.9 

### Improvements
- Date separators now appear between each posts in the search view
- Deactivated users are now filtered out of the channel members lists
- Direct Messages user list is now sorted by username first
- Added the option to Direct Message yourself from your user profile screen
- Improved performance on the post list
- Improved matching and display when searching for users in the Direct Message user list

### Bug Fixes
- Fixed an issue where emoji reactions could be added from the search view but did not appear
- Fixed an issue causing the app to crash when trying to share content from a custom keyboard
- Fixed an issue where team names were being sorted based on letter case
- Fixed an issue where username would not be inserted to the post draft when using experimental configuration settings
- Fixed an issue with nested bullet lists being cut off in the user interface
- Fixed an issue where private channels were listed in the public channels section of the channel autocomplete list
- Fixed an issue where a profile images could not be updated from the app

## v1.7.1 Release
- Release Date: April 3, 2018
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Bug Fixes
- Fixed an issue where the iOS share extension sometimes crashed the Mattermost app
- Fixed an issue preventing Markdown tables from rendering with some international characters 

## v1.7.0 Release
- Release Date: March 26, 2018
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Highlights

#### iOS File Sharing
- Share files and images from other applications as attached files in Mattermost

#### Markdown Tables
- Tables created using markdown formatting can now be viewed in the app

#### Permalinks
- Permalinks now open in the app instead of launching a browser window 

### Improvements
- Increased the tappable area of various icons for improved usability
- Announcement banners now display in the app
- Added "+" button to add emoji reactions to a post
- Minor performance improvements for app launch time
- Text files can now be viewed in the app
- Support for email autolinking into the app

### Bugs
- Fixed an issue causing some devices to hang at the splash screen on app launch
- Fixed an issue causing some letters to be hidden in the Android search input box
- Fixed an issue causing some Direct Message channels to show date stamps below the most recent message
- Fixed an issue where users weren't able to join open teams they've never been a member of
- Fixed an issue so double tapping buttons can no longer cause UI issues
- Fixed an issue where changing the channel display name wasn't being updated in the UI appropriately
- Fixed an issue where searhing for public channels sometimes showed no results
- Fixed an issue where the post menu could remain open while scrolling in the post list
- Fixed an issue where the system message to add users to a channel was missing the execution link
- Fixed an issue where bulleted lists cut off text if nested deeper than two levels
- Fixed an issue where logging into an account that is not on any team freezes the app
- Fixed an issue on iOS causing the app to crash when taking a photo then attaching it to a post

## v1.6.1 Release
- Release Date: February 13, 2018
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Bug Fixes
- Fixed an issue preventing the app from going to the correct channel when opened from a push notification
- Fixed an issue on Android devices where the app could sometimes freeze on the launch screen
- Fixed an issue on Samsung devices causing extra letters to be insterted when typing to filter user lists

## v1.6.0 Release
- Release Date: February 6, 2018
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Highlights

#### Android File Sharing
- Share files and images from other applications as attached files in Mattermost 

### Improvements
- Added a right drawer to access settings, edit profile information, change online status and logout
- Added support for opening a Direct Message channel with yourself

### Bugs
- Fixed a number of issues causing crashes on Android devices
- Fixed an issue with auto capitalization on Android keyboards
- Fixed an issue where the GitLab SSO login button sometimes didn't appear
- Fixed an issue with link previews not appearing on some accounts
- Fixed an issue where logging out of the app didn't clear the notification badge on the homescreen icon
- Fixed an issue where interactive message buttons would not wrap to a new line
- Fixed an issue where the keyboard would sometimes overlap the text input box
- Fixed an issue where the Direct Message channel wouldn't open from the profile page
- Fixed an issue where posts would sometimes overlap
- Fixed an issue where the app sometimes hangs on logout

## v1.5.3 Release
- Release Date: February 1, 2018
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported
- Fixed a login issue when connecting to servers running a Data Retention policy 

## v1.5.2 Release
- Release Date: January 12, 2018
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Bug Fixes
- Fixed an issue causing some Android devices to crash on launch
- Fixed an issue with the app occasionally crashing when receiving push notifications in a new channel 
- Channel footer area is now refreshed when switching between Group and Direct Message channels
- Fixed an issue on some Android devices so Mattermost verifies it has permissions to access ringtones
- Fixed an issue where the text box overlapped the keyboard on some iOS devices using multiple keyboard layouts
- Fixed an issue with video uploads on Android devices
- Fixed an issue with GIF uploads on iOS devices
- Fixed an issue with the mention badge flickering on the channel drawer icon when there were over 10 unread mentions
- Fixed an issue with the app occasionally freezing when requesting the RefreshToken

## v1.5.1 Release

- Release Date: December 7, 2017
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Bug Fixes
- Fixed an issue with the upgrade app screen showing with a transparent background
- Fixed an issue with clearing or replying to notifications sometimes crashing the app on Android
- Fixed an issue with the app sometimes crashing due to a missing function in the swiping control

## v1.5 Release 

- Release Date: December 6, 2017
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Highlights 

#### File Viewer
- Preview videos, RTF,  PDFs, Word, Excel, and Powerpoint files 

#### iPhone X Compatibility
- Added support for iPhone X

#### Slash Commands
- Added support for using custom slash commands
- Added support for built-in slash commands /away, /online, /offline, /dnd, /header, /purpose, /kick, /me, /shrug

### Improvements
- In iOS, 3D touch can now be used to peek into a channel to view the contents, and quickly mark it as read
- Markdown images in posts now render 
- Copy posts, URLs, and code blocks
- Opening a channel with Unread messages takes you to the "New Messages" indicator 
- Support for data retention, interactive message buttons, and viewing Do Not Disturb statuses depending on the server version
- (Edited) indicator now shows up beside edited posts 
- Added a "Recently Used" section for emoji reactions

### Bug Fixes 
- Android notifications now follow the default system setting for vibration 
- Fixed app crashing when opening notification settings on Android 
- Fixed an issue where the "Proceed" button on sign in screen stopped working after pressing logout multiple times
- HEIC images posted from iPhones now get converted to JPEG before uploading

## v1.4.1 Release

Release Date: Nov 15, 2017
Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Bug Fixes

- Fixed network detection issue causing some people to be unable to access the app
- Fixed issue with lag when pressing send button 
- Fixed app crash when opening notification settings
- Fixed various other bugs to reduce app crashes

## v1.4 Release 

- Release Date: November 6, 2017
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Highlights 

#### Performance improvements
- Various performance improvements to decrease channel load times 

### Bug Fixes
- Fixed issue with Android app sometimes showing a white screen when re-opening the app
- Fixed an issue with orientation lock not working on Android 

## v1.3 Release 

- Release Date: October 5, 2017
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Highlights 

#### Tablet Support (Beta) 
- Added support for landscape view, so the app may be used on tablets
- Note: Tablet support is in beta, and further improvements are planned for a later date

#### Link Previews 
- Added support for image, GIF, and youtube link previews

#### Notifications
- Android: Added the ability to set light, vibrate, and sound settings
- Android: Improved notification stacking so most recent notification shows first 
- Updated the design for Notification settings to improve usability 
- Added the ability to reply from a push notification without opening the app (requires Android v7.0+, iOS 10+) 
- Increased speed when opening app from a push notification

#### Download Files 
- Added the ability to download all files on Android and images on iOS

### Improvements
- Using `+` shortcut for emoji reactions is now supported 
- Improved emoji formatting (alignment and rendering of non-square aspect ratios)
- Added support for error tracking with Sentry
- Only show the "Connecting..." bar after two connection attempts 

### Bug Fixes
- Fixed link rendering not working in certain cases
- Fixed theme color issue with status bar on Android

## v1.2 Release

- Release Date: September 5, 2017 
- Server Versions Supported: Server v4.0+ is required, Self-Signed SSL Certificates are not supported

### Highlights 

#### AppConfig Support for EMM solutions
- Added [AppConfig](https://www.appconfig.org/) support, to make it easier to integrate with a variety of EMM solutions

#### Code block viewer
- Tap on a code block to open a viewer for easier reading 

### Improvements
- Updated formatting for markdown lists and code blocks
- Updated formatting for `in:` and `from:` search autocomplete 

### Emoji Picker for Emoji Reactions
- Added an emoji picker for selecting a reaction 

### Bug Fixes
- Fixed issue where if only LDAP and GitLab login were enabled, LDAP did not show up on the login page
- Fixed issue with 3 digit mention count UI in channel drawer

### Known Issues
- Using `+:emoji:` to react to a message is not yet supported 

## v1.1 Release

- Release Date: August 2017 
- Server Versions Supported: Server v3.10+ is required, Self-Signed SSL Certificates are not supported

### Highlights 

#### Search
- Search posts and tap to preview the result
- Click "Jump" to open the channel the search result is from 

#### Emoji Reactions
- View Emoji Reactions on a post

#### Group Messages
- Start Direct and Group Messages from the same screen

#### Improved Performance on Poor Connections
- Added auto-retry to automatically reattempt to get posts if the network connection is intermittent
- Added manual loading option if auto-retry fails to retrieve new posts

### Improvements
- Android: Added Big Text support for Android notifications, so they expand to show more details
- Added a Reset Cache option
- Improved "Jump to conversation" filter so it matches on nickname, full name, or username 
- Tapping on an @username mention opens the user's profile
- Disabled the send button while attachments upload
- Adjusted margins on icons and elsewhere to make spacing more consistent
- iOS URL scheme: mattermost:// links now open the new app
- About Mattermost page now includes a link to NOTICES.txt for platform and the mobile app
- Various UI improvements

### Bug Fixes
- Fixed an issue where sometimes an unmounted badge caused app to crash on start up 
- Group Direct Messages now show the correct member count 
- Hamburger icon does not break after swiping to close sidebar
- Fixed an issue with some image thumbnails appearing out of focus
- Uploading a file and then leaving the channel no longer shows the file in a perpetual loading state
- For private channels, the last member can no longer delete the channel if the EE server permissions do not allow it
- Error messages are now shown when SSO login fails
- Android: Leaving a channel now redirects to Town Square instead of the Town Square info page
- Fixed create new public channel screen shown twice when trying to create a channel
- Tapping on a post will no longer close the keyboard

## v1.0.1 Release 

- Release Date: July 20, 2017 
- Server Versions Supported: Server v3.8+ is required, Self-Signed SSL Certificates are not yet supported

### Bug Fixes
- Huawei devices can now load messages
- GitLab SSO now works if there is a trailing `/` in the server URL
- Unsupported server versions now show a prompt clarifying that a server upgrade is necessary

## v1.0 Release 

- Release Date: July 10, 2017 
- Server Versions Supported: Server v3.8+ is required, Self-Signed SSL Certificates are not supported

### Highlights 

#### Authentication (Requires v3.10+ [Mattermost server](https://github.com/mattermost/platform))
- GitLab login 

#### Offline Support
- Added offline support, so already loaded portions of the app are accessible without a connection
- Retry mechanism for posts sent while offline 
- See [FAQ](https://github.com/mattermost/mattermost-mobile#frequently-asked-questions) for information on how data is handled for deactivated users

#### Notifications (Requires v3.10+ [push proxy server](https://github.com/mattermost/mattermost-push-proxy)) 
- Notifications are cleared when read on another device
- Notification sent just before session expires to let people know login is required to continue receiving notifications

#### Channel and Team Sidebar
- Unreads section to easily access channels with new messages
- Search filter to jump to conversations quickly 
- Improved team switching design for better cross-team notifications 
- Added ability to join open teams on the server 

#### Posts
- Emojis now render
- Integration attachments now render 
- ~channel links now render 

#### Navigation
- Updated navigation to have smoother transitions 

### Known Issues
- [Android: Swipe to close in-app notifications does not work](https://mattermost.atlassian.net/browse/RN-45)
- Apps are not yet at feature parity for desktop, so features not mentioned in the changelog are not yet supported

### Contributors

Many thanks to all our contributors. In alphabetical order:
- asaadmahmood, cpanato, csduarte, enahum, hmhealey, jarredwitt, JeffSchering, jasonblais, lfbrock, omar-dev, rthill

## Beta Release

- Release Date: March 29, 2017
- Server Versions Supported: Server v3.7+ is required, Self-Signed SSL Certificates are not yet supported

Note: If you need an SSL certificate, consider using [Let's Encrypt](https://docs.mattermost.com/install/config-ssl-http2-nginx.html) instead of a self-signed one.

### Highlights

The Beta apps are a work in progress, supported features are listed below. You can become a beta tester by [downloading the Android app](https://play.google.com/store/apps/details?id=com.mattermost.react.native&hl=en) or [signing up to test iOS](https://mattermost-fastlane.herokuapp.com/). 

#### Authentication
- Email login
- LDAP/AD login
- Multi-factor authentication 
- Logout

#### Messaging
- View and send posts in the center channel
- Automatically load more posts in the center channel when scrolling
- View and send replies in thread view
- "New messages" line in center channel (app does not yet scroll to the line)
- Date separators 
- @mention autocomplete
- ~channel autocomplete
- "User is typing" message
- Edit and delete posts
- Flag/Unflag posts
- Basic markdown (lists, headers, bold, italics, links)

#### Notifications
- Push notifications
- In-app notifications when you receive a message in another channel while the app is open
- Clicking on a push notification takes you to the channel

#### User profiles
- Status indicators
- View profile information by clicking on someone's username or profile picture

#### Files
- File thumbnails for posts with attachments
- Upload up to 5 images
- Image previewer to view images when clicked on

#### Channels
- Channel drawer for selecting channels
- Bolded channel names for Unreads, and mention jewel for Mentions
- (iOS only) Unread posts above/below indicator
- Favorite channels (Section in sidebar, and ability to favorite/unfavorite from channel menu)
- Create new public or private channels
- Create new Direct Messages (Group Direct Messages are not yet supported) 
- View channel info (name, header, purpose) 
- Join public channels
- Leave channel
- Delete channel
- View people in a channel
- Add/remove people from a channel
- Loading screen when opening channels 

#### Settings
- Account Settings > Notifications page
- About Mattermost info dialog
- Report a problem link that opens an email for bug reports

#### Teams
- Switch between teams using "Team Selection" in the main menu (viewing which teams have notifications is not yet supported) 

### Contributors

Many thanks to all our contributors. In alphabetical order:
- csduarte, dmeza, enahum, hmhealey, it33, jarredwitt, jasonblais, lfbrock, mfpiccolo, saturninoabril, thomchop
