// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {serverOneUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Server Login - Connect to Server', () => {
    const {
        connectButton,
        connectButtonDisabled,
        displayHelp,
        headerDescription,
        headerTitleConnectToServer,
        headerWelcome,
        serverDisplayNameInput,
        serverUrlInput,
        serverUrlInputError,
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

    it('MM-T4676_1 - should match elements on server screen', async () => {
        // * Verify basic elements on server screen
        await expect(headerWelcome).toHaveText('Welcome');
        await expect(headerTitleConnectToServer).toHaveText('Let’s Connect to a Server');
        await expect(headerDescription).toHaveText('A server is your team\'s communication hub accessed using a unique URL');
        await expect(serverUrlInput).toBeVisible();
        await expect(serverDisplayNameInput).toBeVisible();
        await expect(displayHelp).toHaveText('Choose a display name for your server');
        await expect(connectButtonDisabled).toBeVisible();
    });

    it('MM-T4676_2 - should show disabled connect button on empty server url or server display name', async () => {
        // # Attempt to connect with empty server url and non-empty server display name
        await serverUrlInput.replaceText('');
        await serverDisplayNameInput.replaceText('Server 1');

        // * Verify connect button is disabled
        await expect(connectButtonDisabled).toBeVisible();

        // # Attempt to connect with valid server url and empty server display name
        await serverUrlInput.replaceText(serverOneUrl);
        await serverDisplayNameInput.replaceText('');

        // * Verify connect button is disabled
        await expect(connectButtonDisabled).toBeVisible();
    });

    it('MM-T4676_3 - should show invalid url error on invalid server url', async () => {
        // # Connect with invalid server url and non-empty server display name
        const invalidServerUrl = 'invalid';
        await device.setURLBlacklist([invalidServerUrl]);
        await serverUrlInput.replaceText(invalidServerUrl);
        await serverDisplayNameInput.replaceText('Server 1');
        await connectButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify invalid url error
        await waitFor(serverUrlInputError).toExist().withTimeout(timeouts.FOUR_SEC);
        const expectedErrorText = isIos()
            ? 'URLSessionTask failed with error: A server with the specified hostname could not be found.'
            : 'Unable to resolve host "invalid": No address associated with hostname';

        await expect(serverUrlInputError).toHaveText(expectedErrorText);
    });

    it('MM-T4676_4 - should show connection error on invalid ssl or invalid host', async () => {
        // # Connect with invalid ssl and non-empty server display name
        const expiredServerUrl = 'expired.badssl.com';
        const wrongHostServerUrl = 'wrong.host.badssl.com';
        await device.setURLBlacklist([expiredServerUrl, wrongHostServerUrl]);

        await serverUrlInput.replaceText(expiredServerUrl);
        await serverDisplayNameInput.replaceText('Server 1');
        await connectButton.tap();
        await wait(timeouts.ONE_SEC);

        // * Verify invalid SSL cert error
        await waitFor(serverUrlInputError).toExist().withTimeout(timeouts.FOUR_SEC);
        await expect(serverUrlInputError).toBeVisible();
    });

    it('MM-T4676_5 - should show login screen on successful connection to server', async () => {
        // # Connect to server with valid server url and non-empty server display name
        await serverUrlInput.replaceText(serverOneUrl);
        await serverDisplayNameInput.replaceText('Server 1');
        await connectButton.tap();
        await wait(timeouts.ONE_SEC);

        if (isIos() && !process.env.CI) {
            // # Tap alert okay button
            await waitFor(Alert.okayButton).toExist().withTimeout(timeouts.TEN_SEC);
            await Alert.okayButton.tap();
        }

        // * Verify on login screen
        await LoginScreen.toBeVisible();
    });
});
