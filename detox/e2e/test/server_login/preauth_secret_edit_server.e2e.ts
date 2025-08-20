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
    AccountScreen,
    EditServerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    SettingsScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Server Login - Edit Server Preauth Secret', () => {
    const serverOneDisplayName = 'Test Server';
    let testUser: any;

    const {
        editServerScreen,
        serverDisplayNameInput,
        advancedOptionsToggle,
        preauthSecretInput,
        preauthSecretHelp,
        saveButton,
        saveButtonDisabled,
    } = EditServerScreen;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // # Navigate to account settings and edit server
        await AccountScreen.open();
        await SettingsScreen.toBeVisible();

        // # Wait for server item to be visible before tapping
        const serverItem = element(by.text(serverOneDisplayName));
        await waitFor(serverItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await serverItem.tap();

        // # Wait for edit button and tap
        const editButton = element(by.text('Edit'));
        await waitFor(editButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await editButton.tap();

        // * Verify on edit server screen
        await EditServerScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T5001_1 - should match elements on edit server screen with preauth secret', async () => {
        // * Verify basic elements on edit server screen
        await expect(serverDisplayNameInput).toBeVisible();
        await expect(advancedOptionsToggle).toBeVisible();
        await expect(saveButton).toBeVisible();

        // * Verify advanced options toggle text
        await expect(element(by.text('Advanced Options'))).toBeVisible();

        // # Toggle advanced options to show preauth secret field
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret elements are visible
        await expect(preauthSecretInput).toBeVisible();
        await expect(preauthSecretHelp).toBeVisible();
        await expect(element(by.text('Pre-authentication secret'))).toBeVisible();
        await expect(preauthSecretHelp).toHaveText('The pre-authentication secret shared by the administrator');
    });

    it('MM-T5001_2 - should show/hide preauth secret field when toggling advanced options', async () => {
        // * Verify preauth secret field is initially hidden
        await expect(preauthSecretInput).not.toBeVisible();

        // # Toggle advanced options to show
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is now visible
        await expect(preauthSecretInput).toBeVisible();
        await expect(preauthSecretHelp).toBeVisible();

        // # Toggle advanced options to hide
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is hidden again
        await expect(preauthSecretInput).not.toBeVisible();
        await expect(preauthSecretHelp).not.toBeVisible();
    });

    it('MM-T5001_3 - should add preauth secret to existing server', async () => {
        const testPreauthSecret = 'new-secret-123';
        const newDisplayName = 'Server with New Preauth';

        // # Update server with new preauth secret
        await serverDisplayNameInput.replaceText(newDisplayName);
        await EditServerScreen.toggleAdvancedOptions();
        await EditServerScreen.enterPreauthSecret(testPreauthSecret);

        // * Verify preauth secret field has the entered value
        await expect(preauthSecretInput).toHaveValue(testPreauthSecret);

        // # Save changes
        await saveButton.tap();

        // * Verify edit server screen closes
        await expect(editServerScreen).not.toBeVisible();

        // # Verify changes were saved by reopening edit server
        const serverItem = element(by.text(newDisplayName));
        await serverItem.tap();
        const editButton = element(by.text('Edit'));
        await editButton.tap();
        await EditServerScreen.toBeVisible();

        // # Toggle advanced options to see preauth secret
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret shows "keep" placeholder for existing secret
        await expect(preauthSecretInput).toHaveValue('keep');
    });

    it('MM-T5001_4 - should modify existing preauth secret', async () => {
        const newPreauthSecret = 'modified-secret-456';

        // # First add a preauth secret
        await EditServerScreen.toggleAdvancedOptions();
        await EditServerScreen.enterPreauthSecret('original-secret');
        await saveButton.tap();
        await expect(editServerScreen).not.toBeVisible();

        // # Reopen edit server screen
        const serverItem = element(by.text(serverOneDisplayName));
        await serverItem.tap();
        const editButton = element(by.text('Edit'));
        await editButton.tap();
        await EditServerScreen.toBeVisible();

        // # Toggle advanced options and modify preauth secret
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify existing secret shows "keep"
        await expect(preauthSecretInput).toHaveValue('keep');

        // # Focus the field to clear "keep" and enter new secret
        await preauthSecretInput.tap();
        await EditServerScreen.enterPreauthSecret(newPreauthSecret);

        // * Verify new secret is in the field
        await expect(preauthSecretInput).toHaveValue(newPreauthSecret);

        // # Save changes
        await saveButton.tap();
        await expect(editServerScreen).not.toBeVisible();
    });

    it('MM-T5001_5 - should remove preauth secret from server', async () => {
        // # First add a preauth secret
        await EditServerScreen.toggleAdvancedOptions();
        await EditServerScreen.enterPreauthSecret('secret-to-remove');
        await saveButton.tap();
        await expect(editServerScreen).not.toBeVisible();

        // # Reopen edit server screen
        const serverItem = element(by.text(serverOneDisplayName));
        await serverItem.tap();
        const editButton = element(by.text('Edit'));
        await editButton.tap();
        await EditServerScreen.toBeVisible();

        // # Toggle advanced options and clear preauth secret
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify existing secret shows "keep"
        await expect(preauthSecretInput).toHaveValue('keep');

        // # Focus the field to clear "keep" and leave empty
        await preauthSecretInput.tap();
        await preauthSecretInput.clearText();

        // * Verify field is empty
        await expect(preauthSecretInput).toHaveValue('');

        // # Save changes
        await saveButton.tap();
        await expect(editServerScreen).not.toBeVisible();

        // # Verify removal by reopening edit server
        const serverItem2 = element(by.text(serverOneDisplayName));
        await serverItem2.tap();
        const editButton2 = element(by.text('Edit'));
        await editButton2.tap();
        await EditServerScreen.toBeVisible();
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify preauth secret field is empty (no "keep" placeholder)
        await expect(preauthSecretInput).toHaveValue('');
    });

    it('MM-T5001_6 - should handle save without modifying preauth secret', async () => {
        const newDisplayName = 'Server Renamed Only';

        // # Change only display name, don't touch preauth secret
        await serverDisplayNameInput.replaceText(newDisplayName);

        // * Verify save button is enabled
        await expect(saveButton).toBeVisible();

        // # Save changes
        await saveButton.tap();
        await expect(editServerScreen).not.toBeVisible();

        // # Verify display name change was saved
        await expect(element(by.text(newDisplayName))).toBeVisible();
    });

    it('MM-T5001_7 - should disable save button when display name is empty', async () => {
        // # Clear display name
        await serverDisplayNameInput.clearText();

        // * Verify save button is disabled
        await expect(saveButtonDisabled).toBeVisible();

        // # Add preauth secret but keep display name empty
        await EditServerScreen.toggleAdvancedOptions();
        await EditServerScreen.enterPreauthSecret('test-secret');

        // * Verify save button is still disabled
        await expect(saveButtonDisabled).toBeVisible();

        // # Restore display name
        await serverDisplayNameInput.replaceText('Valid Name');

        // * Verify save button is now enabled
        await expect(saveButton).toBeVisible();
    });

    it('MM-T5001_8 - should maintain preauth secret value when toggling advanced options', async () => {
        const testSecret = 'persistent-secret';

        // # Enter preauth secret
        await EditServerScreen.toggleAdvancedOptions();
        await EditServerScreen.enterPreauthSecret(testSecret);

        // * Verify secret is entered
        await expect(preauthSecretInput).toHaveValue(testSecret);

        // # Toggle advanced options to hide field
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify field is hidden
        await expect(preauthSecretInput).not.toBeVisible();

        // # Toggle advanced options to show field again
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify secret value is maintained
        await expect(preauthSecretInput).toHaveValue(testSecret);
    });

    it('MM-T5001_9 - should show correct help text for preauth secret', async () => {
        // # Toggle advanced options to show help text
        await EditServerScreen.toggleAdvancedOptions();

        // * Verify help text content
        await expect(preauthSecretHelp).toBeVisible();
        await expect(preauthSecretHelp).toHaveText('The pre-authentication secret shared by the administrator');

        // * Verify help text about modifying existing secret (shown when field has "keep")
        // First add a secret
        await EditServerScreen.enterPreauthSecret('test-secret');
        await saveButton.tap();
        await expect(editServerScreen).not.toBeVisible();

        // Reopen and check for additional help text
        const serverItem = element(by.text(serverOneDisplayName));
        await serverItem.tap();
        const editButton = element(by.text('Edit'));
        await editButton.tap();
        await EditServerScreen.toBeVisible();
        await EditServerScreen.toggleAdvancedOptions();

        // * Wait for help text to become visible after toggle
        const helpText = element(by.text('Type to replace current password, clear field to remove password'));
        await waitFor(helpText).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * Verify help text includes instruction for existing secrets
        await expect(helpText).toBeVisible();
    });
});
