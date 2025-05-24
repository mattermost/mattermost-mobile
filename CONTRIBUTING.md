# Code Contribution Guidelines

Thank you for your interest in contributing! Please see the [Mattermost Contribution Guide](https://developers.mattermost.com/contribute/getting-started/) which describes the process for making code contributions across Mattermost projects and [join our "Native Mobile Apps" community channel](https://pre-release.mattermost.com/core/channels/native-mobile-apps) to ask questions from community members and the Mattermost core team.

When you submit a pull request, it goes through a [code review process outlined here](https://developers.mattermost.com/contribute/getting-started/code-review/).

## Building and Testing PR Builds

### Building Apps for Testing

To build the mobile app from your PR for testing:

1. Add one of the following labels to your pull request:
   - `Build Apps for PR` - Builds both iOS and Android apps
   - `Build App for iOS` - Builds only the iOS app
   - `Build App for Android` - Builds only the Android app

2. Wait for the GitHub Actions workflow to complete (typically 10-15 minutes)

3. Once complete, a comment will be added to your PR with download links for the built app(s)

4. Install the app on your device for testing:
   - For Android: Download and install the APK directly
   - For iOS: Use the provided link with the iOS TestFlight app

Note: PR builds from forked repositories are signed with debug credentials and cannot be submitted to app stores. These builds are intended for testing purposes only.

### Testing Guidelines

When testing your changes:

1. Verify that your changes work as expected on both iOS and Android platforms
2. Test on different device sizes if your changes affect the UI
3. Include screenshots or videos in your PR description when making UI changes
4. Document any testing steps you've taken in your PR description
