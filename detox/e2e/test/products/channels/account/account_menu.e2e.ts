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
    CustomStatusScreen,
    EditProfileScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Account - Account Menu', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server and go to account screen
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await AccountScreen.open();
    });

    beforeEach(async () => {
        // * Verify on account screen
        await AccountScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4988_1 - should match elements on account screen', async () => {
        // * Verify basic elements on account screen
        const {userInfoProfilePicture, userInfoUserDisplayName, userInfoUsername} = AccountScreen.getUserInfo(testUser.id);
        await expect(userInfoProfilePicture).toBeVisible();
        await expect(userInfoUserDisplayName).toHaveText(`${testUser.first_name} ${testUser.last_name} (${testUser.nickname})`);
        await expect(userInfoUsername).toHaveText(`@${testUser.username}`);
        await expect(AccountScreen.userPresenceOption).toBeVisible();
        await expect(AccountScreen.setStatusOption).toBeVisible();
        await expect(AccountScreen.yourProfileOption).toBeVisible();
        await expect(AccountScreen.settingsOption).toBeVisible();
        await expect(AccountScreen.logoutOption).toBeVisible();
    });

    it('MM-T4988_2 - should be able to set user presence', async () => {
        // # Tap on user presence option and tap on offline user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.offlineUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for offline user status
        await AccountScreen.toBeVisible();
        await expect(AccountScreen.getUserPresenceIndicator('offline')).toBeVisible();
        await expect(AccountScreen.getUserPresenceLabel('offline')).toHaveText('Offline');

        // # Tap on user presence option and tap on do not disturb user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.dndUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for do no disturb user status
        await AccountScreen.toBeVisible();
        await expect(AccountScreen.getUserPresenceIndicator('dnd')).toBeVisible();
        await expect(AccountScreen.getUserPresenceLabel('dnd')).toHaveText('Do Not Disturb');

        // # Tap on user presence option and tap on away user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.awayUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for away user status
        await AccountScreen.toBeVisible();
        await expect(AccountScreen.getUserPresenceIndicator('away')).toBeVisible();
        await expect(AccountScreen.getUserPresenceLabel('away')).toHaveText('Away');

        // # Tap on user presence option and tap on online user status option
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.onlineUserStatusOption.tap();

        // * Verify on account screen and verify user presence icon and label are for online user status
        await AccountScreen.toBeVisible();
        await expect(AccountScreen.getUserPresenceIndicator('online')).toBeVisible();
        await expect(AccountScreen.getUserPresenceLabel('online')).toHaveText('Online');
    });

    it('MM-T4988_3 - should be able to go to custom status screen', async () => {
        // # Tap on set status option
        await AccountScreen.setStatusOption.tap();

        // * Verify on custom status screen
        await CustomStatusScreen.toBeVisible();

        // # Go back to account screen
        await CustomStatusScreen.close();
    });

    it('MM-T4988_4 - should be able to go to edit profile screen', async () => {
        // # Tap on your profile option
        await AccountScreen.yourProfileOption.tap();

        // * Verify on edit profile screen
        await EditProfileScreen.toBeVisible();

        // # Go back to account screen
        await EditProfileScreen.close();
    });

    it('MM-T4988_5 - should be able to go to settings screen', async () => {
        // # Tap on settings option
        await AccountScreen.settingsOption.tap();

        // * Verify on settings screen
        await SettingsScreen.toBeVisible();

        // # Go back to account screen
        await SettingsScreen.close();
    });
});
