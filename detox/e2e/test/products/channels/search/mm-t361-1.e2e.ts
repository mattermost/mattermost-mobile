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
        await PostOptionsScreen.tapSavePost();
        await wait(timeouts.TWO_SEC);

        // # Go back to channel list screen and open saved messages screen
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify on saved messages screen
        await SavedMessagesScreen.toBeVisible();

        // * Verify the saved post with the hashtag is displayed
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(savedPost.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // Inline hashtag links render as text spans inside a single paragraph Text node on both
        // platforms, so verify hashtag search through the search screen instead.
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
