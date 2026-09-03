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

// A genuine offline simulation needs the app's requests to actually fail, in a way
// that is local to the device under test: CI runners are shared (other test workers
// may run in parallel) and must not have their network touched.
// - Android: airplane mode via adb is emulator-local and works on CI's Ubuntu runners.
// - iOS: the simulator shares the host network and has no per-simulator connectivity
//   control, so the only genuine mechanism is powering off the host's Wi-Fi device —
//   which is only safe on a dedicated local machine. macOS CI runners have no Wi-Fi,
//   and toggling the host network would break parallel workers, so the suite skips
//   on iOS when no Wi-Fi device is available (same platform-skip pattern as
//   classification_banner_across_screens.e2e.ts).
//   Detox's `device.setURLBlacklist` is NOT a substitute on iOS: it does not fail
//   the app's requests (they hang and eventually complete — verified empirically),
//   so the post is never marked failed.
const resolveWifiDevice = (): string => {
    try {
        const ports = execSync('networksetup -listallhardwareports').toString();
        const match = ports.match(/Hardware Port: Wi-Fi[\s\S]*?Device: (\S+)/);
        return match?.[1] ?? '';
    } catch {
        return '';
    }
};

// Airplane-mode equivalent for iOS local runs: power off the Mac's Wi-Fi device.
// Detox<->app sync runs on loopback and is unaffected.
const setHostWifi = (offline: boolean) => {
    const wifiDevice = resolveWifiDevice();
    if (!wifiDevice) {
        throw new Error('no Wi-Fi device available to simulate offline on iOS');
    }
    execSync(`networksetup -setairportpower ${wifiDevice} ${offline ? 'off' : 'on'}`);
};

const canGoOffline = (): boolean => device.getPlatform() === 'android' || Boolean(resolveWifiDevice());

// Wi-Fi reassociation after powering the device back on can take several seconds,
// which races the re-send step: the retry request fires while the network is still
// down, fails, and the post is marked failed again. Poll for genuine connectivity
// to the server before proceeding.
const waitForHostConnectivity = async (baseUrl: string, timeoutMs: number) => {
    const {hostname} = new URL(baseUrl);
    const deadline = Date.now() + timeoutMs;
    /* eslint-disable no-await-in-loop -- poll until connectivity or deadline */
    while (Date.now() < deadline) {
        try {
            execSync(`ping -c 1 -t 2 ${hostname}`, {stdio: 'pipe'});
            return true;
        } catch {
            // Still offline — keep polling.
        }
        await wait(timeouts.ONE_SEC);
    }
    /* eslint-enable no-await-in-loop */
    return false;
};

const setOffline = async (offline: boolean) => {
    // The dropped WebSocket keeps reconnecting and would otherwise keep Detox's
    // synchronization busy forever. Disable sync while offline on both platforms.
    if (offline) {
        await device.disableSynchronization();
    }

    if (device.getPlatform() === 'android') {
        execSync(`adb shell cmd connectivity airplane-mode ${offline ? 'enable' : 'disable'}`);
    } else {
        setHostWifi(offline);
    }

    // Give the OS a moment to tear down / re-establish the network before proceeding.
    await wait(timeouts.TWO_SEC);
    if (!offline) {
        if (device.getPlatform() !== 'android') {
            // Wait for Wi-Fi reassociation; proceeding early races the re-send step.
            await waitForHostConnectivity(siteOneUrl, timeouts.HALF_MIN);
        }
        await device.enableSynchronization();
    }
};

(canGoOffline() ? describe : describe.skip)('Messaging - Pending Posts Offline', () => {
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

        // # Dismiss the keyboard — on iOS it stays up after re-sending and covers
        // the bottom of the post list where the re-sent post renders.
        await ChannelScreen.dismissKeyboard();

        // * Verify the post is sent (message appears and failed indicator is gone)
        await waitFor(element(by.text(message))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(failedButton).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.text(message))).toBeVisible();
    });
});
