// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {serverOneUrl} from '@support/test_config';
import {ChannelListScreen, ServerScreen} from '@support/ui/screen';
import {isAndroid, retryWithReload, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

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
        loginFormInfoText: 'login_options.description.enter_credentials',
    };

    loginFormInfoText = element(by.id(this.testID.loginFormInfoText));
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
        // Android CI emulators can be slow after app launch — use a longer timeout.
        const timeout = isAndroid() ? timeouts.HALF_MIN : timeouts.TEN_SEC;

        // On Android, use the polling helper instead of waitFor().toExist() to avoid
        // BridgeIdlingResource blocking when the JS bridge is still busy after
        // a cold-start (newInstance) launch or device.reloadReactNative().
        if (isAndroid()) {
            await waitForElementToExist(this.loginScreen, timeout);
            await waitForElementToExist(this.usernameInput, timeout);
        } else {
            await waitFor(this.loginScreen).toExist().withTimeout(timeout);
            await waitFor(this.usernameInput).toExist().withTimeout(timeout);
        }
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

    loginWithRetryIfStuck = async (user: any = {}) => {
        await this.toBeVisible();
        await this.usernameInput.tap({x: 150, y: 10});
        await this.usernameInput.replaceText(user.newUser.email);
        await this.passwordInput.tap();
        await this.passwordInput.replaceText(user.newUser.password);
        await this.loginFormInfoText.tap();
        await this.signinButton.tap();

        await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(isAndroid() ? timeouts.ONE_MIN : timeouts.HALF_MIN);
    };

    login = async (user: any = {}) => {
        const maxAttempts = 3;
        let attempt = 0;
        let lastError;

        while (attempt < maxAttempts) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await retryWithReload(
                    async () => {
                        return this.loginWithRetryIfStuck(user);
                    },
                    3, // retries
                    ServerScreen,
                    serverOneUrl, // serverUrl - reconnect after reload
                    'Server 1', // serverDisplayName
                );
                return;
            } catch (error) {
                lastError = error;
                attempt += 1;
                if (attempt < maxAttempts) {
                    // eslint-disable-next-line no-await-in-loop
                    await wait(timeouts.ONE_SEC);
                }
            }
        }

        throw lastError;
    };

    loginAsAdmin = async (user: any = {}) => {
        const maxAttempts = 3;
        let attempt = 0;
        let lastError;

        while (attempt < maxAttempts) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await this.toBeVisible();
                // eslint-disable-next-line no-await-in-loop
                await this.usernameInput.tap({x: 150, y: 10});

                // eslint-disable-next-line no-await-in-loop
                await this.usernameInput.replaceText(user.username);
                // eslint-disable-next-line no-await-in-loop
                await this.passwordInput.tap();
                // eslint-disable-next-line no-await-in-loop
                await this.passwordInput.replaceText(user.password);
                // eslint-disable-next-line no-await-in-loop
                await this.loginFormInfoText.tap();
                // eslint-disable-next-line no-await-in-loop
                await this.signinButton.tap();

                // eslint-disable-next-line no-await-in-loop
                await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(isAndroid() ? timeouts.ONE_MIN : timeouts.HALF_MIN);

                // Admin users may see a "Server upgrade required" dialog when the
                // server version is older than the minimum supported. There are two
                // variants with different button text:
                //   1. unsupportedServerAdminAlert (server/index.ts) — "Dismiss" button
                //   2. GlobalEventHandler.onServerVersionChanged — "OK" button
                // On Android, native alert buttons are rendered in uppercase
                // ("DISMISS", "OK"). Try each variant to dismiss whichever appears.
                try {
                    // eslint-disable-next-line no-await-in-loop
                    const serverUpgradeTitle = element(by.text('Server upgrade required'));
                    // eslint-disable-next-line no-await-in-loop
                    await waitFor(serverUpgradeTitle).toBeVisible().withTimeout(timeouts.TWO_SEC);

                    // Try "Dismiss" first (unsupportedServerAdminAlert variant)
                    try {
                        const dismissBtn = isAndroid() ? element(by.text('DISMISS')) : element(by.text('Dismiss'));
                        // eslint-disable-next-line no-await-in-loop
                        await waitFor(dismissBtn).toBeVisible().withTimeout(timeouts.ONE_SEC);
                        // eslint-disable-next-line no-await-in-loop
                        await dismissBtn.tap();
                    } catch {
                        // Try "OK" (GlobalEventHandler variant)
                        try {
                            const okBtn = isAndroid() ? element(by.text('OK')) : element(by.text('OK'));
                            // eslint-disable-next-line no-await-in-loop
                            await okBtn.tap();
                        } catch { /* neither button found */ }
                    }
                } catch { /* dialog not present */ }

                return;
            } catch (error) {
                lastError = error;
                attempt += 1;
                if (attempt < maxAttempts) {
                    // eslint-disable-next-line no-await-in-loop
                    await wait(timeouts.ONE_SEC);
                    // eslint-disable-next-line no-await-in-loop
                    await device.reloadReactNative();
                }
            }
        }

        throw lastError;
    };
}

const loginScreen = new LoginScreen();
export default loginScreen;
