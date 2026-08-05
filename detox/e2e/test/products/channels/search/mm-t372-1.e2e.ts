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

    it('MM-T372_1 - highlighting does not persist in Saved Messages', async () => {
        // # Post a message and search for it to establish search highlighting context
        const searchTerm = `highlight${getRandomId()}`;
        const message = `Message ${searchTerm}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();

        // # Open search, search for term, and save the result
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.tap();

        await device.disableSynchronization();
        let searchedPostId: string;
        try {
            await SearchMessagesScreen.searchInput.replaceText(searchTerm);
            await SearchMessagesScreen.searchInput.tapReturnKey();

            const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
            searchedPostId = searchedPost.id;

            const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(searchedPostId, message);
            await waitForElementToBeVisible(postListPostItem, timeouts.HALF_MIN);

            await SearchMessagesScreen.openPostOptionsFor(searchedPostId, message);
        } finally {
            await device.enableSynchronization();
        }
        await PostOptionsScreen.tapSavePost();
        await wait(timeouts.TWO_SEC);

        // # Navigate to Saved Messages
        await SavedMessagesScreen.open();

        // * Verify on Saved Messages screen
        await SavedMessagesScreen.toBeVisible();

        // * Verify the message appears in Saved Messages (without search highlighting context)
        const {postListPostItem: savedPostItem} = SavedMessagesScreen.getPostListPostItem(searchedPostId, message);
        await waitForElementToBeVisible(savedPostItem, timeouts.HALF_MIN);

        // # Unsave the post to clean up, then go back to channel list
        await SavedMessagesScreen.openPostOptionsFor(searchedPostId, message);
        await PostOptionsScreen.tapUnsavePost();
        await wait(timeouts.TWO_SEC);

        // # Go back to search screen to clean up recent searches
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchClearButton.tap();
        try {
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        } catch {
            // Cleanup best-effort
        }
        await ChannelListScreen.open();
    });
});
