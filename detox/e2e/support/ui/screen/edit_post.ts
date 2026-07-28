// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostOptionsScreen} from '@support/ui/screen';
import {isAndroid, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

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
        const timeout = isAndroid() ? timeouts.TWENTY_SEC : timeouts.TEN_SEC;
        await waitFor(this.editPostScreen).toExist().withTimeout(timeout);
        await waitFor(this.messageInput).toBeVisible().withTimeout(timeout);

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

    hasValidationError = async () => {
        for (const errorElement of [this.messageInputError, this.messageInputErrorExtra]) {
            try {
                // eslint-disable-next-line no-await-in-loop -- probe each error slot in turn
                await waitFor(errorElement).toExist().withTimeout(timeouts.ONE_SEC);
                return true;
            } catch {
                // Error slot not rendered.
            }
        }

        return false;
    };

    save = async () => {
        await this.saveButton.tap();
        try {
            await waitFor(this.editPostScreen).not.toExist().withTimeout(timeouts.TWENTY_SEC);
        } catch (primaryError) {
            // A validation error means the save genuinely failed; dismissing the modal
            // here would let the caller treat it as a success.
            if (await this.hasValidationError()) {
                throw primaryError;
            }

            // Otherwise the modal may still be animating out. Dismiss for cleanup, but
            // always rethrow — reaching the fallback means save did not complete.
            try {
                await waitFor(this.closeButton).toExist().withTimeout(timeouts.FOUR_SEC);
                await this.closeButton.tap();
                await waitFor(this.editPostScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
            } catch {
                if (isAndroid()) {
                    try {
                        await device.pressBack();
                        await waitFor(this.editPostScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
                    } catch { /* fall through */ }
                }
            }
            throw primaryError;
        }
    };
}

const editPostScreen = new EditPostScreen();
export default editPostScreen;
