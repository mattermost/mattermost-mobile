// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {serverOneUrl} from '@support/test_config';
import {
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Server Login - Preauth Secret Connection', () => {
    const {
        serverUrlInput,
        serverDisplayNameInput,
        advancedOptionsToggle,
        preauthSecretInput,
        preauthSecretHelp,
    } = ServerScreen;

    beforeEach(async () => {
        // * Verify on server screen
        await ServerScreen.toBeVisible();

        // # FORCE advanced options to be CLOSED (clean state)
        try {
            await waitFor(preauthSecretInput).toBeVisible().withTimeout(500);
            await ServerScreen.toggleAdvancedOptions(); // Close them
        } catch (error) {
            // Preauth field not visible, advanced options already closed - good!
        }

        // # Clear all fields
        await expect(serverUrlInput).toBeVisible();
        await expect(serverDisplayNameInput).toBeVisible();
        await serverUrlInput.clearText();
        await serverDisplayNameInput.clearText();
    });

    afterEach(async () => {
        // # Navigate back to server screen if we ended up on login screen
        try {
            await LoginScreen.toBeVisible();
            await LoginScreen.back();
            await ServerScreen.toBeVisible();
        } catch (error) {
            // Not on login screen, no need to navigate back
        }
    });

    it('MM-T5000_1 - should toggle advanced options and verify preauth secret field styling', async () => {
        // * Verify advanced options toggle is visible with correct text
        await expect(advancedOptionsToggle).toBeVisible();
        await expect(element(by.text('Advanced Options'))).toBeVisible();

        // * Verify preauth secret field is initially hidden
        await expect(preauthSecretInput).not.toBeVisible();
        await expect(preauthSecretHelp).not.toBeVisible();

        // # Toggle advanced options to show fields
        await ServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is now visible with correct text and styling
        await expect(preauthSecretInput).toBeVisible();
        await expect(preauthSecretHelp).toBeVisible();
        await expect(element(by.text('Authentication secret'))).toBeVisible();
        await expect(preauthSecretHelp).toHaveText('The authentication secret shared by the administrator');

        // # Toggle advanced options again to hide
        await ServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is hidden again
        await expect(preauthSecretInput).not.toBeVisible();
        await expect(preauthSecretHelp).not.toBeVisible();
    });

    it('MM-T5000_2 - should connect to server with preauth secret and verify storage', async () => {
        const testPreauthSecret = 'test-secret-123';
        const serverDisplayName = 'Test Server with Preauth';

        // # Connect to server using the dedicated method with preauth secret
        await ServerScreen.connectToServerWithPreauthSecret(serverOneUrl, serverDisplayName, testPreauthSecret);

        // * Verify successful connection to login screen
        await LoginScreen.toBeVisible();

        // TODO: Add verification that preauth secret is stored in keychain
        // This would require keychain testing utilities or verification through subsequent network requests
    });

    it('MM-T5000_3 - should connect to server without preauth secret', async () => {
        const serverDisplayName = 'Server without Preauth';

        // # Connect to server using the standard method (no preauth secret)
        await ServerScreen.connectToServer(serverOneUrl, serverDisplayName);

        // * Verify successful connection to login screen
        await LoginScreen.toBeVisible();
    });
});
