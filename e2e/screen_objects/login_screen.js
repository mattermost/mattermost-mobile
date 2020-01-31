// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AppScreen from './app_screen';

const SELECTORS = {
    LOGIN_SCREEN: '~login screen',
    EMAIL_OR_USERNAME_INPUT: '~email or username input',
    PASSWORD_INPUT: '~password input',
    SIGN_IN_BUTTON: '~sign in button',
    FORGOT_PASSWORD_BUTTON: '~forgot password button',
};

class LoginScreen extends AppScreen {
    constructor() {
        super(SELECTORS.LOGIN_SCREEN);
    }

    get emailOrUsernameInput() {
        return $(SELECTORS.EMAIL_OR_USERNAME_INPUT);
    }

    get passwordInput() {
        return $(SELECTORS.PASSWORD_INPUT);
    }

    get signInButton() {
        return $(SELECTORS.SIGN_IN_BUTTON);
    }

    get forgotPasswordButton() {
        return $(SELECTORS.FORGOT_PASSWORD_BUTTON);
    }

    editEmailOrUsernameInput(text) {
        this.emailOrUsernameInput.setValue(text);
    }

    editPasswordInput(text) {
        this.passwordInput.setValue(text);
    }

    clickSignInButton() {
        this.signInButton.click();
    }

    clickForgotPasswordButton() {
        this.forgotPasswordButton.click();
    }
}

export default new LoginScreen();
