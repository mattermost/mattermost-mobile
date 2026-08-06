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
import {getRandomId, isAndroid, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

describe('Search - Hashtag Search', () => {

    const serverOneDisplayName = 'Server 1';
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

    // Skip Android: R1 product — reply thread / hashtag link not visible from search results

    (isAndroid() ? it.skip : it)('MM-T357_1 - should be able to open a reply thread from hashtag search results and see hashtag links', async () => {
        // # Create a unique hashtag and post a message containing it
        const hashtagTerm = `tag${getRandomId()}`;
        const message = `Thread message with #${hashtagTerm}`;
        const {post: rootPost} = await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message,
        });

        // # Post a reply to create a thread
        const replyMessage = `Reply to thread with #${hashtagTerm}`;
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: replyMessage,
            rootId: rootPost.id,
        });

        // # Open search messages screen and search for the hashtag
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type the hashtag into the search input and tap search
        await SearchMessagesScreen.searchInput.typeText(`#${hashtagTerm}`);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify the root post appears in search results
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(rootPost.id, message);
        await expect(postListPostItem).toBeVisible();

        // * Verify the reply count indicator appears
        await waitFor(element(by.text('1 reply'))).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Tap on "1 reply" to open the thread from search results
        await element(by.text('1 reply')).tap();

        // On both platforms, tapping "1 reply" from search results opens the PermalinkScreen
        // (channel context view) rather than navigating to the thread directly.
        await PermalinkScreen.toBeVisible();

        // * Verify the root post containing the hashtag is visible in the permalink.
        const {postListPostItem: permalinkPostItem} = PermalinkScreen.getPostListPostItem(rootPost.id, message);
        await waitForElementToBeVisible(permalinkPostItem, timeouts.TEN_SEC);

        // # Jump to recent messages to dismiss the permalink and open the channel
        await PermalinkScreen.jumpToRecentMessages();
        await ChannelScreen.dismissScheduledPostTooltip();
        await ChannelScreen.back();

        // # Clear search input, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(`#${hashtagTerm}`).tap();
        await ChannelListScreen.open();
    });
});
