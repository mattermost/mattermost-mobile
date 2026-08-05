// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
} from '@support/ui/screen';
import {timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Favorite and Unfavorite Channel', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const favoritesCategory = 'favorites';
    const directMessagesCategory = 'direct_messages';
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

    it('MM-T4929_2 - should be able to favorite/unfavorite a channel from channel info screen', async () => {
        // # Open a channel screen, open channel info screen, tap on favorite action to favorite the channel, and go back to channel list screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();

        // If the channel is already favorited (cascade from a prior test failure), unfavorite it first
        // so this test always starts from a clean unfavorited state.
        try {
            await waitFor(ChannelInfoScreen.unfavoriteAction).toExist().withTimeout(timeouts.TWO_SEC);
            await ChannelInfoScreen.unfavoriteAction.tap();
            await waitFor(ChannelInfoScreen.favoriteAction).toExist().withTimeout(timeouts.TEN_SEC);
        } catch {
            // Channel is not favorited — proceed normally
        }
        await ChannelInfoScreen.favoriteAction.tap();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // * Verify channel is listed under favorites category
        await ChannelListScreen.ensureCategoryExpanded(favoritesCategory);
        await waitForElementToExist(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name), timeouts.TWENTY_SEC);

        // # Go back to the favorited channel, open channel info screen, tap on favorited action to unfavorite the channel, and go back to channel list screen
        await ChannelScreen.open(favoritesCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.unfavoriteAction.tap();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // * Verify channel is not listed anymore under favorites category and is back under channels category
        await waitFor(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name)).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitForElementToExist(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name), timeouts.TWENTY_SEC);
    });
});
