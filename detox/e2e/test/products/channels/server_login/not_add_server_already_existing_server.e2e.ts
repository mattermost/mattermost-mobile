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
    serverTwoUrl,
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
    const serverTwoDisplayName = 'Server 2';
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

    (isIos() ? it.skip : itWithThreeServers)('MM-T4691_7 - should not be able to add server for an already existing server', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen, attempt to add a server already logged in and with inactive session
        await ServerListScreen.open();

        // Use a partial swipe on iOS to scroll the list without over-shooting.
        if (isIos()) {
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.3, 0.5, 0.5);
        } else if (isAndroid()) {
            await waitForElementToBeVisible(ServerListScreen.serverListTitle, timeouts.TWO_SEC);
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }
        await ServerListScreen.addServerButton.tap();
        await waitForElementToExist(ServerScreen.headerTitleAddServer, timeouts.TEN_SEC);
        await ServerScreen.serverUrlInput.replaceText(serverTwoUrl);
        if (isAndroid()) {
            await ServerScreen.serverUrlInput.tapReturnKey();
        }
        await ServerScreen.serverDisplayNameInput.replaceText(serverTwoDisplayName);
        if (isAndroid()) {
            await ServerScreen.serverDisplayNameInput.tapReturnKey();
        }

        if (isIos()) {
            await ServerScreen.tapConnectButton();
        }

        // * Verify same name server error
        const sameNameServerError = 'You are using this name for another server.';
        await expect(ServerScreen.serverDisplayNameInputError).toHaveText(sameNameServerError);

        // # Attempt to add a server already logged in and with active session, with the same server display name
        await ServerScreen.serverUrlInput.replaceText(serverOneUrl);
        if (isAndroid()) {
            await ServerScreen.serverUrlInput.tapReturnKey();
        }
        await ServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);
        if (isAndroid()) {
            await ServerScreen.serverDisplayNameInput.tapReturnKey();
        }

        if (isIos()) {
            await ServerScreen.tapConnectButton();
        }

        // * Verify same name server error
        await expect(ServerScreen.serverDisplayNameInputError).toHaveText(sameNameServerError);

        // # Close server screen, open server list screen, log out of second server, and go back to first server
        await ServerScreen.close();
        await ServerListScreen.open();

        // Partial swipe on iOS: a full swipe pushes the target too close to an edge and the
        // reveal panel buttons then fail the 100% hittability threshold.
        if (isIos()) {
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.3, 0.5, 0.5);
        } else if (isAndroid()) {
            await waitForElementToBeVisible(ServerListScreen.serverListTitle, timeouts.TWO_SEC);
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverTwoDisplayName), timeouts.TEN_SEC);
        await ServerListScreen.getServerItemInactive(serverTwoDisplayName).atIndex(0).swipe('left', 'slow');

        // TWO_SEC lets the reveal animation fully settle before tapping the action button.
        // On iOS, also wait for the logout option to be fully visible before tapping.
        if (isIos()) {
            await waitFor(ServerListScreen.getServerItemLogoutOption(serverTwoDisplayName)).
                toBeVisible(100).
                withTimeout(timeouts.TEN_SEC);
        } else {
            await wait(timeouts.TWO_SEC);
        }
        await ServerListScreen.getServerItemLogoutOption(serverTwoDisplayName).atIndex(0).tap();
        await wait(timeouts.FOUR_SEC);
        await waitForElementToBeVisible(Alert.logoutButton, timeouts.HALF_MIN);
        await Alert.logoutButton.tap();
        await wait(timeouts.TWO_SEC);
        await ServerListScreen.getServerItemActive(serverOneDisplayName).atIndex(0).tap();
    });
});
