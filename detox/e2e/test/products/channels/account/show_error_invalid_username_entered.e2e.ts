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
});
