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
    PostOptionsScreen,
    SearchMessagesScreen,
    ServerScreen,
    ThreadScreen,
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

    it.skip('MM-T373 - should be able to post a comment from search results', async () => {
        // # Post message with unique term "asparagus" + random suffix for isolation
        const uniqueSuffix = getRandomId();
        const searchTerm = `asparagus${uniqueSuffix}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(searchTerm);

        // * Verify message is posted
        const {post: originalPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(originalPost.id, searchTerm);
        await expect(channelPostItem).toBeVisible();

        // # Go back to channel list screen and open search messages screen
        await ChannelScreen.back();
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Search for the term and tap on search key
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify search results contain the posted message
        const {postListPostItem: searchResultPostItem} = SearchMessagesScreen.getPostListPostItem(originalPost.id, searchTerm);
        await expect(searchResultPostItem).toBeVisible();

        // # Open post options for the search result and tap the reply option
        await SearchMessagesScreen.openPostOptionsFor(originalPost.id, searchTerm);
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify on thread screen (RHS switches to reply thread view)
        await ThreadScreen.toBeVisible();

        // # Type a reply and post it
        const replyMessage = `Replying to ${searchTerm}`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply is posted and stays in reply / message thread view
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(replyPostItem).toBeVisible();

        // * Verify still on thread screen (not navigated away)
        await ThreadScreen.toBeVisible();

        // # Go back to search results screen
        await ThreadScreen.back();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });
});
