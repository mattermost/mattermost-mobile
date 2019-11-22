// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AppScreen from '../app.screen';

const SELECTORS = {
    SELECT_SERVER_SCREEN: '~select server screen',
    URL_INPUT: '~url input',
    CONNECT_BUTTON: '~connect button',
};

class SelectServerScreen extends AppScreen {
    constructor() {
        super(SELECTORS.SELECT_SERVER_SCREEN);
    }

    get urlInput() {
        return $(SELECTORS.URL_INPUT);
    }

    get connectButton() {
        return $(SELECTORS.CONNECT_BUTTON);
    }

    editUrlInput(text) {
        this.urlInput.setValue(text);
    }

    clickConnectButton() {
        this.connectButton.click();
    }
}

export default new SelectServerScreen();
