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

describe('Channels - Channel List', () => {

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

    it('MM-T4728_5 - should be able to go to create direct message screen', async () => {
        // # Open create direct message screen using the page object which handles
        // Android synchronization correctly (disables sync before the navigation tap).
        await CreateDirectMessageScreen.open();

        // * Verify on create direct message screen
        await CreateDirectMessageScreen.toBeVisible();

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });
});
