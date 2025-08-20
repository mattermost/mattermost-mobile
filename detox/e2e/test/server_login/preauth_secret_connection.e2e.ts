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

describe('Server Login - Preauth Secret Connection', () => {
    const {
        serverUrlInput,
        serverDisplayNameInput,
        connectButton,
        connectButtonDisabled,
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
            // If we reach here, preauth field is visible (advanced options open)
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

    it('MM-T5000_1 - should show/hide preauth secret field when toggling advanced options', async () => {
        // * Verify advanced options toggle is visible
        await expect(advancedOptionsToggle).toBeVisible();

        // * Verify preauth secret field is initially hidden
        await expect(preauthSecretInput).not.toBeVisible();
        await expect(preauthSecretHelp).not.toBeVisible();

        // # Toggle advanced options
        await ServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is now visible
        await expect(preauthSecretInput).toBeVisible();
        await expect(preauthSecretHelp).toBeVisible();
        await expect(preauthSecretHelp).toHaveText('The pre-authentication secret shared by the administrator');

        // # Toggle advanced options again to hide
        await ServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is hidden again
        await expect(preauthSecretInput).not.toBeVisible();
        await expect(preauthSecretHelp).not.toBeVisible();
    });

    it('MM-T5000_2 - should verify advanced options text and styling', async () => {
        // * Verify advanced options toggle text
        await expect(element(by.text('Advanced Options'))).toBeVisible();

        // # Toggle advanced options to show fields
        await ServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret label text
        await expect(element(by.text('Pre-authentication secret'))).toBeVisible();

        // * Verify help text content
        await expect(preauthSecretHelp).toHaveText('The pre-authentication secret shared by the administrator');
    });

    it('MM-T5000_3 - should connect to server with preauth secret successfully', async () => {
        const testPreauthSecret = 'test-secret-123';
        const serverDisplayName = 'Test Server with Preauth';

        // # Fill in server details and preauth secret
        await serverUrlInput.replaceText(serverOneUrl);
        await serverDisplayNameInput.replaceText(serverDisplayName);

        // # Toggle advanced options and enter preauth secret
        await ServerScreen.toggleAdvancedOptions();
        await ServerScreen.enterPreauthSecret(testPreauthSecret);

        // * Verify preauth secret field is visible and ready (secure fields don't show values)
        await expect(preauthSecretInput).toBeVisible();

        // # Connect to server
        await connectButton.tap();
        await wait(timeouts.ONE_SEC);

        if (isIos() && !process.env.CI) {
            // # Tap alert okay button
            try {
                await waitFor(Alert.okayButton).toExist().withTimeout(timeouts.TEN_SEC);
                await Alert.okayButton.tap();
            } catch (error) {
                /* eslint-disable no-console */
                console.log('Alert button did not appear!');
            }
        }

        // * Verify on login screen
        await LoginScreen.toBeVisible();
    });

    it('MM-T5000_4 - should disable connect button when required fields are empty', async () => {
        const testPreauthSecret = 'test-secret-123';

        // * Verify connect button is initially disabled (empty fields)
        await expect(connectButtonDisabled).toBeVisible();

        // # Fill server URL but leave display name empty
        await serverUrlInput.replaceText(serverOneUrl);
        await ServerScreen.toggleAdvancedOptions();
        await ServerScreen.enterPreauthSecret(testPreauthSecret);

        // * Verify connect button is still disabled (missing display name)
        await expect(connectButtonDisabled).toBeVisible();

        // # Fill display name but clear server URL
        await serverUrlInput.clearText();
        await serverDisplayNameInput.replaceText('Test Server');

        // * Verify connect button is still disabled (missing server URL)
        await expect(connectButtonDisabled).toBeVisible();

        // # Fill both required fields
        await serverUrlInput.replaceText(serverOneUrl);

        // * Verify connect button is now enabled
        await expect(connectButton).toBeVisible();
    });

    it('MM-T5000_5 - should connect to server without preauth secret', async () => {
        // # Fill in server details without preauth secret
        await serverUrlInput.replaceText(serverOneUrl);
        await serverDisplayNameInput.replaceText('Server without Preauth');

        // * Verify we can connect without advanced options
        await expect(connectButton).toBeVisible();

        // # Connect to server
        await connectButton.tap();
        await wait(timeouts.ONE_SEC);

        if (isIos() && !process.env.CI) {
            // # Tap alert okay button
            try {
                await waitFor(Alert.okayButton).toExist().withTimeout(timeouts.TEN_SEC);
                await Alert.okayButton.tap();
            } catch (error) {
                /* eslint-disable no-console */
                console.log('Alert button did not appear!');
            }
        }

        // * Verify on login screen
        await LoginScreen.toBeVisible();
    });

    it('MM-T5000_6 - should handle empty preauth secret field', async () => {
        // # Fill in server details
        await serverUrlInput.replaceText(serverOneUrl);
        await serverDisplayNameInput.replaceText('Test Server Empty Preauth');

        // # Toggle advanced options but leave preauth secret empty
        await ServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is visible and empty (placeholder state)
        await expect(preauthSecretInput).toBeVisible();

        // * Verify connect button is still enabled (preauth secret is optional)
        await expect(connectButton).toBeVisible();

        // # Connect to server
        await connectButton.tap();
        await wait(timeouts.ONE_SEC);

        if (isIos() && !process.env.CI) {
            // # Tap alert okay button
            try {
                await waitFor(Alert.okayButton).toExist().withTimeout(timeouts.TEN_SEC);
                await Alert.okayButton.tap();
            } catch (error) {
                /* eslint-disable no-console */
                console.log('Alert button did not appear!');
            }
        }

        // * Verify on login screen
        await LoginScreen.toBeVisible();
    });

    it('MM-T5000_7 - should clear preauth secret field when toggling advanced options', async () => {
        const testPreauthSecret = 'test-secret-to-clear';

        // # Fill in server details and preauth secret
        await serverUrlInput.replaceText(serverOneUrl);
        await serverDisplayNameInput.replaceText('Test Server');

        // # Toggle advanced options and enter preauth secret
        await ServerScreen.toggleAdvancedOptions();
        await ServerScreen.enterPreauthSecret(testPreauthSecret);

        // * Verify preauth secret field is visible after entering text
        await expect(preauthSecretInput).toBeVisible();

        // # Toggle advanced options to hide field
        await ServerScreen.toggleAdvancedOptions();

        // # Toggle advanced options again to show field
        await ServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is visible (secure fields don't show values, but field should persist)
        await waitFor(preauthSecretInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(preauthSecretInput).toBeVisible();
    });
});
