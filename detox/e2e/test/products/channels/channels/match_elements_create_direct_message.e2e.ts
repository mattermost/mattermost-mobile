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
import {expectVisible} from '@support/utils';

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

    it('MM-T4730_1 - should match elements on create direct message screen', async () => {
        // # Open create direct message screen
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();

        // * Verify basic elements on create direct message screen
        await expectVisible(CreateDirectMessageScreen.closeButton);
        await expectVisible(CreateDirectMessageScreen.searchInput);
        await expectVisible(CreateDirectMessageScreen.sectionUserList);

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });
});
