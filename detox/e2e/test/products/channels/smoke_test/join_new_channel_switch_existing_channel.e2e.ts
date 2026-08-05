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

    it('MM-T4774_1 - should be able to join a new channel and switch to an existing channel', async () => {
        // # As admin, create a new channel so that user can join, then open browse channels screen and join the new channel
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await BrowseChannelsScreen.open();
        await BrowseChannelsScreen.searchInput.replaceText(channel.name);
        await BrowseChannelsScreen.searchInput.tapReturnKey();
        await wait(timeouts.FOUR_SEC);
        await BrowseChannelsScreen.getChannelItem(channel.name).multiTap(2);
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify on newly joined channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);
        await expect(ChannelScreen.introDisplayName).toHaveText(channel.display_name);

        // # Go back to channel list screen and switch to an existing channel
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify on the other channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
