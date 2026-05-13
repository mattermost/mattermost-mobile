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
import {timeouts, wait} from '@support/utils';
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

    it('MM-T4929_1 - should be able to favorite/unfavorite a channel from channel quick actions', async () => {
        // # Open a channel screen, tap on channel quick actions button, and tap on favorite quick action to favorite the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.channelQuickActionsButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.favoriteQuickAction.tap();

        // * Verify favorited toast message appears
        // Use waitFor with a timeout instead of expect() to handle the async toast
        // animation on Android where getText() may return null if checked too early.
        await waitFor(ChannelScreen.toastMessage).toHaveText('This channel was favorited').withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelScreen.toastMessage).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();

        // * Verify channel is listed under favorites category
        await expect(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name)).toBeVisible();

        // # Go back to the favorited channel, tap on channel quick actions button, and tap on favorited quick action to unfavorite the channel
        await ChannelScreen.open(favoritesCategory, testChannel.name);
        await ChannelScreen.channelQuickActionsButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.unfavoriteQuickAction.tap();

        // * Verify unfavorited toast message appears
        // Use waitFor with a timeout instead of expect() to handle the async toast
        // animation on Android where getText() may return null if checked too early.
        await waitFor(ChannelScreen.toastMessage).toHaveText('This channel was unfavorited').withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelScreen.toastMessage).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();

        // * Verify channel is not listed anymore under favorites category and is back under channels category
        await expect(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name)).not.toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
    });

    it('MM-T4929_2 - should be able to favorite/unfavorite a channel from channel info screen', async () => {
        // # Open a channel screen, open channel info screen, tap on favorite action to favorite the channel, and go back to channel list screen
        // Open the channel regardless of which category it's in (it may be in favorites if MM-T4929_1 left it there)
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
        await expect(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name)).toBeVisible();

        // # Go back to the favorited channel, open channel info screen, tap on favorited action to unfavorite the channel, and go back to channel list screen
        await ChannelScreen.open(favoritesCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.unfavoriteAction.tap();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // * Verify channel is not listed anymore under favorites category and is back under channels category
        await expect(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name)).not.toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name)).toBeVisible();
    });

    it('MM-T4929_3 - should be able to favorite/unfavorite a direct message channel from channel intro', async () => {
        // # Open a direct message channel screen, post a message, tap on intro favorite action to favorite the channel, and go back to channel list screen
        const {user: newUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);
        const {channel: directMessageChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, newUser.id]);
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();
        await CreateDirectMessageScreen.searchInput.replaceText(newUser.username);

        // Wait for the FlatList to commit the user item's testID to the native
        // view hierarchy before tapping — on Android the list render can lag
        // behind the search input, causing the testID lookup to fail.
        await waitFor(CreateDirectMessageScreen.getUserItem(newUser.id)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await CreateDirectMessageScreen.getUserItem(newUser.id).tap();
        await CreateDirectMessageScreen.startButton.tap();
        await ChannelScreen.postMessage('test');
        await ChannelScreen.back();
        await ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, directMessageChannel.name).tap();
        await waitFor(ChannelScreen.introFavoriteAction).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.introFavoriteAction.tap();
        await ChannelScreen.back();

        // * Verify direct message channel is listed under favorites category
        await expect(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, directMessageChannel.name)).toHaveText(newUser.username);

        // # Go back to the favorited direct message channel, tap on intro favorited action to unfavorite the direct message channel, and go back to channel list screen
        await ChannelScreen.open(favoritesCategory, directMessageChannel.name);
        await ChannelScreen.introUnfavoriteAction.tap();
        await ChannelScreen.back();

        // * Verify direct message channel is not listed anymore under favorites category and is back under direct messages category
        await expect(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, directMessageChannel.name)).not.toBeVisible();
        await expect(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, directMessageChannel.name)).toBeVisible();
    });
});
