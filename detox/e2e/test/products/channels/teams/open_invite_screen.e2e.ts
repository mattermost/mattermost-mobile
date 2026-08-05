// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    Invite,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Teams - Invite', () => {

    const serverOneDisplayName = 'Server 1';

    let testTeam: any;
    let testUser: any;
    let testUser1: any;
    let testUser2: any;
    let testUser3: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;
        const {user: user1} = await User.apiCreateUser(siteOneUrl, {prefix: 'i'});
        if (!user1?.id) {
            throw new Error('[beforeAll] Failed to create testUser1');
        }
        testUser1 = user1;
        const {user: user2} = await User.apiCreateUser(siteOneUrl);
        if (!user2?.id) {
            throw new Error('[beforeAll] Failed to create testUser2');
        }
        testUser2 = user2;
        await Team.apiAddUserToTeam(siteOneUrl, testUser2.id, testTeam.id);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // Avoid device.reloadReactNative() — CI 59ec6ae iOS: T5360 passed then
        // reload disconnected Detox and killed T5361–T5365.
        await ChannelListScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        // # Open invite screen
        await Invite.open();
    });

    afterEach(async () => {
        // # Close any leftover Invite modal so next test's beforeEach doesn't compound.
        try {
            await waitFor(Invite.inviteScreen).toBeVisible().withTimeout(timeouts.ONE_SEC);
            await Invite.close();
        } catch { /* not on invite — nothing to clean up */ }
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T5360 - should open the invite screen', async () => {
        // * Verify invite screen Header buttons.
        await waitFor(Invite.closeButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(Invite.sendButton).toBeVisible();

        // * Verify Team data
        await expect(Invite.teamDisplayName).toHaveText(testTeam.display_name);
        await expect(Invite.teamIcon).toBeVisible();

        // * Verify Server data
        await expect(Invite.serverDisplayName).toHaveText(serverOneDisplayName);

        // * Verify Share Link
        await expect(Invite.shareLinkButton).toBeVisible();

        // * Verify Search bar
        await expect(Invite.searchBarTitle).toBeVisible();
        await expect(Invite.searchBarInput).toBeVisible();
    });
});
