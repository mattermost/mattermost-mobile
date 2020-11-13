// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class SendButton {
    testID = {
        sendButton: 'post_draft.send.button',
        sendButtonDisabled: 'post_draft.send.button.disabled',
    }

    sendButton = element(by.id(this.testID.sendButton));
    sendButtonDisabled = element(by.id(this.testID.sendButtonDisabled));

    toBeVisible = async (options = {disabled: false}) => {
        if (options.disabled) {
            await expect(this.sendButtonDisabled).toBeVisible();
            return this.sendButtonDisabled;
        }

        await expect(this.sendButton).toBeVisible();
        return this.sendButton;
    }
}

const sendButton = new SendButton();
export default sendButton;