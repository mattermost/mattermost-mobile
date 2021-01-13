// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {serverUrl} from '@support/test_config';
import {timeouts} from '@support/utils';

class SelectServerScreen {
    testID = {
        selectServerScreen: 'select_server.screen',
        headerText: 'select_server.header.text',
        serverUrlInput: 'select_server.server_url.input',
        connectButton: 'select_server.connect.button',
        errorText: 'select_server.error.text',
    }

    selectServerScreen = element(by.id(this.testID.selectServerScreen));
    headerText = element(by.id(this.testID.headerText));
    serverUrlInput = element(by.id(this.testID.serverUrlInput));
    connectButton = element(by.id(this.testID.connectButton));
    errorText = element(by.id(this.testID.errorText));

    toBeVisible = async () => {
        await waitFor(this.selectServerScreen).toBeVisible().withTimeout(timeouts.FOUR_SEC);

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
