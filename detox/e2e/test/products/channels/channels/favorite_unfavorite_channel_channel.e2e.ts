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
import {timeouts, wait, waitForElementToExist} from '@support/utils';
import {waitFor} from 'detox';

describe('Channels - Favorite and Unfavorite Channel', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const favoritesCategory = 'favorites';
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
        await ChannelListScreen.ensureCategoryExpanded(favoritesCategory);
        await waitForElementToExist(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name), timeouts.TWENTY_SEC);

        // # Go back to the favorited channel, tap on channel quick actions button, and tap on favorited quick action to unfavorite the channel
        await ChannelScreen.open(favoritesCategory, testChannel.name);
        await ChannelScreen.channelQuickActionsButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.unfavoriteQuickAction.tap();

        // * Verify unfavorited toast message appears
        await waitFor(ChannelScreen.toastMessage).toHaveText('This channel was unfavorited').withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelScreen.toastMessage).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();

        // * Verify channel is not listed anymore under favorites category and is back under channels category
        await waitFor(ChannelListScreen.getChannelItemDisplayName(favoritesCategory, testChannel.name)).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitForElementToExist(ChannelListScreen.getChannelItemDisplayName(channelsCategory, testChannel.name), timeouts.TWENTY_SEC);
    });
});
