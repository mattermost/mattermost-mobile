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

    itWithThreeServers('MM-T4691_4 - should be able to edit server display name of active and inactive servers', async () => {
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
