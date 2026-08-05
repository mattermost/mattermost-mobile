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

    it('MM-T4728_6 - should be able to go to create channel screen', async () => {
        // # Tap on plus menu button and tap on create new channel item
        await ChannelListScreen.openPlusMenu();
        await waitForElementToBeVisible(ChannelListScreen.createNewChannelItem, timeouts.TEN_SEC);
        await ChannelListScreen.createNewChannelItem.tap();

        // * Verify on create channel screen
        await CreateOrEditChannelScreen.toBeVisible();

        // # Go back to channel list screen
        await CreateOrEditChannelScreen.close();
    });
});
