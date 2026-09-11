// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid, timeouts, wait} from '@support/utils';
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
        preauthSecretInputError: 'edit_server_form.preauth_secret.input.error',
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
    preauthSecretInputError = element(by.id(this.testID.preauthSecretInputError));
    preauthSecretHelp = element(by.id(this.testID.preauthSecretHelp));
    saveButton = element(by.id(this.testID.saveButton));
    saveButtonDisabled = element(by.id(this.testID.saveButtonDisabled));

    toBeVisible = async () => {
        await waitFor(this.editServerScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(this.serverDisplayNameInput).toExist().withTimeout(timeouts.TEN_SEC);

        return this.editServerScreen;
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.editServerScreen).not.toBeVisible();
    };

    // .atIndex(0) because on Android secureTextEntry matches two native views under one testID
    // (the ReactEditText wrapper plus the inner EditText), which otherwise fails as ambiguous.
    getPreauthSecretInputElement = () => (
        isAndroid() ? element(by.id(this.testID.preauthSecretInput)).atIndex(0) : this.preauthSecretInput
    );

    toggleAdvancedOptions = async () => {
        await this.advancedOptionsToggle.tap();
        await wait(timeouts.ONE_SEC);
    };

    /**
     * Expands advanced options only when they are collapsed.
     *
     * The screen can be remounted with the section already expanded — its state survives a
     * previous visit — and an unconditional toggle would then collapse it and hide the field.
     */
    showAdvancedOptions = async () => {
        const input = this.getPreauthSecretInputElement();

        try {
            await waitFor(input).toExist().withTimeout(timeouts.TWO_SEC);
            return;
        } catch {
            // Collapsed, so open it below.
        }

        await this.toggleAdvancedOptions();
        await waitFor(input).toExist().withTimeout(timeouts.TEN_SEC);
    };

    enterPreauthSecret = async (preauthSecret: string) => {
        const input = this.getPreauthSecretInputElement();
        await waitFor(input).toExist().withTimeout(timeouts.TEN_SEC);
        await input.replaceText(preauthSecret);
    };

    // Shows advanced options, replaces the stored secret and saves. Pass an empty string to clear it.
    changePreauthSecret = async (preauthSecret: string) => {
        await this.toBeVisible();
        await this.showAdvancedOptions();
        await this.enterPreauthSecret(preauthSecret);
        await this.saveButton.tap();
    };
}

const editServerScreen = new EditServerScreen();
export default editServerScreen;
