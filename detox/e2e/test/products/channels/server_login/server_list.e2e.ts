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
    EditServerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ServerListScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';
import {expect} from 'detox';

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

    it('MM-T4691_2 - should be able to add and log in to new servers', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen
        await ServerListScreen.open();
        if (isIos()) {
            await ServerListScreen.serverListScreen.swipe('up');
        } else if (isAndroid()) {
            // Pixel 8 API 35 uses gesture nav; a default swipe('up') on the
            // full-screen bottom sheet starts in the system home-gesture hot
            // zone and backgrounds the app. Use explicit coords with startY
            // mid-screen to stay clear of the edge.
            await ServerListScreen.serverListScreen.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }

        // * Verify first server is active
        await waitForElementToExist(ServerListScreen.getServerItemActive(serverOneDisplayName), timeouts.TEN_SEC);

        // # Add a second server and log in to the second server
        await User.apiAdminLogin(siteTwoUrl);
        ({user: serverTwoUser} = await Setup.apiInit(siteTwoUrl));
        await wait(timeouts.TWO_SEC);
        await ServerListScreen.addServerButton.tap();
        await waitForElementToExist(ServerScreen.headerTitleAddServer, timeouts.TEN_SEC);
        await ServerScreen.connectToServer(serverTwoUrl, serverTwoDisplayName);
        await LoginScreen.login(serverTwoUser);

        // * Verify on channel list screen of the second server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverTwoDisplayName);

        // # Open server list screen
        await ServerListScreen.open();
        if (isIos()) {
            await ServerListScreen.serverListTitle.swipe('up');
        } else if (isAndroid()) {
            await waitForElementToBeVisible(ServerListScreen.serverListTitle, timeouts.TWO_SEC);
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }

        // * Verify second server is active and first server is inactive
        await waitForElementToExist(ServerListScreen.getServerItemActive(serverTwoDisplayName), timeouts.TEN_SEC);
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverOneDisplayName), timeouts.TEN_SEC);

        // # Add a third server and log in to the third server
        await User.apiAdminLogin(siteThreeUrl);
        ({user: serverThreeUser} = await Setup.apiInit(siteThreeUrl));
        await wait(timeouts.TWO_SEC);
        await ServerListScreen.addServerButton.tap();
        await waitForElementToExist(ServerScreen.headerTitleAddServer, timeouts.TEN_SEC);
        await ServerScreen.connectToServer(serverThreeUrl, serverThreeDisplayName);
        await LoginScreen.login(serverThreeUser);

        // * Verify on channel list screen of the third server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverThreeDisplayName);

        // # Open server list screen
        await ServerListScreen.open();
        await wait(timeouts.TWO_SEC);
        if (isIos()) {
            await ServerListScreen.serverListTitle.swipe('up');
        } else if (isAndroid()) {
            await waitForElementToBeVisible(ServerListScreen.serverListTitle, timeouts.TWO_SEC);
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }

        // * Verify third server is active, and first and second servers are inactive
        await waitForElementToExist(ServerListScreen.getServerItemActive(serverThreeDisplayName), timeouts.TEN_SEC);
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverOneDisplayName), timeouts.TEN_SEC);
        await waitForElementToExist(ServerListScreen.getServerItemInactive(serverTwoDisplayName), timeouts.TEN_SEC);

        // # Go back to first server
        await ServerListScreen.getServerItemInactive(serverOneDisplayName).atIndex(0).tap();
    });

    it('MM-T4691_3 - should be able to switch to another existing server', async () => {
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

    it('MM-T4691_4 - should be able to edit server display name of active and inactive servers', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen, swipe left on first server and tap on edit option
        await ServerListScreen.open();
        if (isIos()) {
            await ServerListScreen.serverListTitle.swipe('up');
        } else if (isAndroid()) {
            await waitForElementToBeVisible(ServerListScreen.serverListTitle, timeouts.TWO_SEC);
            await ServerListScreen.serverListTitle.swipe('up', 'fast', 0.1, 0.5, 0.3);
        }
        await waitForElementToExist(ServerListScreen.getServerItemActive(serverOneDisplayName), timeouts.TEN_SEC);
        await ServerListScreen.getServerItemActive(serverOneDisplayName).atIndex(0).swipe('left', 'slow');
        await wait(timeouts.ONE_SEC);

        // .atIndex(0): the Swipeable's revealed Edit option can render twice
        // briefly on iOS during the swipe-pan animation (CI run 26368981355,
        // MM-T4691_4: "Multiple elements found"). All sibling taps in this
        // file already use .atIndex(0).
        await ServerListScreen.getServerItemEditOption(serverOneDisplayName).atIndex(0).tap();

        // * Verify on edit server screen
        await EditServerScreen.toBeVisible();

        // # Enter the same first server display name
        await EditServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);

        // # Enter a new first server display name
        const newServerOneDisplayName = `${serverOneDisplayName} new`;
        await EditServerScreen.serverDisplayNameInput.replaceText(newServerOneDisplayName);

        // * Verify save button is enabled
        await expect(EditServerScreen.saveButton).toBeVisible();

        // # Tap on save button
        await EditServerScreen.saveButton.tap();

        // * Verify the new first server display name
        await expect(ServerListScreen.getServerItemActive(newServerOneDisplayName)).toBeVisible();

        // # Revert back to original first server display name and go back to first server
        await ServerListScreen.getServerItemActive(newServerOneDisplayName).atIndex(0).swipe('left', 'slow');
        await wait(timeouts.ONE_SEC);

        // .atIndex(0) for the same reason as the first tap above.
        await ServerListScreen.getServerItemEditOption(newServerOneDisplayName).atIndex(0).tap();
        await EditServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);
        await EditServerScreen.saveButton.tap();
        await ServerListScreen.getServerItemActive(serverOneDisplayName).atIndex(0).tap();
    });

});
