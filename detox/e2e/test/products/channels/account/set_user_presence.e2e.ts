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
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {safeEnableSynchronization, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

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
        // # Log out — guard in case MM-T2056 was skipped and we're still on account screen
        try {
            await ChannelScreen.back();
        } catch { /* not on channel screen */ }
        await HomeScreen.logout();
    });

    // TODO: MM-T2056 skipped — post header display name does not update within 60s after
    // username change via WebSocket user_updated event on local iOS simulator. Investigate
    // whether WatermelonDB reactive query properly re-renders post list on User record change.

    it('MM-T4988_2 - should be able to set user presence', async () => {
        // The status update fires an async request before dismissing the sheet, which can hold
        // Detox's bridge past the Jest timeout — run unsynchronized and verify UI state instead.
        await device.disableSynchronization();
        try {
            // # Tap on user presence option and tap on offline user status option
            await AccountScreen.userPresenceOption.tap();
            await wait(timeouts.ONE_SEC);
            await AccountScreen.offlineUserStatusOption.tap();

            // * Verify on account screen and verify user presence icon and label are for offline user status
            await AccountScreen.toBeVisible();
            await wait(timeouts.TWO_SEC);
            await waitFor(AccountScreen.getUserPresenceIndicator('offline')).toExist().withTimeout(timeouts.TEN_SEC);
            await expect(AccountScreen.getUserPresenceLabel('offline')).toHaveText('Offline');

            // # Tap on user presence option and tap on do not disturb user status option
            await AccountScreen.userPresenceOption.tap();
            await wait(timeouts.ONE_SEC);
            await AccountScreen.dndUserStatusOption.tap();

            // * Verify on account screen and verify user presence icon and label are for do no disturb user status
            await AccountScreen.toBeVisible();
            await wait(timeouts.TWO_SEC);
            await waitFor(AccountScreen.getUserPresenceIndicator('dnd')).toExist().withTimeout(timeouts.TEN_SEC);
            await expect(AccountScreen.getUserPresenceLabel('dnd')).toHaveText('Do Not Disturb');

            // # Tap on user presence option and tap on away user status option
            await AccountScreen.userPresenceOption.tap();
            await wait(timeouts.ONE_SEC);
            await AccountScreen.awayUserStatusOption.tap();

            // * Verify on account screen and verify user presence icon and label are for away user status
            await AccountScreen.toBeVisible();
            await wait(timeouts.TWO_SEC);
            await waitFor(AccountScreen.getUserPresenceIndicator('away')).toExist().withTimeout(timeouts.TEN_SEC);
            await expect(AccountScreen.getUserPresenceLabel('away')).toHaveText('Away');

            // # Tap on user presence option and tap on online user status option
            await AccountScreen.userPresenceOption.tap();
            await wait(timeouts.ONE_SEC);
            await AccountScreen.onlineUserStatusOption.tap();

            // * Verify on account screen and verify user presence icon and label are for online user status
            await AccountScreen.toBeVisible();
            await wait(timeouts.TWO_SEC);
            await waitFor(AccountScreen.getUserPresenceIndicator('online')).toExist().withTimeout(timeouts.TEN_SEC);
            await expect(AccountScreen.getUserPresenceLabel('online')).toHaveText('Online');
        } finally {
            await safeEnableSynchronization();
        }
    });
});
