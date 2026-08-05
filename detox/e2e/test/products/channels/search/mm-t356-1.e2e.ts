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
import {getRandomId, isAndroid, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
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

    // Skip Android: R1 product — reply thread / hashtag link not visible from search results

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
});
