// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {serverUrl} from '@support/test_config';

class SelectServerScreen {
    testID = {
        selectServerScreen: 'select_server.screen',
        connectButton: 'connect.button',
        errorText: 'error.text',
        headerText: 'header.text',
        serverUrlInput: 'server_url.input',
    }

    selectServerScreen = element(by.id(this.testID.selectServerScreen));
    serverUrlInput = element(by.id(this.testID.serverUrlInput));
    connectButton = element(by.id(this.testID.connectButton));
    errorText = element(by.id(this.testID.errorText));

    toBeVisible = async () => {
        await expect(this.selectServerScreen).toBeVisible();

        return this.selectServerScreen;
    }

    /**
     * connectToServer enters server URL on Select Server screen and then tap connect button.
     */
    connectToServer = async () => {
        const screen = await this.toBeVisible();

        await this.serverUrlInput.replaceText(serverUrl);

        // # Tap anywhere to hide keyboard
        await screen.tap({x: 5, y: 10});

        await this.connectButton.tap();
    }
}

const selectServerScreen = new SelectServerScreen();
export default selectServerScreen;
