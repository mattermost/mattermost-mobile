// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    User,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    serverTwoUrl,
    serverThreeUrl,
    siteOneUrl,
    siteTwoUrl,
    siteThreeUrl,
    hasThreeDistinctServers,
} from '@support/test_config';
import {
    Alert,
} from '@support/ui/component';
import {
    ChannelListScreen,
    EditServerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ServerListScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect} from 'detox';

const itWithThreeServers = hasThreeDistinctServers ? it : it.skip;

describe('Server Login - Server List', () => {

    const serverOneDisplayName = 'Server 1';
    const serverTwoDisplayName = 'Server 2';
    const serverThreeDisplayName = 'Server 3';
    let serverOneUser: any;
    let serverTwoUser: any;
    let serverThreeUser: any;

    beforeAll(async () => {
        // # Log in to the first server
        ({user: serverOneUser} = await Setup.apiInit(siteOneUrl));
        await waitForElementToBeVisible(ServerScreen.headerTitleConnectToServer, timeouts.HALF_MIN);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(serverOneUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    // Skip iOS: CI run 30000635898 — swipe action Remove does not become reliably hittable.

    // Skip iOS: CI run 30000635898 — revealed Logout action remains unhittable.

    // Skip iOS: CI run 30000635898 — server-list Add Server action remains unhittable after scrolling.

    it('MM-T4691_1 - should match elements on server list screen', async () => {
        // # Open server list screen
        await ServerListScreen.open();
        await ServerListScreen.closeTutorial();

        // * Verify basic elements on server list screen
        await expect(ServerListScreen.serverListTitle).toHaveText('Your servers');
        await expect(ServerListScreen.getServerItemActive(serverOneDisplayName)).toBeVisible();
        await expect(ServerListScreen.addServerButton).toBeVisible();

        // # Go back to channel list screen
        await ServerListScreen.getServerItemActive(serverOneDisplayName).atIndex(0).tap();
    });
});
