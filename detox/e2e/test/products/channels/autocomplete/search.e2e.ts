// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    SearchMessagesScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Autocomplete - Search', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        // # Create isolated test data and log in
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify we start from channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3393_2 - should render channel mention autocomplete when tapping in: modifier on search screen', async () => {
        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify channel mention autocomplete list is not displayed on initial search screen
        await wait(timeouts.ONE_SEC);
        await expect(Autocomplete.sectionChannelMentionList).not.toExist();

        // # Tap the in: modifier to trigger channel mention autocomplete
        await SearchMessagesScreen.searchModifierIn.tap();

        // * Verify channel mention autocomplete list is displayed
        await waitFor(Autocomplete.sectionChannelMentionList).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Clear search and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await ChannelListScreen.open();
    });

    it.skip('MM-T3393_3 - should render date suggestion autocomplete when tapping before: modifier on search screen', async () => {
        // # Open search messages screen
        await SearchMessagesScreen.open();

        // * Verify date suggestion autocomplete list is not displayed on initial search screen
        await wait(timeouts.ONE_SEC);
        await expect(Autocomplete.dateSuggestionList).not.toExist();

        // # Tap the before: modifier to trigger date suggestion autocomplete
        await SearchMessagesScreen.searchModifierBefore.tap();

        // * Verify date suggestion autocomplete list is displayed
        // NOTE: DateSuggestion component is currently commented out in
        // app/components/autocomplete/autocomplete.tsx. This test will fail
        // until the feature is re-enabled (enableDateSuggestion prop + DateSuggestion render).
        await waitFor(Autocomplete.dateSuggestionList).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(Autocomplete.dateSuggestionList).toExist();

        // # Clear search and go back to channel list screen
        await SearchMessagesScreen.searchClearButton.tap();
        await ChannelListScreen.open();
    });
});
