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

describe('Server Login - Custom Terms of Service', () => {
    const serverOneDisplayName = 'Server 1';
    const tosText = 'E2E Custom Terms of Service — accept to continue.';
    let testUser: any;

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);
        await System.apiRequireLicenseForFeature(siteOneUrl, 'CustomTermsOfService');

        const {terms, error: createError} = await TermsOfService.apiCreateTermsOfService(siteOneUrl, tosText);
        if (createError || !terms?.id) {
            throw new Error(`Failed to create custom ToS: ${JSON.stringify(createError || terms)}`);
        }

        const {error: enableError} = await TermsOfService.apiEnableCustomTermsOfService(siteOneUrl);
        if (enableError) {
            throw new Error(`Failed to enable custom ToS: ${JSON.stringify(enableError)}`);
        }

        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;
    });

    afterAll(async () => {
        try {
            await User.apiAdminLogin(siteOneUrl);
            await TermsOfService.apiDisableCustomTermsOfService(siteOneUrl);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('[custom_terms_of_service] failed to disable ToS after suite:', error);
        }
    });

    it('MM-T1194 - should log in after accepting custom terms of service', async () => {
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

    it('MM-T1193 - should return to server screen after declining custom terms of service', async () => {
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
