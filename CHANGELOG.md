# Mattermost Mobile Apps Changelog

## v1.0.1 Release 

- Release Date: July 20, 2017 
- Server Versions Supported: Server v3.8+ is required, Self-Signed SSL Certificates are not yet supported

#### Bug Fixes
- Huawei devices can now load messages
- GitLab SSO now works if there is a trailing `/` in the server URL
- Unsupported server versions now show a prompt clarifying that a server upgrade is necessary

## v1.0 Release 

- Release Date: July 10, 2017 
- Server Versions Supported: Server v3.8+ is required, Self-Signed SSL Certificates are not yet supported

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
