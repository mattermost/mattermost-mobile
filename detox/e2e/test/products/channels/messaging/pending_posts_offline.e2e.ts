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
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {goOffline, goOnline, isNetworkControlAvailable, timeouts} from '@support/utils';
import {by, element, expect, waitFor} from 'detox';

// A genuine offline simulation needs the app's requests to actually fail, in a way
// that is local to the device under test — see support/utils/network.ts for the
// mechanism (Android: emulator airplane mode; iOS: a pfctl anchor scoped to the
// test server's resolved IPs, requiring non-interactive sudo as GitHub's macOS
// runners provide). When neither is available the suite skips loudly — the
// platform-skip pattern from classification_banner_across_screens.e2e.ts — rather
// than passing green on a simulation that silently does nothing. The skip reason is
// printed at runtime by isNetworkControlAvailable().
(isNetworkControlAvailable(serverOneUrl) ? describe : describe.skip)('Messaging - Pending Posts Offline', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    afterAll(async () => {
        // # Restore network and log out — goOnline polls until connectivity is
        // verified, so a failure mid-test cannot leave the host blocked.
        await goOnline(serverOneUrl);
        await HomeScreen.logout();
    });

    it('MM-T416 - should fail to post without network and re-send after network is restored', async () => {
        const message = `offline post ${Date.now()}`;

        // # Disable the network to simulate offline (verified unreachable by the
        // harness before proceeding — a silent block failure throws here)
        await goOffline(serverOneUrl);

        // # Compose and send a message while offline
        await ChannelScreen.composePostDraft(message);
        await ChannelScreen.tapSendButton();

        // * Verify the post failed (failed indicator appears)
        const failedButton = element(by.id('post.failed.button'));
        await waitFor(failedButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Restore network access (harness polls until the server is reachable)
        await goOnline(serverOneUrl);

        // # Tap the failed indicator and re-send the post
        await failedButton.tap();
        const retryOption = element(by.id('post.failed.retry'));
        await waitFor(retryOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await retryOption.tap();

        // # Dismiss the keyboard — on iOS it stays up after re-sending and covers
        // the bottom of the post list where the re-sent post renders.
        await ChannelScreen.dismissKeyboard();

        // * Verify the post is sent (message appears and failed indicator is gone)
        await waitFor(element(by.text(message))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(failedButton).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.text(message))).toBeVisible();
    });
});
