// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Channels - Channel List', () => {

    const serverOneDisplayName = 'Server 1';
    const offTopicChannelName = 'off-topic';
    const townSquareChannelName = 'town-square';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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

    it('MM-T4728_2 - should be able to switch between channels', async () => {
        // # Tap on a first channel
        await ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name).tap();
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify on first channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);

        // # Go back to channel list screen and tap on a second channel
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await ChannelListScreen.getChannelItemDisplayName(channelsCategory, offTopicChannelName).tap();

        // * Verify on second channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText('Off-Topic');

        // # Go back to channel list screen and tap on a third channel
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await ChannelListScreen.getChannelItemDisplayName(channelsCategory, townSquareChannelName).tap();

        // * Verify on third channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText('Town Square');

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
