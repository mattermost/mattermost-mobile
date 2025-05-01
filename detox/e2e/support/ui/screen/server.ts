// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class ServerScreen {
    testID = {
        serverScreen: 'server.screen',
        closeButton: 'close.server.button',
        headerTitleAddServer: 'server_header.title.add_server',
        headerTitleConnectToServer: 'server_header.title.connect_to_server',
        headerWelcome: 'server_header.welcome',
        headerDescription: 'server_header.description',
        serverUrlInput: 'server_form.server_url.input',
        serverUrlInputError: 'server_form.server_url.input.error',
        serverDisplayNameInput: 'server_form.server_display_name.input',
        serverDisplayNameInputError: 'server_form.server_display_name.input.error',
        displayHelp: 'server_form.display_help',
        connectButton: 'server_form.connect.button',
        connectButtonDisabled: 'server_form.connect.button.disabled',
        usernameInput: 'login_form.username.input',
        usernameInputError: 'login_form.username.input.error',
    };

    serverScreen = element(by.id(this.testID.serverScreen));
    closeButton = element(by.id(this.testID.closeButton));
    headerTitleAddServer = element(by.id(this.testID.headerTitleAddServer));
    headerTitleConnectToServer = element(by.id(this.testID.headerTitleConnectToServer));
    headerWelcome = element(by.id(this.testID.headerWelcome));
    headerDescription = element(by.id(this.testID.headerDescription));
    serverUrlInput = element(by.id(this.testID.serverUrlInput));
    serverUrlInputError = element(by.id(this.testID.serverUrlInputError));
    serverDisplayNameInput = element(by.id(this.testID.serverDisplayNameInput));
    serverDisplayNameInputError = element(by.id(this.testID.serverDisplayNameInputError));
    displayHelp = element(by.id(this.testID.displayHelp));
    connectButton = element(by.id(this.testID.connectButton));
    connectButtonDisabled = element(by.id(this.testID.connectButtonDisabled));
    usernameInput = element(by.id(this.testID.usernameInput));

    toBeVisible = async () => {
        await waitFor(this.serverScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(this.serverUrlInput).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.serverScreen;
    };

    connectToServer = async (serverUrl: string, serverDisplayName: string) => {
        await this.toBeVisible();
        await this.serverUrlInput.replaceText(serverUrl);
        await this.serverDisplayNameInput.replaceText(serverDisplayName);
        if (isAndroid()) {
            await this.tapConnectButton();
        }
        if (isIos()) {
            await this.tapConnectButton();
            if (serverUrl.includes('127.0.0.1') || !process.env.CI) {
                try {
                    // # Tap alert okay button
                    await waitFor(Alert.okayButton).toExist().withTimeout(timeouts.TEN_SEC);
                    await Alert.okayButton.tap();
                } catch (error) {
                    /* eslint-disable no-console */
                    console.log('Alert button did not appear!');
                }
            }
        }
        await waitFor(this.usernameInput).toExist().withTimeout(isAndroid()? timeouts.ONE_MIN : timeouts.HALF_MIN);
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.serverScreen).not.toBeVisible();
    };

    tapConnectButton = async () => {
        await this.connectButton.tap();
        await wait(timeouts.ONE_SEC);
    };
}

const serverScreen = new ServerScreen();
export default serverScreen;
