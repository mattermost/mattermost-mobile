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
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    ServerScreen,
    TermsOfServiceScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

/**
 * Summarise a server_api error without embedding the raw response payload.
 */
const describeApiError = (error: any, status?: number): string => {
    return `status ${status ?? 'unknown'}: ${error?.message ?? error?.id ?? 'unknown error'}`;
};

describe('Server Login - Custom Terms of Service', () => {
    const serverOneDisplayName = 'Server 1';
    const tosText = 'E2E Custom Terms of Service — accept to continue.';
    let testUser: any;

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);
        await System.apiRequireLicenseForFeature(siteOneUrl, 'CustomTermsOfService');

        const {terms, error: createError, status: createStatus} = await TermsOfService.apiCreateTermsOfService(siteOneUrl, tosText);
        if (createError || !terms?.id) {
            throw new Error(`Failed to create custom ToS: ${describeApiError(createError, createStatus)}`);
        }

        const {error: enableError, status: enableStatus} = await TermsOfService.apiEnableCustomTermsOfService(siteOneUrl);
        if (enableError) {
            throw new Error(`Failed to enable custom ToS: ${describeApiError(enableError, enableStatus)}`);
        }

        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;
    });

    afterAll(async () => {
        // Leaving custom ToS enabled forces every later suite on this server through
        // the modal, so a failed cleanup has to be loud rather than swallowed.
        await User.apiAdminLogin(siteOneUrl);

        const {error, status} = await TermsOfService.apiDisableCustomTermsOfService(siteOneUrl);
        if (error) {
            const reason = describeApiError(error, status);

            // eslint-disable-next-line no-console
            console.warn(`[custom_terms_of_service] failed to disable ToS after suite: ${reason}`);
            throw new Error(`Failed to disable custom ToS after suite: ${reason}`);
        }
    });

    it('MM-T1194_1 - should log in after accepting custom terms of service', async () => {
        // # Connect and log in until custom ToS is shown
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
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
        const {user: declineUser} = await Setup.apiInit(siteOneUrl);

        // # Connect and log in until custom ToS is shown
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
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
