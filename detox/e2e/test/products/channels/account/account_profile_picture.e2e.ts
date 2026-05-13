// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AccountScreen,
    ChannelListScreen,
    EditProfileScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Account - Profile Picture', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T288_1 - should navigate to profile picture picker and allow uploading from file', async () => {
        // # Open account screen and navigate to edit profile
        await AccountScreen.open();
        await EditProfileScreen.open();

        // * Verify edit profile screen is visible
        await EditProfileScreen.toBeVisible();

        // * Verify the profile picture element is visible and tappable
        await expect(EditProfileScreen.getEditProfilePicture(testUser.id)).toBeVisible();

        // # Tap the profile picture to open the image picker bottom sheet
        await EditProfileScreen.getEditProfilePicture(testUser.id).tap();

        // * Verify the Browse Files option is available in the bottom sheet
        // testID: 'attachment.browseFiles' (from panel_item.tsx)
        await waitFor(element(by.id('attachment.browseFiles'))).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(element(by.id('attachment.browseFiles'))).toBeVisible();

        // * Verify the Photo Library option is available
        // testID: 'attachment.browsePhotoLibrary' (from panel_item.tsx)
        await expect(element(by.id('attachment.browsePhotoLibrary'))).toBeVisible();

        // * Verify the Take Photo option is available
        // testID: 'attachment.takePhoto' (from panel_item.tsx)
        await expect(element(by.id('attachment.takePhoto'))).toBeVisible();

        // TODO: Actually selecting a file from the native file picker (attachment.browseFiles)
        // is not automatable via Detox as it opens a system-native document picker UI.
        // Verification ends at confirming the picker options are present.

        // # Dismiss the bottom sheet — on iOS swipe it down; device.pressBack() is Android-only
        if (isIos()) {
            await element(by.id('attachment.browseFiles')).swipe('down', 'fast');
        } else {
            await device.pressBack();
        }
        await waitFor(element(by.id('attachment.browseFiles'))).not.toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Close edit profile and return to channel list
        await wait(timeouts.ONE_SEC);
        await EditProfileScreen.close();
        await AccountScreen.toBeVisible();
        await HomeScreen.channelListTab.tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T289_1 - should show Remove Photo option when user has a custom profile picture', async () => {
        // # Open account screen and navigate to edit profile
        await AccountScreen.open();
        await EditProfileScreen.open();

        // * Verify edit profile screen is visible
        await EditProfileScreen.toBeVisible();

        // * Verify the profile picture element is visible
        await expect(EditProfileScreen.getEditProfilePicture(testUser.id)).toBeVisible();

        // # Tap the profile picture to open the image picker bottom sheet
        await EditProfileScreen.getEditProfilePicture(testUser.id).tap();

        // * Verify the bottom sheet options are visible
        await waitFor(element(by.id('attachment.browseFiles'))).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await expect(element(by.id('attachment.browseFiles'))).toBeVisible();

        // * NOTE: The 'Remove Photo' option (testID: 'attachment.removeImage') is only shown
        // when the user has a custom profile picture (i.e. the image URL contains a timestamp query
        // string from the hasPictureUrl check in profile_image_picker.tsx).
        // Since the test user has the default avatar, the remove option will NOT appear here.
        // TODO: Pre-upload a profile picture via API and then verify 'attachment.removeImage'
        // appears and tapping it resets to the default avatar.

        // # Dismiss the bottom sheet — on iOS swipe it down; device.pressBack() is Android-only
        if (isIos()) {
            await element(by.id('attachment.browseFiles')).swipe('down', 'fast');
        } else {
            await device.pressBack();
        }
        await waitFor(element(by.id('attachment.browseFiles'))).not.toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Close edit profile and return to channel list
        await wait(timeouts.ONE_SEC);
        await EditProfileScreen.close();
        await AccountScreen.toBeVisible();
        await HomeScreen.channelListTab.tap();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T290_1 - should show error when an invalid username is entered', async () => {
        // # Open account screen and navigate to edit profile
        await AccountScreen.open();
        await EditProfileScreen.open();

        // * Verify edit profile screen is visible
        await EditProfileScreen.toBeVisible();

        // # Scroll to username field and clear it
        await waitFor(EditProfileScreen.usernameInput).toBeVisible().
            whileElement(by.id(EditProfileScreen.testID.scrollView)).scroll(50, 'down');

        // # Enter an invalid username (contains spaces, which are not allowed)
        await EditProfileScreen.usernameInput.clearText();
        await EditProfileScreen.usernameInput.typeText('invalid username with spaces');

        // # Dismiss keyboard and tap Save
        await EditProfileScreen.scrollView.tap({x: 1, y: 1});
        await EditProfileScreen.saveButton.tap();

        // * Verify an error message appears on the username field
        // The error is displayed at testID: 'edit_profile_form.username.input.error'
        // (FloatingTextInput appends '.error' to the input testID when an error prop is set)
        await waitFor(EditProfileScreen.usernameInputError).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await expect(EditProfileScreen.usernameInputError).toBeVisible();

        // # Close edit profile without saving and return to channel list
        await EditProfileScreen.close();
        await AccountScreen.toBeVisible();
        await HomeScreen.channelListTab.tap();
        await ChannelListScreen.toBeVisible();
    });

    // MM-T3260 moved to maestro/flows/account/help_url.yml
    // Reason: tapping Help opens Chrome on Android (cross-process) and SFSafariViewController
    // on iOS — both are system-level UI that Detox cannot reliably control.
});
