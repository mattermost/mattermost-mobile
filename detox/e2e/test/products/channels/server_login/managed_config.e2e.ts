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
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {
    clearIosManagedConfig,
    isManagedConfigControlAvailable,
    readIosManagedConfig,
    setIosManagedConfig,
    timeouts,
} from '@support/utils';
import {device, expect, waitFor} from 'detox';

// MM-T2940 covers the settings an MDM pushes to an enrolled iOS device. Enrollment and
// app wrapping need a real device, but the app reads the payload from
// UserDefaults["com.apple.configuration.managed"], which the simulator can be seeded with
// (support/utils/managed_config.ts). What is asserted here is the config-enforcement
// layer: serverUrl / serverName / username pre-fill and allowOtherServers autoconnect.
// Android is skipped loudly — app restrictions need a DPC the emulator does not carry.
(isManagedConfigControlAvailable() ? describe : describe.skip)('Server Login - EMM Managed Configuration', () => {
    const managedServerName = 'Managed Server';
    let testUser: any;

    const relaunch = async () => {
        await device.launchApp({
            newInstance: true,
            permissions: {notifications: 'YES'},
        });
    };

    const applyManagedConfigAndRelaunch = async (allowOtherServers: 'true' | 'false') => {
        // # Write the payload with the app stopped so the next launch reads it cold
        await device.terminateApp();
        setIosManagedConfig({
            serverUrl: serverOneUrl,
            serverName: managedServerName,
            username: testUser.newUser.username,
            allowOtherServers,
            vendor: 'E2E MDM',
        });
        const written = readIosManagedConfig();
        if (!written.includes(managedServerName)) {
            throw new Error(`Managed configuration was not written to the simulator: ${written || '<empty>'}`);
        }
        await relaunch();
    };

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;
    });

    afterAll(async () => {
        // # Remove the payload and relaunch so later suites start unmanaged
        try {
            await HomeScreen.logout();
        } catch {
            // Suite may have ended before a session existed.
        } finally {
            await device.terminateApp();
            clearIosManagedConfig();
            await relaunch();
            await ServerScreen.toBeVisible();
        }
    });

    it('MM-T2940_1 - should pre-fill the managed server and username and log in', async () => {
        // # Launch with a managed server that still allows other servers
        await applyManagedConfigAndRelaunch('true');

        // * Verify the server form is pre-filled from the managed configuration
        await ServerScreen.toBeVisible();
        await expect(ServerScreen.serverUrlInput).toHaveText(serverOneUrl);
        await expect(ServerScreen.serverDisplayNameInput).toHaveText(managedServerName);

        // # Connect with the pre-filled values
        await ServerScreen.tapConnectButton();

        // * Verify the login form pre-fills the managed username
        await LoginScreen.toBeVisible();
        await waitFor(LoginScreen.usernameInput).toHaveText(testUser.newUser.username).withTimeout(timeouts.TEN_SEC);

        // # Log in with the managed user
        await LoginScreen.login(testUser);

        // * Verify on channel list screen. The header's server name is not asserted: when the
        // URL is already registered on the device (every other suite in the shard connects to
        // it as "Server 1") the app reuses the stored name, so the managed serverName is only
        // observable on the pre-filled form above.
        await ChannelListScreen.toBeVisible();

        // # Log out (the managed server stays pre-filled for the next case)
        await HomeScreen.logout();
    });

    it('MM-T2940_2 - should auto-connect to the managed server when other servers are not allowed', async () => {
        // # Launch with allowOtherServers=false — the app connects on its own
        await applyManagedConfigAndRelaunch('false');

        // * Verify the login form is reached without touching the server form
        await LoginScreen.toBeVisible();
        await waitFor(LoginScreen.usernameInput).toHaveText(testUser.newUser.username).withTimeout(timeouts.TEN_SEC);

        // # Log in with the managed user
        await LoginScreen.login(testUser);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });
});
