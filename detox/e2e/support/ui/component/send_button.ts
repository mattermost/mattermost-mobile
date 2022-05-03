// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class SendButton {
    testID = {
        sendButtonSuffix: 'post_draft.send_action.send.button',
        sendButtonDisabledSuffix: 'post_draft.send_action.send.button.disabled',
    };

    getSendButton = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.sendButtonSuffix}`));
    };

    getSendButtonDisabled = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.sendButtonDisabledSuffix}`));
    };
}

const sendButton = new SendButton();
export default sendButton;
