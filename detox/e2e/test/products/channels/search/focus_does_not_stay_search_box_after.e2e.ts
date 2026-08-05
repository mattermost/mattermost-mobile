// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

// Split out of `search_behaviors.e2e.ts` — see search_modifiers.e2e.ts header
// comment for context. This file groups tests focused on the recent-search
// list, search input behavior (wildcard, clear, replace), and focus state.

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
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

describe('Search - Recents and Input', () => {

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

    it('MM-T366_1 - focus does not stay in search box after search', async () => {
        const searchTerm = `focustest${getRandomId()}`;
        const message = `Message ${searchTerm}`;

        // # Post a message so there are results
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // Fetch post ID immediately after posting before any other posts can be created
        const {post: searchedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.back();

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type a search term and submit search.
        // Use replaceText (not typeText) — typeText appends, so any stale text
        // left by a previous test would concatenate with `searchTerm` and the
        // server-side search would return 0 results.
        await SearchMessagesScreen.searchInput.replaceText(searchTerm);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // Dismiss keyboard so post is not hidden behind it
        try {
            await SearchMessagesScreen.getFlatPostList().scroll(50, 'down');
        } catch {
            // List too short to scroll
        }

        // * Verify search results are shown without waiting for Detox idle-sync
        // (waitForElementToBeVisible polls immediately, avoiding bridge-idle stalls)
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(searchedPost.id, message);
        await waitForElementToBeVisible(postListPostItem, timeouts.HALF_MIN);

        // * Verify the results list is visible (keyboard has been dismissed)
        await expect(SearchMessagesScreen.getFlatPostList()).toBeVisible();

        // # Clear search, remove recent search item, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(searchTerm).tap();
        await ChannelListScreen.open();
    });
});
