// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostOptions} from '@support/ui/component';
import {isAndroid} from '@support/utils';

class EditPostScreen {
    testID = {
        editPostScreen: 'edit_post.screen',
        closeEditPostButton: 'close.edit_post.button',
        messageInput: 'edit_post.message.input',
        saveButton: 'edit_post.save.button',
    }

    editPostScreen = element(by.id(this.testID.editPostScreen));
    closeEditPostButton = element(by.id(this.testID.closeEditPostButton));
    messageInput = element(by.id(this.testID.messageInput));
    saveButton = element(by.id(this.testID.saveButton));

    toBeVisible = async () => {
        if (isAndroid()) {
            await expect(this.editPostScreen).toBeVisible();
        } else {
            await expect(this.editPostScreen).toExist();
        }

        return this.editPostScreen;
    }

    open = async () => {
        // # Swipe up panel on Android
        if (isAndroid()) {
            await PostOptions.slideUpPanel.swipe('up');
        }

        // # Open edit post screen
        await PostOptions.editAction.tap();

        return this.toBeVisible();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.editPostScreen).not.toBeVisible();
    }
}

const editPostScreen = new EditPostScreen();
export default editPostScreen;
