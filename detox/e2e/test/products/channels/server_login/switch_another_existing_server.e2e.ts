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
    hasThreeDistinctServers,
} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ServerListScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect} from 'detox';

const itWithThreeServers = hasThreeDistinctServers ? it : it.skip;

describe('Server Login - Server List', () => {

    const serverOneDisplayName = 'Server 1';
    const serverThreeDisplayName = 'Server 3';
    let serverOneUser: any;

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

    itWithThreeServers('MM-T4691_3 - should be able to switch to another existing server', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen and tap on third server
        await ServerListScreen.open();
        if (isIos()) {
            await ServerListScreen.serverListTitle.swipe('up');
        } else if (isAndroid()) {
            await waitForElementToBeVisible(ServerListScreen.serverListTitle, timeouts.TWO_SEC);
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverThreeDisplayName), timeouts.TEN_SEC);
        await ServerListScreen.getServerItemInactive(serverThreeDisplayName).atIndex(0).tap();

        // * Verify on channel list screen of the third server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverThreeDisplayName);

        // # Open server list screen and go back to first server
        await ServerListScreen.open();
        if (isIos()) {
            await ServerListScreen.serverListTitle.swipe('up');
        } else if (isAndroid()) {
            await waitForElementToBeVisible(ServerListScreen.serverListTitle, timeouts.TWO_SEC);
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverOneDisplayName), timeouts.TEN_SEC);
        await ServerListScreen.getServerItemInactive(serverOneDisplayName).atIndex(0).tap();
    });
});
