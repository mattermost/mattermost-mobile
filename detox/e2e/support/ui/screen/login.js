// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ServerScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';

class LoginScreen {
    testID = {
        loginScreen: 'login.screen',
        backButton: 'screen.back.button',
        usernameInput: 'login_form.username.input',
        usernameInputError: 'login_form.username.input.error',
        passwordInput: 'login_form.password.input',
        passwordInputError: 'login_form.password.input.error',
        forgotPasswordButton: 'login_form.forgot_password.button',
        signinButton: 'login_form.signin.button',
        signinButtonDisabled: 'login_form.signin.button.disabled',
    };

    loginScreen = element(by.id(this.testID.loginScreen));
    backButton = element(by.id(this.testID.backButton));
    usernameInput = element(by.id(this.testID.usernameInput));
    usernameInputError = element(by.id(this.testID.usernameInputError));
    passwordInput = element(by.id(this.testID.passwordInput));
    passwordInputError = element(by.id(this.testID.passwordInputError));
    forgotPasswordButton = element(by.id(this.testID.forgotPasswordButton));
    signinButton = element(by.id(this.testID.signinButton));
    signinButtonDisabled = element(by.id(this.testID.signinButtonDisabled));

    toBeVisible = async () => {
        await waitFor(this.loginScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(this.usernameInput).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.loginScreen;
    };

    open = async (serverUrl, serverDisplayName) => {
        // # Open login screen
        await ServerScreen.connectToServer(serverUrl, serverDisplayName);

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.loginScreen).not.toBeVisible();
    };

    login = async (user = {}) => {
        await this.toBeVisible();
        await this.usernameInput.replaceText(user.username);
        await this.passwordInput.replaceText(user.password);
        await this.signinButton.tap();
    };
}

const loginScreen = new LoginScreen();
export default loginScreen;
