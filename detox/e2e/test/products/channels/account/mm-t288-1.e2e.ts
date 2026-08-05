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

    // MM-T3260 moved to maestro/flows/account/help_url.yml: Help opens system browser UI
    // (Chrome / SFSafariViewController) that Detox cannot control.

    it('MM-T288_1 - should navigate to profile picture picker and allow uploading from file', async () => {
        // # Open account screen and navigate to edit profile
        await AccountScreen.open();
        await EditProfileScreen.open();

        // * Verify edit profile screen is visible
        await EditProfileScreen.toBeVisible();

        // * Verify the profile picture element is visible and tappable
        await expect(EditProfileScreen.getEditProfilePicture(testUser.id)).toExist();

        // # Tap the profile picture to open the image picker bottom sheet
        await EditProfileScreen.getEditProfilePicturePicker(testUser.id).tap();

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
});
