// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    ChannelListScreen,
    EditServerScreen,
    LoginScreen,
    ServerListScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait, waitForElementToBeVisible, waitForElementToExist} from '@support/utils';

describe('Server Login - Edit Server Preauth Secret', () => {
    const serverOneDisplayName = 'Server 1';
    let serverOneUser: any;

    const openEditServer = async () => {
        await ServerListScreen.open();
        await ServerListScreen.scrollServerListIntoView();
        await waitForElementToExist(ServerListScreen.getServerItemActive(serverOneDisplayName), timeouts.TEN_SEC);
        await ServerListScreen.getServerItemActive(serverOneDisplayName).atIndex(0).swipe('left', 'slow');
        await wait(timeouts.ONE_SEC);
        await ServerListScreen.getServerItemEditOption(serverOneDisplayName).atIndex(0).tap();
        await EditServerScreen.toBeVisible();
    };

    const returnToChannelList = async () => {
        await waitForElementToExist(ServerListScreen.getServerItemActive(serverOneDisplayName), timeouts.TWENTY_SEC);
        await ServerListScreen.scrollServerItemIntoView(ServerListScreen.getServerItemActive(serverOneDisplayName).atIndex(0));
        await ServerListScreen.getServerItemActive(serverOneDisplayName).atIndex(0).tap();
        await ChannelListScreen.toBeVisible();
    };

    beforeAll(async () => {
        ({user: serverOneUser} = await Setup.apiInit(siteOneUrl));
        await waitForElementToBeVisible(ServerScreen.headerTitleConnectToServer, timeouts.HALF_MIN);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(serverOneUser);

        // Burn the one-time "Swipe left on a server" coaching overlay here, so it cannot
        // cover the sheet mid-test. closeTutorial is the platform-correct dismissal.
        await ChannelListScreen.toBeVisible();
        await ServerListScreen.open();
        await ServerListScreen.closeTutorial();
        await ChannelListScreen.toBeVisible();
    }, timeouts.ONE_MIN * 4);

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T5000_4 - should survive changing the pre-auth secret on a connected server', async () => {
        // Changing the secret rebuilds the REST and WebSocket clients. Tearing the native session
        // down while requests were in flight used to abort the process, so the assertion that
        // matters here is simply that the app is still alive and usable afterwards.

        // # Open edit server and set a pre-auth secret
        await openEditServer();
        await EditServerScreen.changePreauthSecret('e2e-secret-one');

        // * Verify the app survived and the server is still usable
        await returnToChannelList();
    });

    it('MM-T5000_5 - should survive replacing the pre-auth secret with a different value', async () => {
        // # Replace the secret with a different one
        await openEditServer();
        await EditServerScreen.changePreauthSecret('e2e-secret-two');

        // * Verify the app survived and the server is still usable
        await returnToChannelList();
    });

    it('MM-T5000_6 - should survive clearing the pre-auth secret', async () => {
        // # Clear the pre-auth secret
        await openEditServer();
        await EditServerScreen.changePreauthSecret('');

        // * Verify the app survived and the server is still usable.
        // Clearing must not leave the server unreachable.
        await returnToChannelList();
    });

    // NOT COVERED HERE, deliberately:
    // - Rejecting a wrong secret: the default e2e server is a plain Mattermost with no pre-auth
    //   proxy, so it ignores the header and any value validates as good.
    // - Asserting the stored value round-trips into the field: it is secureTextEntry, so the
    //   value is masked and not readable through the accessibility tree.
    // Both are covered by unit tests in app/init/credentials.test.ts and by manual verification
    // against a pre-auth-enforcing proxy; see MM-70605.
});
