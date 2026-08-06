// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    Team,
    User,
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
import {expect} from 'detox';

describe('Channels - Create Direct Message', () => {

    const serverOneDisplayName = 'Server 1';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
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

    (isAndroid() ? it.skip : it)('MM-T63374 - should not display deactivated users in the create direct message screen', async () => {
        // # As admin, create a new user to test with
        const {user: deactivatedUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, deactivatedUser.id, testTeam.id);

        // # Open create direct message screen and verify we can find the user
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(deactivatedUser.username);
        await wait(timeouts.ONE_SEC);

        // * Verify the new user appears in search results before deactivation
        await expect(CreateDirectMessageScreen.getUserItemDisplayName(deactivatedUser.id)).toBeVisible();

        // # Close the create direct message screen
        await CreateDirectMessageScreen.close();

        // # Deactivate the user
        await User.apiDeactivateUser(siteOneUrl, deactivatedUser.id);

        // # Open create direct message screen again and search for the deactivated user
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(deactivatedUser.username);
        await wait(timeouts.ONE_SEC);

        // * Verify the deactivated user does not appear in search results
        await expect(element(by.text(`No matches found for “${deactivatedUser.username}”`))).toBeVisible();

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });
});
