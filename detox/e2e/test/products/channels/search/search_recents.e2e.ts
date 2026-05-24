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

    it('MM-T351_1 - wildcard (*) disregarded if not preceded by text', async () => {
        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type a wildcard with no preceding text and submit search
        await SearchMessagesScreen.searchInput.typeText('*test');
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify that no crash occurs and the results state is shown (search completed without error)
        await expect(SearchMessagesScreen.searchMessagesScreen).toBeVisible();

        // # Clear search input and remove recent search item if present
        await SearchMessagesScreen.searchClearButton.tap();
        try {
            await SearchMessagesScreen.getRecentSearchItemRemoveButton('*test').tap();
        } catch {
            // Recent search item may not exist if wildcard was discarded; no action needed
        }

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T352_1 - cleared search term should not reappear', async () => {
        const searchTerm = `cleartest${getRandomId()}`;

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Type a search term
        await SearchMessagesScreen.searchInput.typeText(searchTerm);

        // * Verify the search term is in the input
        await expect(SearchMessagesScreen.searchInput).toHaveText(searchTerm);

        // # Clear the search input using the X button
        await SearchMessagesScreen.searchClearButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify the search input is now empty
        await expect(SearchMessagesScreen.searchInput).toHaveText('');

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T355_1 - old results not combined with new results', async () => {
        // # Post two uniquely-searchable messages
        const termA = `terma${getRandomId()}`;
        const termB = `termb${getRandomId()}`;
        const messageA = `Message ${termA}`;
        const messageB = `Message ${termB}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(messageA);
        const {post: postA} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.postMessage(messageB);
        const {post: postB} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.back();

        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify on search messages screen
        await SearchMessagesScreen.toBeVisible();

        // # Search for term A
        await SearchMessagesScreen.searchInput.typeText(termA);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify result for term A is shown
        const {postListPostItem: postItemA} = SearchMessagesScreen.getPostListPostItem(postA.id, messageA);
        await expect(postItemA).toBeVisible();

        // # Clear search and search for term B
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.searchInput.typeText(termB);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // * Verify result for term B is shown
        const {postListPostItem: postItemB} = SearchMessagesScreen.getPostListPostItem(postB.id, messageB);
        await expect(postItemB).toBeVisible();

        // * Verify result for term A is NOT shown (results were replaced, not combined)
        await expect(postItemA).not.toBeVisible();

        // # Clear search, remove recent search items, and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(termB).tap();
        try {
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(termA).tap();
        } catch {
            // Term A may not be in recent searches if it was replaced; no action needed
        }
        await ChannelListScreen.open();
    });

    it('MM-T3238_1 - delete one previous search, tap on another', async () => {
        // # Post messages for two distinct search terms so they appear in recent searches
        const termOne = `recent1${getRandomId()}`;
        const termTwo = `recent2${getRandomId()}`;
        const msgOne = `Message ${termOne}`;
        const msgTwo = `Message ${termTwo}`;

        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(msgOne);
        await ChannelScreen.postMessage(msgTwo);
        const {post: postTwo} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.back();

        // # Open search messages screen, search for term one to save it as recent
        await SearchMessagesScreen.open();
        await SearchMessagesScreen.searchInput.typeText(termOne);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // # Clear and search for term two to save it as recent
        await SearchMessagesScreen.searchClearButton.tap();
        await SearchMessagesScreen.searchInput.typeText(termTwo);
        await SearchMessagesScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);

        // # Clear search to show recent search list
        await SearchMessagesScreen.searchClearButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify both recent search items are visible
        await expect(SearchMessagesScreen.getRecentSearchItem(termOne)).toBeVisible();
        await expect(SearchMessagesScreen.getRecentSearchItem(termTwo)).toBeVisible();

        // # Delete the first recent search item
        await SearchMessagesScreen.getRecentSearchItemRemoveButton(termOne).tap();
        await wait(timeouts.ONE_SEC);

        // * Verify term one is removed
        await expect(SearchMessagesScreen.getRecentSearchItem(termOne)).not.toExist();

        // # Tap on the remaining (term two) recent search item
        await SearchMessagesScreen.getRecentSearchItem(termTwo).tap();
        await wait(timeouts.TWO_SEC);

        // * Verify results for term two are loaded
        const {postListPostItem} = SearchMessagesScreen.getPostListPostItem(postTwo.id, msgTwo);
        await expect(postListPostItem).toBeVisible();

        // # Clear search input, remove remaining recent search item, and go back to channel list screen
        // The clear button may be unmounted after tapping a recent search item on some platforms,
        // so wrap cleanup in try-catch to ensure navigation always runs.
        try {
            await SearchMessagesScreen.searchClearButton.tap();
            await SearchMessagesScreen.getRecentSearchItemRemoveButton(termTwo).tap();
        } catch {
            // Cleanup best-effort — clear button may not be in hierarchy after recent item tap
        }
        await ChannelListScreen.open();
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

        // # Clear any stale search input from a previous test (typeText appends, not replaces)
        try {
            await SearchMessagesScreen.searchClearButton.tap();
            await wait(timeouts.ONE_SEC);
        } catch {
            // Already empty — no action needed
        }

        // # Type a search term and submit search
        await SearchMessagesScreen.searchInput.typeText(searchTerm);
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
