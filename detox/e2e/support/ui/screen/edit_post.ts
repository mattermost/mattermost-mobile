// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostOptionsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class EditPostScreen {
    testID = {
        editPostScreen: 'edit_post.screen',
        closeButton: 'close.edit_post.button',
        saveButton: 'edit_post.save.button',
        messageInput: 'edit_post.message.input',
        messageInputError: 'edit_post.message.input.error',
        messageInputErrorExtra: 'edit_post.message.input.error.extra',
    };

    editPostScreen = element(by.id(this.testID.editPostScreen));
    closeButton = element(by.id(this.testID.closeButton));
    saveButton = element(by.id(this.testID.saveButton));
    messageInput = element(by.id(this.testID.messageInput));
    messageInputError = element(by.id(this.testID.messageInputError));
    messageInputErrorExtra = element(by.id(this.testID.messageInputErrorExtra));

    toBeVisible = async () => {
        await waitFor(this.editPostScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(this.messageInput).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.editPostScreen;
    };

    open = async () => {
        // # Open edit post screen
        await PostOptionsScreen.editPostOption.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.editPostScreen).not.toBeVisible();
    };
}

const editPostScreen = new EditPostScreen();
export default editPostScreen;
