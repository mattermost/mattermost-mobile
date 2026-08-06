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
import {getRandomId, timeouts, wait} from '@support/utils';
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
});
