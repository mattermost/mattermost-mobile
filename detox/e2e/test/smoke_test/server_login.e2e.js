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
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';

describe('Server Login', () => {
    const serverOneDisplayName = 'Server 1';

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout(serverOneDisplayName);
    });

    it('MM-T4675 - should be able to connect to a server, log in, and show channel list screen', async () => {
        // * Verify on server screen
        await ServerScreen.toBeVisible();

        // # Connect to server with valid server url and non-empty server display name
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);

        // * Verify on login screen
        await LoginScreen.toBeVisible();

        // # Log in to server with correct credentials
        const {team, user} = await Setup.apiInit(siteOneUrl);
        await LoginScreen.login(user);

        // * Verify on channel list screen and channel list header shows team display name and server display name
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(team.display_name);
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);
    });
});
