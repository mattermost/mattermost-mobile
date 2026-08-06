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
import {timeouts, wait} from '@support/utils';
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

    it('MM-T4728_3 - should be able to collapse and expand categories', async () => {
        // # Go to a channel to make it active and go back to channel list screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage('Test message');
        await ChannelScreen.back();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Toggle channels category to collapse
        await ChannelListScreen.getCategoryExpanded(channelsCategory).tap();

        // * Verify category is collapsed and channels are not listed
        await wait(timeouts.ONE_SEC);
        await expect(ChannelListScreen.getCategoryCollapsed(channelsCategory)).toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).not.toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, offTopicChannelName)).not.toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, townSquareChannelName)).not.toBeVisible();

        // # Toggle channels category to expand
        await ChannelListScreen.getCategoryCollapsed(channelsCategory).tap();

        // * Verify category is expanded and all channels are listed
        await wait(timeouts.ONE_SEC);
        await expect(ChannelListScreen.getCategoryExpanded(channelsCategory)).toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, offTopicChannelName)).toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, townSquareChannelName)).toBeVisible();
    });
});
