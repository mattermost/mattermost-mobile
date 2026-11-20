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
import {canMutateServer, requireMutationServer} from '@support/server_role';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    ServerScreen,
    TermsOfServiceScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {device, expect} from 'detox';

jest.setTimeout(timeouts.ONE_MIN * 25);

/**
 * Summarise a server_api error without embedding the raw response payload.
 */
const describeApiError = (error: any, status?: number): string => {
    return `status ${status ?? 'unknown'}: ${error?.message ?? error?.id ?? 'unknown error'}`;
};

// Custom ToS puts a modal in front of every login, so this runs alone on the mutation server
// (detox/e2e/server_mutation_specs.json).
describe('Server Login - Custom Terms of Service', () => {
    const serverDisplayName = 'Server 1';
    const tosText = 'E2E Custom Terms of Service — accept to continue.';
    let testUser: any;

    beforeAll(async () => {
        requireMutationServer('custom_terms_of_service');

        await User.apiAdminLogin(siteOneUrl);
        await System.apiRequireLicenseForFeature(siteOneUrl, 'CustomTermsOfService');

        // A run killed mid-suite leaves ToS enabled; provisioning also resets it, but clear it here too.
        await TermsOfService.apiDisableCustomTermsOfService(siteOneUrl);

        const {terms, error: createError, status: createStatus} = await TermsOfService.apiCreateTermsOfService(siteOneUrl, tosText);
        if (createError || !terms?.id) {
            throw new Error(`Failed to create custom ToS: ${describeApiError(createError, createStatus)}`);
        }

        const {error: enableError, status: enableStatus} = await TermsOfService.apiEnableCustomTermsOfService(siteOneUrl);
        if (enableError) {
            throw new Error(`Failed to enable custom ToS: ${describeApiError(enableError, enableStatus)}`);
        }

        // Fail here rather than 60s later as an unexplained "modal never appeared".
        await TermsOfService.apiAssertCustomTermsOfServiceActive(siteOneUrl, terms.id);

        // Created after ToS is active, so the app fetches a config that already has it on
        // when it connects below — no reload needed to dodge a stale cached config.
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;
    });

    afterAll(async () => {
        if (!canMutateServer) {
            return;
        }

        await User.apiAdminLogin(siteOneUrl);

        const {error, status} = await TermsOfService.apiDisableCustomTermsOfService(siteOneUrl);
        if (error) {
            throw new Error(`Failed to disable custom ToS after suite: ${describeApiError(error, status)}`);
        }

        // The patch returns before the client config regenerates; wait so the next spec sees ToS off.
        await TermsOfService.apiAssertCustomTermsOfServiceInactive(siteOneUrl);
    });

    it('MM-T1193_1 - should return to server screen after declining custom terms of service', async () => {
        // Fresh user so ToS is required (the beforeAll user is reserved for accept)
        const {user: declineUser} = await Setup.apiInit(siteOneUrl);

        // # Connect and log in until custom ToS is shown
        await ServerScreen.connectToServer(serverOneUrl, serverDisplayName);
        await TermsOfServiceScreen.loginUntilVisible(declineUser);

        // # Decline and confirm the logout alert
        await TermsOfServiceScreen.declineAndConfirmLogout();

        // * Verify back on server address page with no app home chrome
        await expect(ServerScreen.serverScreen).toExist();
        await expect(ServerScreen.serverUrlInput).toExist();
        await expect(HomeScreen.channelListTab).not.toExist();
        await expect(ChannelListScreen.channelListScreen).not.toExist();
    });

    it('MM-T1194_1 - should log in after accepting custom terms of service', async () => {
        // # Connect and log in until custom ToS is shown
        await ServerScreen.connectToServer(serverOneUrl, serverDisplayName);
        await TermsOfServiceScreen.loginUntilVisible(testUser);

        // * Verify Accept / Decline are available
        await expect(TermsOfServiceScreen.acceptButton).toBeVisible();
        await expect(TermsOfServiceScreen.declineButton).toBeVisible();

        // # Accept terms
        await TermsOfServiceScreen.accept();

        // * Verify user is logged in
        await expect(ChannelListScreen.channelListScreen).toExist();
        await expect(HomeScreen.channelListTab).toExist();

        // # Relaunch the app — the accepted session is restored from disk, not
        // re-authenticated, so a re-prompt would have to come from the ToS gate
        // re-evaluating on the restored session.
        await device.launchApp({
            newInstance: true,
            ...(device.getPlatform() === 'ios' ? {permissions: {notifications: 'YES'}} : {}),
        });

        // * Verify the channel list is back and the ToS modal did not re-appear
        // for the same terms version the user just accepted.
        await ChannelListScreen.toBeVisible();
        await wait(timeouts.TWO_SEC); // ToS mounts on top of the channel list shortly after it — allow that window
        await expect(TermsOfServiceScreen.termsOfServiceScreen).not.toExist();

        // # Log out of the restored session (last case in the suite)
        await HomeScreen.logout();
    });
});
