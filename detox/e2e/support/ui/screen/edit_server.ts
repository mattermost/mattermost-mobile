// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';

class EditServerScreen {
    testID = {
        editServerScreen: 'edit_server.screen',
        closeButton: 'close-server-edit',
        headerTitle: 'edit_server_header.title',
        headerDescription: 'edit_server_header.description',
        serverDisplayNameInput: 'edit_server_form.server_display_name.input',
        serverDisplayNameInputError: 'edit_server_form.server_display_name.input.error',
        displayHelp: 'edit_server_form.display_help',
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
    saveButton = element(by.id(this.testID.saveButton));
    saveButtonDisabled = element(by.id(this.testID.saveButtonDisabled));

    toBeVisible = async () => {
        await waitFor(this.editServerScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(this.serverDisplayNameInput).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.editServerScreen;
    };
}

const editServerScreen = new EditServerScreen();
export default editServerScreen;
