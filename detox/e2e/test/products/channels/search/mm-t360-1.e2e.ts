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
});
