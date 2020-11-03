// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAndroid} from '@support/utils';

class EditPostScreen {
    testID = {
        editPostScreen: 'edit_post.screen',
        editPostInput: 'edit_post.input',
        editPostClose: 'edit_post.close',
    }

    editPostInput = element(by.id(this.testID.editPostInput));
    editPostClose = element(by.id(this.testID.editPostClose));

    toBeVisible = async () => {
        await expect(this.editPostScreen).toBeVisible();

        return this.editPostScreen;
    }

    open = async (message) => {
        // # Open edit post screen
        await element(by.text(message)).longPress();

        // # Swipe up panel on Android
        if (isAndroid()) {
            const slide = element(by.id('slide_up_panel'));
            await slide.swipe('up');
        }

        await element(by.text('Edit')).tap();
    }

    back = async () => {
        await this.backButton.tap();
        await expect(this.editPostScreen).not.toBeVisible();
    }
}

const editPostScreen = new EditPostScreen();
export default editPostScreen;
