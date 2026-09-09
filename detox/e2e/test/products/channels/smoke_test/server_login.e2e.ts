// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
    serverTwoUrl,
    siteTwoUrl,
    hasSecondServer,
} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerListScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

const itWithSecondServer = hasSecondServer ? it : it.skip;

describe('Smoke Test - Server Login', () => {
    const serverOneDisplayName = 'Server 1';
    const serverTwoDisplayName = 'Server 2';

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout(serverOneDisplayName);
    });

    it('MM-T4675_1 - should be able to connect to a server, log in, and show channel list screen', async () => {
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

    itWithSecondServer('MM-T4675_2 - should be able to add a new server and log-in-to/log-out-from the new server', async () => {
        // # Open server list screen
        await ServerListScreen.open();
        await ServerListScreen.closeTutorial();

        // * Verify on server list screen
        await ServerListScreen.toBeVisible();

        // # Add a second server and log in to the second server
        const {error: adminLoginError} = await User.apiAdminLogin(siteTwoUrl);
        if (adminLoginError) {
            throw new Error('MM-T4675_2: Site 2 admin login failed');
        }
        const {user} = await Setup.apiInit(siteTwoUrl);

        // tapAddServerButton, not a bare tap: the multi-server tutorial's full-screen
        // backdrop SVG can intercept the hit-test at the button
        await ServerListScreen.tapAddServerButton();
        await wait(timeouts.TWO_SEC);
        await waitFor(ServerScreen.headerTitleAddServer).toExist().withTimeout(timeouts.HALF_MIN);
        await ServerScreen.connectToServer(serverTwoUrl, serverTwoDisplayName);

        // login() retries via reload + reconnect to Server 1, which overruns the
        // 300s Jest timeout on this add-server path. Stay on the current form.
        await LoginScreen.loginWithRetryIfStuck(user);

        // * Verify on channel list screen of the second server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverTwoDisplayName);

        // # Go back to first server, open server list screen, swipe left on second server and tap on logout option
        await ServerListScreen.open();
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverOneDisplayName), timeouts.TEN_SEC);
        await ServerListScreen.switchToServer(serverOneDisplayName);
        await ServerListScreen.open();
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverTwoDisplayName), timeouts.TEN_SEC);
        await ServerListScreen.swipeRevealAndTapOption(
            serverTwoDisplayName,
            ServerListScreen.getServerItemLogoutOption(serverTwoDisplayName),
        );

        // * Verify logout server alert is displayed
        await waitForElementToBeVisible(Alert.logoutTitle(serverTwoDisplayName), timeouts.TEN_SEC);

        // # Tap on logout button
        await waitForElementToBeVisible(Alert.logoutButton, timeouts.TEN_SEC);
        await Alert.logoutButton.tap();
        await wait(timeouts.FOUR_SEC);

        // * Verify second server is logged out
        await ServerListScreen.swipeRevealOption(
            serverTwoDisplayName,
            ServerListScreen.getServerItemLoginOption(serverTwoDisplayName),
        );

        // # Go back to first server
        await ServerListScreen.switchToServer(serverOneDisplayName);
    });
});
