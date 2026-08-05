// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    Team,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    CreateDirectMessageScreen,
    CreateOrEditChannelScreen,
    FindChannelsScreen,
    GlobalThreadsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, expectVisible, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Channel List', () => {

    const serverOneDisplayName = 'Server 1';
    const directMessagesCategory = 'direct_messages';
    const offTopicChannelName = 'off-topic';
    const townSquareChannelName = 'town-square';
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

    it('MM-T3249 - should be able to switch between teams', async () => {
        // # As admin, create a second team and add user to the second team; as user, terminate app and relaunch app
        const {team: testTeamTwo} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'a'});
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeamTwo.id);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Verify on first team and team sidebar item is selected and has correct display name abbreviation
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);
        await expect(ChannelListScreen.getTeamItemSelected(testTeam.id)).toBeVisible();
        await expect(ChannelListScreen.getTeamItemDisplayNameAbbreviation(testTeam.id)).toHaveText(testTeam.display_name.substring(0, 2).toUpperCase());

        // # Tap on second team item from team sidebar
        await ChannelListScreen.getTeamItemNotSelected(testTeamTwo.id).tap();

        // * Verify on second team and team sidebar item is selected and has correct display name abbreviation
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeamTwo.display_name);
        await expect(ChannelListScreen.getTeamItemSelected(testTeamTwo.id)).toBeVisible();
        await expect(ChannelListScreen.getTeamItemDisplayNameAbbreviation(testTeamTwo.id)).toHaveText(testTeamTwo.display_name.substring(0, 2).toUpperCase());

        // # Tap back on first team item from team sidebar
        await ChannelListScreen.getTeamItemNotSelected(testTeam.id).tap();

        // * Verify on first team
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);
    });
});
