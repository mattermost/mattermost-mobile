// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
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
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    CreateDirectMessageScreen,
    CreateOrEditChannelScreen,
    FindChannelsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {getRandomId, isAndroid, isIos, timeouts, wait} from '@support/utils';
import {device, expect, waitFor} from 'detox';

describe('Smoke Test - Channels', () => {

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

    // Skip iOS: failed on CI 30437339535. The waitFor-polling fix added afterwards was never
    // exercised — its shard was cancelled on 30447839548 — so treat it as unverified. Android passes.

    it('MM-T4774_2 - should be able to create a channel and create a direct message', async () => {
        // # Open create channel screen and create a new channel
        const displayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.typeText(displayName);
        await wait(timeouts.FOUR_SEC);
        await CreateOrEditChannelScreen.clickonCreateButton();

        // * Verify on newly created public channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(displayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(displayName);

        // # As admin, create a new user to open direct message with, then go back to channel list screen, open create direct message screen and open direct message with new user
        const {user: newUser} = await User.apiCreateUser(siteOneUrl);
        const newUserDisplayName = newUser.username;
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);
        await ChannelScreen.back();
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();
        await CreateDirectMessageScreen.searchInput.replaceText(newUserDisplayName);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.getUserItem(newUser.id).tap();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.startButton.tap();

        // * Verify on direct message channel screen for the new user
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(newUserDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(newUserDisplayName);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
