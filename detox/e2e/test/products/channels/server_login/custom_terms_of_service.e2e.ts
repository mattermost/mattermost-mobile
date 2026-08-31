// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    System,
    TermsOfService,
    User,
} from '@support/server_api';
import {SITE_THREE_LOCK_TIMEOUT_MS, siteThreeLock} from '@support/site_three_lock';
import {
    hasThreeDistinctServers,
    serverThreeUrl,
    siteThreeUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    ServerScreen,
    TermsOfServiceScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

/**
 * Enabling custom ToS is server-wide and has no per-user scoping, so every login on the
 * server is forced through the modal while this suite runs. PR CI provisions only two Detox
 * servers and rotates them as SITE_1/SITE_2 across all shards, so running this against
 * SITE_1 would push a ToS modal in front of roughly half the other shards mid-run.
 *
 * It therefore runs against the dedicated third site and holds the SITE_3 lock, which
 * `server_list` also holds while it logs in to the third server — without that, this suite's
 * ToS modal would land on top of that login. iOS and Android share SITE_3, so the lock also
 * serialises the two platform jobs.
 *
 * The `hasThreeDistinctServers` gate is load-bearing: `siteThreeUrl` silently falls back to
 * `siteOneUrl` on single-server topologies, so without it a local run would quietly
 * reintroduce the blast radius this suite exists to avoid.
 */
jest.setTimeout(timeouts.ONE_MIN * 25);

/**
 * Summarise a server_api error without embedding the raw response payload.
 */
const describeApiError = (error: any, status?: number): string => {
    return `status ${status ?? 'unknown'}: ${error?.message ?? error?.id ?? 'unknown error'}`;
};

const describeOrSkip = hasThreeDistinctServers ? describe : describe.skip;

describeOrSkip('Server Login - Custom Terms of Service', () => {
    const serverDisplayName = 'Server 1';
    const tosText = 'E2E Custom Terms of Service — accept to continue.';
    let lockOwner = '';
    let lockAcquired = false;
    let testUser: any;

    beforeAll(async () => {
        lockOwner = siteThreeLock.createOwner();
        await siteThreeLock.acquire(siteThreeUrl, lockOwner, {timeoutMs: SITE_THREE_LOCK_TIMEOUT_MS});
        lockAcquired = true;

        await User.apiAdminLogin(siteThreeUrl);
        await System.apiRequireLicenseForFeature(siteThreeUrl, 'CustomTermsOfService');

        // A previous holder that was killed mid-suite (emulator crash, cancelled job) leaves
        // ToS enabled, and its afterAll never ran. Clearing it on acquire is what makes the
        // shared server self-heal rather than staying wedged for every later login.
        await TermsOfService.apiDisableCustomTermsOfService(siteThreeUrl);

        const {terms, error: createError, status: createStatus} = await TermsOfService.apiCreateTermsOfService(siteThreeUrl, tosText);
        if (createError || !terms?.id) {
            throw new Error(`Failed to create custom ToS: ${describeApiError(createError, createStatus)}`);
        }

        const {error: enableError, status: enableStatus} = await TermsOfService.apiEnableCustomTermsOfService(siteThreeUrl);
        if (enableError) {
            throw new Error(`Failed to enable custom ToS: ${describeApiError(enableError, enableStatus)}`);
        }

        // Fail here rather than 60s later as an unexplained "modal never appeared".
        await TermsOfService.apiAssertCustomTermsOfServiceActive(siteThreeUrl, terms.id);

        // Created after ToS is active, so the app fetches a config that already has it on
        // when it connects below — no reload needed to dodge a stale cached config.
        const {user} = await Setup.apiInit(siteThreeUrl);
        testUser = user;
    }, timeouts.ONE_MIN * 22);

    afterAll(async () => {
        // Never tear down shared server state we do not own.
        if (!lockAcquired) {
            return;
        }

        try {
            await User.apiAdminLogin(siteThreeUrl);

            const {error, status} = await TermsOfService.apiDisableCustomTermsOfService(siteThreeUrl);
            if (error) {
                throw new Error(`Failed to disable custom ToS after suite: ${describeApiError(error, status)}`);
            }
        } finally {
            // Releasing even when the disable failed is deliberate: holding the lock forever
            // would block every later run, and the next holder disables ToS on acquire.
            await siteThreeLock.release(siteThreeUrl, lockOwner);
        }
    });

    it('MM-T1194_1 - should log in after accepting custom terms of service', async () => {
        // # Connect and log in until custom ToS is shown
        await ServerScreen.connectToServer(serverThreeUrl, serverDisplayName);
        await TermsOfServiceScreen.loginUntilVisible(testUser);

        // * Verify Accept / Decline are available
        await expect(TermsOfServiceScreen.acceptButton).toBeVisible();
        await expect(TermsOfServiceScreen.declineButton).toBeVisible();

        // # Accept terms
        await TermsOfServiceScreen.accept();

        // * Verify user is logged in
        await expect(ChannelListScreen.channelListScreen).toExist();
        await expect(HomeScreen.channelListTab).toExist();

        // # Clean up session for the next case
        await HomeScreen.logout();
    });

    it('MM-T1193_1 - should return to server screen after declining custom terms of service', async () => {
        // Fresh user so ToS is required again (accepted user would skip the modal)
        const {user: declineUser} = await Setup.apiInit(siteThreeUrl);

        // # Connect and log in until custom ToS is shown
        await ServerScreen.connectToServer(serverThreeUrl, serverDisplayName);
        await TermsOfServiceScreen.loginUntilVisible(declineUser);

        // # Decline and confirm the logout alert
        await TermsOfServiceScreen.declineAndConfirmLogout();

        // * Verify back on server address page with no app home chrome
        await expect(ServerScreen.serverScreen).toExist();
        await expect(ServerScreen.serverUrlInput).toExist();
        await expect(HomeScreen.channelListTab).not.toExist();
        await expect(ChannelListScreen.channelListScreen).not.toExist();
    });
});
