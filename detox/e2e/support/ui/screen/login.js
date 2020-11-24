// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SelectServerScreen} from '@support/ui/screen';

class LoginScreen {
    testID = {
        loginScreen: 'login.screen',
        usernameInput: 'login.username.input',
        passwordInput: 'login.password.input',
        signinButton: 'login.signin.button',
        errorText: 'login.error.text',
    }

    loginScreen = element(by.id(this.testID.loginScreen));
    usernameInput = element(by.id(this.testID.usernameInput));
    passwordInput = element(by.id(this.testID.passwordInput));
    signinButton = element(by.id(this.testID.signinButton));
    errorText = element(by.id(this.testID.errorText));

    toBeVisible = async () => {
        await expect(this.loginScreen).toBeVisible();

        return this.loginScreen;
    }

    open = async () => {
        // # Open login screen
        await SelectServerScreen.connectToServer();

        return this.toBeVisible();
    }

    /**
     * login enters credential on Login screen and then tap "Sign in" button to log in.
     * @param {Object} user - user to login with username and password
     */
    login = async (user = {}) => {
        const screen = await this.toBeVisible();

        await this.usernameInput.replaceText(user.username);

        // # Tap anywhere to hide keyboard
        await screen.tap({x: 10, y: 10});

        await this.passwordInput.replaceText(user.password);

        // # Tap anywhere to hide keyboard
        await screen.tap({x: 10, y: 10});

        await this.signinButton.tap();
    }
}

const loginScreen = new LoginScreen();
export default loginScreen;
