// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Server Login - Server URL Path Fallback', () => {
    const {
        connectButton,
        serverDisplayNameInput,
        serverUrlInput,
    } = ServerScreen;

    beforeEach(async () => {
        // * Verify on server screen
        await ServerScreen.toBeVisible();

        // # Clear fields
        await expect(serverUrlInput).toBeVisible();
        await expect(serverDisplayNameInput).toBeVisible();
        await serverUrlInput.clearText();
        await serverDisplayNameInput.clearText();
    });

    afterEach(async () => {
        // # Navigate back to server screen if the connect attempt succeeded
        let onLoginScreen = true;
        try {
            await LoginScreen.toBeVisible();
        } catch (error) {
            // Not on login screen, no need to navigate back
            onLoginScreen = false;
        }
        if (onLoginScreen) {
            await LoginScreen.back();
            await ServerScreen.toBeVisible();
        }
    });

    it('MM-67557_1 - should connect using a full path URL by falling back to the server base URL', async () => {
        // # Enter a full channel URL, as if pasted from a browser, instead of the server base URL
        const {team, channel} = await Setup.apiInit(siteOneUrl);
        const fullPathUrl = `${serverOneUrl}/${team.name}/channels/${channel.name}`;
        await serverUrlInput.replaceText(fullPathUrl);
        await serverDisplayNameInput.replaceText('Server 1');
        await connectButton.tap();
        await wait(timeouts.ONE_SEC);

        if (isIos() && !process.env.CI) {
            // # Tap alert okay button (may not appear if server has push notifications configured)
            let alertPresent = true;
            try {
                await waitFor(Alert.okayButton).toExist().withTimeout(timeouts.TEN_SEC);
            } catch {
                // Alert did not appear — server has push notifications configured
                alertPresent = false;
            }
            if (alertPresent) {
                await Alert.okayButton.tap();
            }
        }

        // * Verify the connection falls back to the server base URL and reaches the login screen,
        // instead of showing a DiagnosticId or connection error on the server screen
        await LoginScreen.toBeVisible();
    });
});
