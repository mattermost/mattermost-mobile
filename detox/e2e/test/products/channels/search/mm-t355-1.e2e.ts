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
});
