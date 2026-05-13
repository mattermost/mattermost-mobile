// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {AccountScreen, ChannelListScreen, HomeScreen, LoginScreen, ServerScreen, SettingsScreen} from '@support/ui/screen';
import {isIpad, timeouts} from '@support/utils';
import {expect} from 'detox';

describe('iPad - Account View', () => {
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
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-TIPAD_10 - should open the account screen by tapping the account tab on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Tap the account tab
        await AccountScreen.open();

        // * Verify the account screen is visible
        await expect(AccountScreen.accountScreen).toBeVisible();

        // # Return to channel list
        await ChannelListScreen.open();
    });

    it('MM-TIPAD_11 - should show the user profile options on the account screen on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the account screen
        await AccountScreen.open();

        // * Verify account screen options are visible
        await expect(AccountScreen.yourProfileOption).toBeVisible();
        await expect(AccountScreen.settingsOption).toBeVisible();

        // # Return to channel list
        await ChannelListScreen.open();
    });

    it('MM-TIPAD_12 - should show the user presence option on the account screen on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the account screen
        await AccountScreen.open();

        // * Verify the user presence option is visible
        await expect(AccountScreen.userPresenceOption).toBeVisible();

        // # Return to channel list
        await ChannelListScreen.open();
    });

    it('MM-TIPAD_13 - should open settings from the account screen on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the account screen and tap the settings option
        await AccountScreen.open();
        await SettingsScreen.open();

        // * Verify the settings screen is visible
        await expect(SettingsScreen.settingsScreen).toBeVisible();

        // # Close settings and return to channel list
        await SettingsScreen.close();
        await ChannelListScreen.open();
    });

    it('MM-TIPAD_14 - should display user info with correct username on account screen on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the account screen
        await AccountScreen.open();

        // * Verify the user info is visible with the correct user
        const {userInfoUsername} = AccountScreen.getUserInfo(testUser.id);
        await waitFor(userInfoUsername).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(userInfoUsername).toBeVisible();

        // # Return to channel list
        await ChannelListScreen.open();
    });
});
