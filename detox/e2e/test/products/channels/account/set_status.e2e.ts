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
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Account - Set User Status', () => {
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
        // * Verify on channel list screen, then open account menu
        await ChannelListScreen.toBeVisible();
        await AccountScreen.open();
        await AccountScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3251 - should set user status to Away, DND, and Online', async () => {
        // # Tap user presence and select Away
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.awayUserStatusOption.tap();

        // * Verify Away status is reflected in the account menu
        await AccountScreen.toBeVisible();
        await expect(AccountScreen.getUserPresenceIndicator('away')).toBeVisible();
        await expect(AccountScreen.getUserPresenceLabel('away')).toHaveText('Away');

        // # Tap user presence and select Do Not Disturb
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.dndUserStatusOption.tap();

        // * Verify DND status is reflected in the account menu
        await AccountScreen.toBeVisible();
        await expect(AccountScreen.getUserPresenceIndicator('dnd')).toBeVisible();
        await expect(AccountScreen.getUserPresenceLabel('dnd')).toHaveText('Do Not Disturb');

        // # Tap user presence and select Online
        await AccountScreen.userPresenceOption.tap();
        await wait(timeouts.ONE_SEC);
        await AccountScreen.onlineUserStatusOption.tap();

        // * Verify Online status is reflected in the account menu
        await AccountScreen.toBeVisible();
        await expect(AccountScreen.getUserPresenceIndicator('online')).toBeVisible();
        await expect(AccountScreen.getUserPresenceLabel('online')).toHaveText('Online');
    });
});
