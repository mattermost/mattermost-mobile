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

    it('MM-T5363 - should be able to send user invite', async () => {
        // # Search for an existent user
        await Invite.searchBarInput.replaceText(testUser1.username);

        // * Validate user item in search list.
        await waitFor(Invite.getSearchListUserItem(testUser1.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(Invite.getSearchListUserItemText(testUser1.id)).toHaveText(testUser1.username);

        // # Select user item
        await Invite.getSearchListUserItem(testUser1.id).tap();
        await expect(Invite.getSearchListUserItem(testUser1.id)).not.toBeVisible();

        // * Validate user is added to selected items
        await expect(Invite.getSelectedChip()).toBeVisible();
        await expect(Invite.getSelectedChip()).toHaveText(testUser1.username);

        // # Send invitation
        await Invite.sendButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Validate summary report sent
        await waitFor(Invite.screenSummary).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(Invite.getSummaryReportSent()).toBeVisible();
        await expect(Invite.getSummaryReportNotSent()).not.toExist();
        await expect(Invite.getSummaryReportUserItem(testUser1.id)).toBeVisible();
        await expect(Invite.getSummaryReportUserItemText(testUser1.id)).toHaveText(testUser1.username);
    });
});
