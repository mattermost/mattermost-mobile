// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelListScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class LoginScreen {
    testID = {
        loginScreen: 'login.screen',
        backButton: 'screen.back.button',
        titleLoginToAccount: 'login_options.title.login_to_account',
        titleCantLogin: 'login_options.title.cant_login',
        descriptionEnterCredentials: 'login_options.description.enter_credentials',
        descriptionSelectOption: 'login_options.description.select_option',
        descriptionNone: 'login_options.description.none',
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
    titleLoginToAccount = element(by.id(this.testID.titleLoginToAccount));
    titleCantLogin = element(by.id(this.testID.titleCantLogin));
    descriptionEnterCredentials = element(by.id(this.testID.descriptionEnterCredentials));
    descriptionSelectOption = element(by.id(this.testID.descriptionSelectOption));
    descriptionNone = element(by.id(this.testID.descriptionNone));
    usernameInput = element(by.id(this.testID.usernameInput));
    usernameInputError = element(by.id(this.testID.usernameInputError));
    passwordInput = element(by.id(this.testID.passwordInput));
    passwordInputError = element(by.id(this.testID.passwordInputError));
    forgotPasswordButton = element(by.id(this.testID.forgotPasswordButton));
    signinButton = element(by.id(this.testID.signinButton));
    signinButtonDisabled = element(by.id(this.testID.signinButtonDisabled));

    toBeVisible = async () => {
        await wait(timeouts.FOUR_SEC);
        await waitFor(this.loginScreen).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(this.usernameInput).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.loginScreen;
    };

    open = async (serverUrl: string, serverDisplayName: string) => {
        // # Open login screen
        await ServerScreen.connectToServer(serverUrl, serverDisplayName);

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await expect(this.loginScreen).not.toBeVisible();
    };

    login = async (user: any = {}) => {
        await this.toBeVisible();

        await this.usernameInput.tap({x: 150, y: 10});
        await this.usernameInput.replaceText(user.newUser.email);
        await this.passwordInput.tap();
        await this.passwordInput.replaceText(user.newUser.password);
        await element(by.text(/^Log In to Your Account*$/)).tap();
        await this.signinButton.tap();

        await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(timeouts.TEN_SEC);
    };

    loginAsAdmin = async (user: any = {}) => {
        await this.toBeVisible();
        await this.usernameInput.tap({x: 150, y: 10});

        await this.usernameInput.replaceText(user.username);
        await this.passwordInput.tap();
        await this.passwordInput.replaceText(user.password);
        await this.signinButton.tap();

        await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(timeouts.TEN_SEC);
    };
}

const loginScreen = new LoginScreen();
export default loginScreen;
