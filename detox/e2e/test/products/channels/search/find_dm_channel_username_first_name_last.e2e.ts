// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AddMembersScreen,
    ChannelListScreen,
    ChannelScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    PermalinkScreen,
    PostOptionsScreen,
    SearchMessagesScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Search - Search Cycle', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
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

    // Skip: failed CI run 29954156963 (both) — BACK_INDEX / comment from search

    it('MM-T2507 - should find DM channel by username, first name, last name, and nickname', async () => {
        // # Create a new user with known first name, last name, and nickname
        const randomId = getRandomId();
        const newUser = {
            email: `findme${randomId}@sample.mattermost.com`,
            username: `findme${randomId}`,
            password: `P${randomId}!1234`,
            first_name: `First${randomId}`,
            last_name: `Last${randomId}`,
            nickname: `Nick${randomId}`,
        };
        const {user: targetUser} = await User.apiCreateUser(siteOneUrl, {user: newUser});
        await Team.apiAddUserToTeam(siteOneUrl, targetUser.id, testTeam.id);

        // # Open create direct message screen (which uses the "Find channel" flow)
        await CreateDirectMessageScreen.open();

        // * Verify on create direct message screen
        await CreateDirectMessageScreen.toBeVisible();

        // # Dismiss the long-press tutorial overlay on Android (same modal pattern as members screen)
        if (isAndroid()) {
            await AddMembersScreen.dismissTutorial();
        }

        // # Type the username of the target user and verify they are returned
        await CreateDirectMessageScreen.searchInput.typeText(`@${targetUser.username}`);
        await wait(timeouts.TWO_SEC);

        // * Verify user is returned by username search
        const userItem = CreateDirectMessageScreen.getUserItem(targetUser.id);
        await expect(userItem).toBeVisible();

        // # Clear search and type the first name of the target user
        await CreateDirectMessageScreen.searchInput.clearText();
        await CreateDirectMessageScreen.searchInput.typeText(targetUser.first_name);
        await wait(timeouts.TWO_SEC);

        // * Verify user is returned by first name search
        await expect(userItem).toBeVisible();

        // # Clear search and type the last name of the target user
        await CreateDirectMessageScreen.searchInput.clearText();
        await CreateDirectMessageScreen.searchInput.typeText(targetUser.last_name);
        await wait(timeouts.TWO_SEC);

        // * Verify user is returned by last name search
        await expect(userItem).toBeVisible();

        // # Clear search and type the nickname of the target user
        await CreateDirectMessageScreen.searchInput.clearText();
        await CreateDirectMessageScreen.searchInput.typeText(targetUser.nickname);
        await wait(timeouts.TWO_SEC);

        // * Verify user is returned by nickname search
        await expect(userItem).toBeVisible();

        // # Close create direct message screen and go back to channel list screen
        await CreateDirectMessageScreen.close();
    });
});
