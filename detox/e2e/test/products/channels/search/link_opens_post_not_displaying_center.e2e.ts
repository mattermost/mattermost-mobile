// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

// Split out of `search_behaviors.e2e.ts` — see search_modifiers.e2e.ts header
// comment for context. This file groups tests that exercise INTERACTIONS on
// search result rows: scrolling, post-options reactions/save, permalink
// navigation, and saved-messages cross-screen highlighting.

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
    SavedMessagesScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Search - Result Interactions', () => {

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

    afterEach(async () => {
        // # Safety net: tap the channel list tab to return to channel list after each test.
        try {
            await HomeScreen.channelListTab.tap();
        } catch {
            // Best-effort
        }
        await wait(timeouts.ONE_SEC);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T380_1 - link opens for post not displaying in center', async () => {
        // # Post a message in the test channel
        const searchTerm = `jumptest${getRandomId()}`;
        const message = `Message ${searchTerm}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post: postedMessage} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.back();

        // # Open search messages screen and search for the posted message
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // Dismiss keyboard so the post is not obscured by it when checking visibility.
        try {
            await SearchMessagesScreen.getFlatPostList().scroll(50, 'down');
        } catch {
            // Keyboard already gone or results not yet rendered — non-fatal
        }
        await wait(timeouts.ONE_SEC);

        // * Verify post result is visible
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(postedMessage.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Tap the post to navigate to it via permalink
        await postListPostItem.tap();

        // * Verify on permalink screen
        await PermalinkScreen.toBeVisible();

        // # Jump to recent messages
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen with the post visible
        await ChannelScreen.toBeVisible();
        const {postListPostItem: channelPostItem} = ChannelScreen.getPostListPostItem(postedMessage.id, message);
        await expect(channelPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });
});
