// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {execSync} from 'child_process';

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

// `device.setURLBlacklist` only disables Detox's network *synchronization*; it does
// not block the actual requests (see wix/Detox#1817). To genuinely simulate offline we
// toggle airplane mode on Android. iOS has no simctl airplane-mode equivalent, so it
// falls back to the blacklist (which is still a no-op for blocking, but keeps the test
// from hanging on in-flight requests).
const setOffline = async (offline: boolean) => {
    if (device.getPlatform() === 'android') {
        // Airplane mode drops the app's WebSocket, which keeps reconnecting and would
        // otherwise keep Detox's synchronization busy forever. Disable sync while offline.
        if (offline) {
            await device.disableSynchronization();
        }
        execSync(`adb shell cmd connectivity airplane-mode ${offline ? 'enable' : 'disable'}`);
        // Give the OS a moment to tear down / re-establish the network before proceeding.
        await wait(timeouts.TWO_SEC);
        if (!offline) {
            await device.enableSynchronization();
        }
        return;
    }

    await device.setURLBlacklist(offline ? ['.*'] : []);
};

describe('Messaging - Pending Posts Offline', () => {
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
        // # Restore network and log out
        await setOffline(false);
        await HomeScreen.logout();
    });

    it('MM-T416 - should fail to post without network and re-send after network is restored', async () => {
        const message = `offline post ${Date.now()}`;

        // # Disable the network to simulate offline
        await setOffline(true);

        // # Compose and send a message while offline
        await ChannelScreen.composePostDraft(message);
        await ChannelScreen.tapSendButton();

        // * Verify the post failed (failed indicator appears)
        const failedButton = element(by.id('post.failed.button'));
        await waitFor(failedButton).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Restore network access
        await setOffline(false);
        await wait(timeouts.ONE_SEC);

        // # Tap the failed indicator and re-send the post
        await failedButton.tap();
        const retryOption = element(by.id('post.failed.retry'));
        await waitFor(retryOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await retryOption.tap();

        // * Verify the post is sent (message appears and failed indicator is gone)
        await waitFor(element(by.text(message))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(failedButton).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.text(message))).toBeVisible();
    });
});
