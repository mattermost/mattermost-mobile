// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AppScreen from '../app_screen';

const SELECTORS = {
    CONTAINER: '~post textbox',
    ATTACHMENT_BUTTON: '~attachment button',
    SEND_BUTTON: '~send button',
    TEXT_INPUT: '~post textbox input',
};

class PostTextbox extends AppScreen {
    constructor() {
        super(SELECTORS.CONTAINER);
    }

    get view() {
        return $(SELECTORS.CONTAINER);
    }

    get attachmentButton() {
        return $(SELECTORS.ATTACHMENT_BUTTON);
    }

    get sendButton() {
        return $(SELECTORS.SEND_BUTTON);
    }

    get textInput() {
        return $(SELECTORS.TEXT_INPUT);
    }

    clickAttachmentButton() {
        this.attachmentButton.click();
    }

    clickSendButton() {
        this.sendButton.click();
    }
}

export default new PostTextbox();
