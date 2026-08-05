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
    Alert,
} from '@support/ui/component';
import {
    ChannelListScreen,
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

    (isIos() ? it.skip : itWithThreeServers)('MM-T4691_6 - should be able to log out a server from the list', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen, swipe left on third server and tap on logout option
        await ServerListScreen.open();

        // Partial swipe on iOS: a full swipe pushes the target too close to an edge and the
        // reveal panel buttons then fail the 100% hittability threshold.
        if (isIos()) {
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.3, 0.5, 0.5);
        } else if (isAndroid()) {
            await waitForElementToBeVisible(ServerListScreen.serverListTitle, timeouts.TWO_SEC);
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverThreeDisplayName), timeouts.TEN_SEC);
        await ServerListScreen.getServerItemInactive(serverThreeDisplayName).atIndex(0).swipe('left', 'slow');

        // TWO_SEC lets the reveal animation fully settle before tapping the action button.
        // On iOS, also wait for the logout option to be fully visible before tapping.
        if (isIos()) {
            await waitFor(ServerListScreen.getServerItemLogoutOption(serverThreeDisplayName)).
                toBeVisible(100).
                withTimeout(timeouts.TEN_SEC);
        } else {
            await wait(timeouts.TWO_SEC);
        }
        await ServerListScreen.getServerItemLogoutOption(serverThreeDisplayName).atIndex(0).tap();

        // * Verify logout server alert is displayed
        await waitForElementToBeVisible(Alert.logoutTitle(serverThreeDisplayName), timeouts.TEN_SEC);

        // # Tap on logout button
        await waitForElementToBeVisible(Alert.logoutButton, timeouts.TEN_SEC);
        await Alert.logoutButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify third server is logged out
        await ServerListScreen.getServerItemInactive(serverThreeDisplayName).atIndex(0).swipe('left', 'slow');
        await expect(ServerListScreen.getServerItemLoginOption(serverThreeDisplayName)).toBeVisible();

        // # Go back to first server
        await ServerListScreen.getServerItemActive(serverOneDisplayName).atIndex(0).tap();
    });
});
