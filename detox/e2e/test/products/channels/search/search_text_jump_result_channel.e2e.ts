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
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    PermalinkScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Search - Search Cycle', () => {

    const serverOneDisplayName = 'Server 1';
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

    // Skip: failed CI run 29954156963 (both) — BACK_INDEX / comment from search

    it('MM-T3235 - should be able to search on text and jump to result in channel', async () => {
        // # Open channel screen and post a message with a unique search term
        const searchTerm = getRandomId();
        const message = `Search test ${searchTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen and open search messages screen
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type in the search term and tap on search key
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify search results contain the posted message
        const {postListPostItem: searchResultPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(searchResultPostItem).toBeVisible();

        // # Tap on the search result post to open the permalink view
        await searchResultPostItem.tap();

        // * Verify permalink screen is visible
        await PermalinkScreen.toBeVisible();

        // # Tap on "Jump to recent messages" button
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify the channel screen is displayed (jumped to the channel where the message was posted)
        await ChannelScreen.toBeVisible();

        // # Go back to channel list, then open search to clear the stale search term
        await ChannelScreen.back();
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchClearButton.tap();
        await ChannelListScreen.open();
    });
});
