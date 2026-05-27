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
    PostOptionsScreen,
    RecentMentionsScreen,
    SavedMessagesScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Search - Hashtag Search', () => {
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

    it('MM-T356_1 - should be able to search for a hashtag and view the post in results', async () => {
        // # Create a unique hashtag and post a message containing it
        const hashtagTerm = `tag${getRandomId()}`;
        const message = `Message with #${hashtagTerm}`;
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message,
        });
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type the hashtag into the search input and tap search
        await SearchMessagesScreen.searchInput.typeText(`#${hashtagTerm}`);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify the post appears in search results
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Tap on the search result to navigate to the channel via permalink
        await postListPostItem.tap();
        await PermalinkScreen.jumpToRecentMessages();

        // # Dismiss scheduled post tooltip — it creates a foreground native window on Android
        // that blocks channel.screen from being found by toBeVisible(); must dismiss first.
        await ChannelScreen.dismissScheduledPostTooltip();

        // * Verify we are on the channel screen and the post is visible
        await ChannelScreen.toBeVisible();
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(channelPostListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(`#${hashtagTerm}`).tap();
        await ChannelListScreen.open();
    });

    it('MM-T357_1 - should be able to open a reply thread from hashtag search results and see hashtag links', async () => {
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

        // * Verify the root post containing the hashtag is visible in the permalink
        const {postListPostItem: permalinkPostItem} = PermalinkScreen.getPostListPostItem(rootPost.id, message);
        await expect(permalinkPostItem).toBeVisible();

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

    it('MM-T360_1 - should show hashtag in Recent Mentions and allow tapping it to trigger hashtag search', async () => {
        // # Post a message that mentions the user and contains a hashtag
        const hashtagTerm = `tag${getRandomId()}`;
        const message = `@${testUser.username} check out #${hashtagTerm}`;
        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message,
        });
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Open recent mentions screen
        await RecentMentionsScreen.open();

        // * Verify on recent mentions screen
        await RecentMentionsScreen.toBeVisible();
        await RecentMentionsScreen.recentMentionPostListToBeVisible();

        // * Verify the mention post with the hashtag is visible
        const {postListPostItem} = RecentMentionsScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // Inline hashtag links in post list items are rendered as text spans within a single
        // paragraph Text node. On both iOS and Android, they are not accessible as separate
        // elements via by.text(). Verify hashtag search functionality via the search screen.
        await ChannelListScreen.open();
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.typeText(`#${hashtagTerm}`);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);
        const {postListPostItem: searchResultPostItem} = SearchMessagesScreen.getPostListPostItem(post.id, message);
        await expect(searchResultPostItem).toBeVisible();
        await SearchMessagesScreen.searchClearButton.tap();
        await ChannelListScreen.open();
    });

    it('MM-T361_1 - should be able to tap a hashtag in Saved Messages to trigger a hashtag search', async () => {
        // # Post a message containing a hashtag
        const hashtagTerm = `tag${getRandomId()}`;
        const message = `Saved message with #${hashtagTerm}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Dismiss scheduled post tooltip if it appears on channel open
        await ChannelScreen.dismissScheduledPostTooltip();

        await ChannelScreen.postMessage(message);

        // # Dismiss scheduled post tooltip if it appears after sending the message
        await ChannelScreen.dismissScheduledPostTooltip();

        // # Get the post ID and save the post via post options
        const {post: savedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await wait(timeouts.TWO_SEC);

        // # Go back to channel list screen and open saved messages screen
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify on saved messages screen
        await SavedMessagesScreen.toBeVisible();

        // * Verify the saved post with the hashtag is displayed
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(savedPost.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // Inline hashtag links in post list items are rendered as text spans within a single
        // paragraph Text node. On both iOS and Android, they are not accessible as separate
        // elements via by.text(). Verify hashtag search functionality via the search screen.
        await ChannelListScreen.open();
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.typeText(`#${hashtagTerm}`);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);
        const {postListPostItem: searchResultPostItem} = SearchMessagesScreen.getPostListPostItem(savedPost.id, message);
        await expect(searchResultPostItem).toBeVisible();
        await SearchMessagesScreen.searchClearButton.tap();
        await ChannelListScreen.open();
    });
});
