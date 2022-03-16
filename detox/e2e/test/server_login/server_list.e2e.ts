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
} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ServerListScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Server Login - Server List', () => {
    const serverOneDisplayName = 'Server 1';
    const serverTwoDisplayName = 'Server 2';
    const serverThreeDisplayName = 'Server 3';
    let serverOneUser;
    let serverTwoUser;
    let serverThreeUser;

    beforeAll(async () => {
        // # Log in to first server
        ({user: serverOneUser} = await Setup.apiInit(siteOneUrl));
        await expect(ServerScreen.headerTitleConnectToServer).toBeVisible();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(serverOneUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it.only('should be able to add and log in to new servers', async () => {
        // * Verify on channel list screen of the first server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen
        await ServerListScreen.open();

        // * Verify first server is active
        await ServerListScreen.toBeVisible();
        await expect(ServerListScreen.getServerItemActive(serverOneDisplayName)).toBeVisible();

        // # Add a second server and log in to the second server
        await User.apiLogout(siteOneUrl);
        await User.apiAdminLogin(siteTwoUrl);
        ({user: serverTwoUser} = await Setup.apiInit(siteTwoUrl));
        await ServerListScreen.addServerButton.tap();
        await expect(ServerScreen.headerTitleAddServer).toBeVisible();
        await ServerScreen.connectToServer(serverTwoUrl, serverTwoDisplayName);
        await LoginScreen.login(serverTwoUser);

        // * Verify on channel list screen of the second server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverTwoDisplayName);

        // # Open server list screen
        await ServerListScreen.open();

        // * Verify second server is active and first server is inactive
        await ServerListScreen.toBeVisible();
        await expect(ServerListScreen.getServerItemActive(serverTwoDisplayName)).toBeVisible();
        await expect(ServerListScreen.getServerItemInactive(serverOneDisplayName)).toBeVisible();

        // # Add a third server and log in to the third server
        await User.apiLogout(siteTwoUrl);
        await User.apiAdminLogin(siteThreeUrl);
        ({user: serverThreeUser} = await Setup.apiInit(siteThreeUrl));
        await ServerListScreen.addServerButton.tap();
        await expect(ServerScreen.headerTitleAddServer).toBeVisible();
        await ServerScreen.connectToServer(serverThreeUrl, serverThreeDisplayName);
        await LoginScreen.login(serverThreeUser);

        // * Verify on channel list screen of the third server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverThreeDisplayName);

        // # Open server list screen
        await ServerListScreen.open();

        // * Verify third server is active, and first and second servers are inactive
        await ServerListScreen.toBeVisible();
        await expect(ServerListScreen.getServerItemActive(serverThreeDisplayName)).toBeVisible();
        await expect(ServerListScreen.getServerItemInactive(serverOneDisplayName)).toBeVisible();
        await expect(ServerListScreen.getServerItemInactive(serverTwoDisplayName)).toBeVisible();
    });

    it('should be able to switch to another existing server', async () => {
        // * Verify on channel list screen of the third server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverThreeDisplayName);

        // # Tap on first server
        await ServerListScreen.open();
        await ServerListScreen.getServerItemInactive(serverOneDisplayName).tap();

        // * Verify on channel list screen of the first server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);
    });

    it('should be able to edit server display name of active and inactive servers', async () => {
        // # Swipe left on first server and tap on edit option
        await ServerListScreen.open();
        await ServerListScreen.getServerItemActive(serverOneDisplayName).swipe('left');
        await ServerListScreen.getServerItemEditOption(serverOneDisplayName).tap();

        // * Verify on edit server name screen
        await ServerScreen.toBeVisible();
    });

    it('should be able to remove active and inactive servers', async () => {
        // # Tap on first server
        await ServerListScreen.open();
        await ServerListScreen.getServerItemInactive(serverOneDisplayName).tap();
    });

    it('should be able to log out from active and inactive servers', async () => {
        // # Tap on first server
        await ServerListScreen.open();
        await ServerListScreen.getServerItemInactive(serverOneDisplayName).tap();
    });
});
