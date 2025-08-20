// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class EditServerScreen {
    testID = {
        editServerScreen: 'edit_server.screen',
        closeButton: 'close.server_edit.button',
        headerTitle: 'edit_server_header.title',
        headerDescription: 'edit_server_header.description',
        serverDisplayNameInput: 'edit_server_form.server_display_name.input',
        serverDisplayNameInputError: 'edit_server_form.server_display_name.input.error',
        displayHelp: 'edit_server_form.display_help',
        advancedOptionsToggle: 'edit_server_form.advanced_options.toggle',
        preauthSecretInput: 'edit_server_form.preauth_secret.input',
        preauthSecretHelp: 'edit_server_form.preauth_secret_help',
        saveButton: 'edit_server_form.save.button',
        saveButtonDisabled: 'edit_server_form.save.button.disabled',
    };

    editServerScreen = element(by.id(this.testID.editServerScreen));
    closeButton = element(by.id(this.testID.closeButton));
    headerTitle = element(by.id(this.testID.headerTitle));
    headerDescription = element(by.id(this.testID.headerDescription));
    serverDisplayNameInput = element(by.id(this.testID.serverDisplayNameInput));
    serverDisplayNameInputError = element(by.id(this.testID.serverDisplayNameInputError));
    displayHelp = element(by.id(this.testID.displayHelp));
    advancedOptionsToggle = element(by.id(this.testID.advancedOptionsToggle));
    preauthSecretInput = element(by.id(this.testID.preauthSecretInput));
    preauthSecretHelp = element(by.id(this.testID.preauthSecretHelp));
    saveButton = element(by.id(this.testID.saveButton));
    saveButtonDisabled = element(by.id(this.testID.saveButtonDisabled));

    toBeVisible = async () => {
        await waitFor(this.editServerScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(this.serverDisplayNameInput).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.editServerScreen;
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.editServerScreen).not.toBeVisible();
    };

    toggleAdvancedOptions = async () => {
        await this.advancedOptionsToggle.tap();
        await wait(timeouts.ONE_SEC);
    };

    enterPreauthSecret = async (secret: string) => {
        await this.preauthSecretInput.replaceText(secret);
    };

    clearPreauthSecret = async () => {
        await this.preauthSecretInput.clearText();
    };

    editPreauthSecret = async (secret: string) => {
        // First toggle advanced options to show the field
        await this.toggleAdvancedOptions();

        // If we're replacing an existing secret, tap to focus (which clears "keep")
        await this.preauthSecretInput.tap();

        // Enter the new secret
        if (secret) {
            await this.enterPreauthSecret(secret);
        }
    };

    saveWithPreauthSecret = async (displayName: string, preauthSecret?: string) => {
        await this.toBeVisible();

        // Update display name if provided
        if (displayName) {
            await this.serverDisplayNameInput.replaceText(displayName);
        }

        // Handle preauth secret if provided
        if (preauthSecret !== undefined) {
            await this.editPreauthSecret(preauthSecret);
        }

        // Save changes
        await this.saveButton.tap();

        // Wait for screen to close
        await expect(this.editServerScreen).not.toBeVisible();
    };

    save = async () => {
        await this.saveButton.tap();
        await expect(this.editServerScreen).not.toBeVisible();
    };
}

const editServerScreen = new EditServerScreen();
export default editServerScreen;
