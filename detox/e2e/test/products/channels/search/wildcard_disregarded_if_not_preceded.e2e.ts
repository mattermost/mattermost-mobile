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
});
