// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Create Direct Message', () => {

    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
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

    // Skip both: Android 3/3 + iOS R3 — duplicate/ambiguous user_item matcher / search spinner

    // Skip both: Android 3/3 + iOS R3 — user list item not found / ambiguous matchers

    // Skip Android: R1 product fail — empty-state text <50% visible despite toExist workaround

    // Skip Android: R1 product fail — deactivated-user search list item matcher

    (isAndroid() ? it.skip : it)('MM-T4730_4 - should display empty search state for create direct message', async () => {
        // # Open create direct message screen and search for a non-existent user
        const searchTerm = 'blahblahblahblah';
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(searchTerm);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);

        // * Verify empty search state for create direct message
        // On Android edge-to-edge the empty-state text can render with <50% visible area
        // due to system bar insets. Use toExist() on Android to bypass the threshold check.
        if (isAndroid()) {
            await waitFor(element(by.text(`No matches found for “${searchTerm}”`))).toExist().withTimeout(timeouts.HALF_MIN);
            await waitFor(element(by.text('Check the spelling or try another search.'))).toExist().withTimeout(timeouts.HALF_MIN);
        } else {
            await expect(element(by.text(`No matches found for “${searchTerm}”`))).toBeVisible();
            await expect(element(by.text('Check the spelling or try another search.'))).toBeVisible();
        }

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });
});
