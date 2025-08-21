// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    EditServerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ServerListScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

// Helper function to reopen edit server screen
const reopenEditServer = async (displayName: string) => {
    await wait(timeouts.TWO_SEC); // Allow server list to refresh after name changes
    await ServerListScreen.open();
    await waitFor(ServerListScreen.getServerItemActive(displayName)).toBeVisible().withTimeout(timeouts.TEN_SEC);
    await ServerListScreen.getServerItemActive(displayName).swipe('left', 'slow');
    await ServerListScreen.getServerItemEditOption(displayName).tap();
    await EditServerScreen.toBeVisible();
};

describe('Edit Server - Preauth Secret', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: {username: string; password: string};

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // Reset app and log in to server and verify we're on home screen
        await device.reloadReactNative();
        await expect(ServerScreen.headerTitleConnectToServer).toBeVisible();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await HomeScreen.toBeVisible();
        await ServerListScreen.open();
        await ServerListScreen.closeTutorial(); // Close it only here since it's only shown once
        await ServerListScreen.close();
    });

    beforeEach(async () => {
        // Verify on home screen
        await HomeScreen.toBeVisible();
        await reopenEditServer(serverOneDisplayName);
    });

    afterAll(async () => {
        // Log out
        await ServerListScreen.close();
        await HomeScreen.logout();
    });

    it('MM-T5001_1 - should show advanced options toggle and preauth secret field with correct styling', async () => {
        // Verify basic elements on edit server screen
        await expect(EditServerScreen.serverDisplayNameInput).toBeVisible();
        await expect(EditServerScreen.advancedOptionsToggle).toBeVisible();
        await expect(EditServerScreen.saveButton).toBeVisible();
        await expect(element(by.text('Advanced Options'))).toBeVisible();

        // Verify preauth secret field is initially hidden
        await expect(EditServerScreen.preauthSecretInput).not.toBeVisible();
        await expect(EditServerScreen.preauthSecretHelp).not.toBeVisible();

        // Toggle advanced options to show preauth secret field
        await EditServerScreen.toggleAdvancedOptions();

        // Verify preauth secret elements are now visible with correct text and styling
        await expect(EditServerScreen.preauthSecretInput).toBeVisible();
        await expect(EditServerScreen.preauthSecretHelp).toBeVisible();
        await expect(element(by.text('Pre-authentication secret'))).toBeVisible();
        await expect(EditServerScreen.preauthSecretHelp).toHaveText('Type to replace current password, clear field to remove password');

        // Toggle advanced options to hide field again
        await EditServerScreen.toggleAdvancedOptions();

        // Verify preauth secret field is hidden again
        await expect(EditServerScreen.preauthSecretInput).not.toBeVisible();
        await expect(EditServerScreen.preauthSecretHelp).not.toBeVisible();
    });

    it('MM-T5001_2 - should add preauth secret to existing server', async () => {
        const testPreauthSecret = 'new-secret-123';
        const newDisplayName = 'Server with New Preauth';

        // Update server with new preauth secret
        await EditServerScreen.serverDisplayNameInput.replaceText(newDisplayName);
        await EditServerScreen.toggleAdvancedOptions();
        await EditServerScreen.enterPreauthSecret(testPreauthSecret);

        // Verify preauth secret field has content (placeholder not visible)
        await expect(element(by.text('Pre-authentication secret'))).not.toBeVisible();

        // Save changes
        await EditServerScreen.saveButton.tap();
        await waitFor(EditServerScreen.editServerScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);

        // Verify changes were saved by reopening edit server
        await reopenEditServer(newDisplayName);

        await EditServerScreen.toggleAdvancedOptions();

        // Verify preauth secret field has existing content (placeholder not visible)
        await expect(element(by.text('Pre-authentication secret'))).not.toBeVisible();

        // Reset display name for other tests
        await EditServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);
        await EditServerScreen.saveButton.tap();
        await expect(EditServerScreen.editServerScreen).not.toBeVisible();
    });

    it('MM-T5001_3 - should modify existing preauth secret', async () => {
        const newPreauthSecret = 'modified-secret-456';

        // First add a preauth secret
        await EditServerScreen.toggleAdvancedOptions();
        await EditServerScreen.enterPreauthSecret('original-secret');
        await EditServerScreen.saveButton.tap();
        await expect(EditServerScreen.editServerScreen).not.toBeVisible();

        // Reopen edit server screen and modify secret
        await reopenEditServer(serverOneDisplayName);
        await EditServerScreen.toggleAdvancedOptions();

        // Verify existing secret field has content (placeholder not visible)
        await expect(element(by.text('Pre-authentication secret'))).not.toBeVisible();

        // Focus the field to clear "keep" and enter new secret
        await EditServerScreen.preauthSecretInput.tap();
        await EditServerScreen.enterPreauthSecret(newPreauthSecret);

        // Verify new secret field has content (placeholder not visible)
        await expect(element(by.text('Pre-authentication secret'))).not.toBeVisible();

        // Save changes
        await EditServerScreen.saveButton.tap();
        await expect(EditServerScreen.editServerScreen).not.toBeVisible();
    });

    it('MM-T5001_4 - should remove preauth secret from server', async () => {
        await EditServerScreen.toBeVisible();
        await EditServerScreen.toggleAdvancedOptions();
        await EditServerScreen.enterPreauthSecret('secret-to-remove');
        await EditServerScreen.saveButton.tap();
        await expect(EditServerScreen.editServerScreen).not.toBeVisible();

        // Reopen edit server screen and clear preauth secret
        await reopenEditServer(serverOneDisplayName);
        await EditServerScreen.toggleAdvancedOptions();

        // Verify existing secret field has content (placeholder not visible)
        await expect(element(by.text('Pre-authentication secret'))).not.toBeVisible();

        // Focus the field to clear "keep" and leave empty
        await EditServerScreen.preauthSecretInput.tap();
        await EditServerScreen.preauthSecretInput.clearText();

        // Verify field is empty (placeholder visible)
        await expect(element(by.text('Pre-authentication secret'))).toBeVisible();

        // Save changes
        await EditServerScreen.saveButton.tap();
        await expect(EditServerScreen.editServerScreen).not.toBeVisible();

        // Verify removal by reopening edit server
        await reopenEditServer(serverOneDisplayName);
        await EditServerScreen.toggleAdvancedOptions();

        // Verify preauth secret field is empty (placeholder visible, no "keep" text)
        await expect(element(by.text('Pre-authentication secret'))).toBeVisible();
    });
});
