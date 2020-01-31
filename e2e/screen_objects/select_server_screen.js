// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AppScreen from './app_screen';

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

    connectToServer(serverUrl) {
        // * Check if server screen is shown
        this.waitForIsShown(true);

        // # Connect to server
        this.editUrlInput(serverUrl);
        this.clickConnectButton();
    }
}

export default new SelectServerScreen();
