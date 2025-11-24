// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T878: RN apps View Members in GM
 */

import {Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T878 - RN apps View Members in GM', async () => {
        // Expected Results (for all steps):
        // * GM members are displayed in a list and can't be selected

        // # Setup: Create two additional users for the GM
        const {user: user1} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser1'});
        const {user: user2} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser2'});
        await Team.apiAddUserToTeam(siteOneUrl, user1.id, testTeam.id);
        await Team.apiAddUserToTeam(siteOneUrl, user2.id, testTeam.id);

        // # Step 1: View any existing GM, or create one (Channel drawer > DMs > plus sign and add 2 or more members)
        await CreateDirectMessageScreen.open();
        await wait(timeouts.TWO_SEC);

        // Select first user
        const user1Item = CreateDirectMessageScreen.getUserItem(user1.id);
        await waitFor(user1Item).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await user1Item.tap();
        await wait(timeouts.ONE_SEC);

        // Select second user
        const user2Item = CreateDirectMessageScreen.getUserItem(user2.id);
        await waitFor(user2Item).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await user2Item.tap();
        await wait(timeouts.ONE_SEC);

        // Start the GM
        await CreateDirectMessageScreen.startButton.tap();
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.toBeVisible();

        // # Step 2: Tap channel name
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 3: Select View Members
        // * GM members are displayed in a list and can't be selected
        await expect(ChannelInfoScreen.membersOption).toBeVisible();
        await ChannelInfoScreen.membersOption.tap();
        await wait(timeouts.TWO_SEC);

        // Verify members are displayed
        const membersList = element(by.id('channel_members.screen'));
        await expect(membersList).toBeVisible();

        // Close members view and return
        const backButton = element(by.id('screen.back.button'));
        await backButton.tap();
        await wait(timeouts.ONE_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
