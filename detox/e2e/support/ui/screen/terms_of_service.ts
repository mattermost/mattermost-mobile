// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {ChannelListScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class TermsOfServiceScreen {
    testID = {
        termsOfServiceScreen: 'terms_of_service.screen',
        title: 'terms_of_service.title',
        acceptButton: 'terms_of_service.accept.button',
        declineButton: 'terms_of_service.decline.button',
    };

    termsOfServiceScreen = element(by.id(this.testID.termsOfServiceScreen));
    title = element(by.id(this.testID.title));
    acceptButton = element(by.id(this.testID.acceptButton));
    declineButton = element(by.id(this.testID.declineButton));

    toBeVisible = async () => {
        const timeout = isAndroid() ? timeouts.ONE_MIN : timeouts.HALF_MIN;

        await waitFor(this.termsOfServiceScreen).toExist().withTimeout(timeout);
        await waitFor(this.acceptButton).toExist().withTimeout(timeout);
        await waitFor(this.declineButton).toExist().withTimeout(timeout);

        return this.termsOfServiceScreen;
    };

    /**
     * Submit login credentials and wait for the custom ToS modal (not the channel list).
     */
    loginUntilVisible = async (user: any = {}) => {
        await LoginScreen.toBeVisible();

        await LoginScreen.usernameInput.tap({x: 150, y: 10});
        await LoginScreen.usernameInput.replaceText(user.newUser?.email || user.email);
        await LoginScreen.passwordInput.tap();
        await LoginScreen.passwordInput.replaceText(user.newUser?.password || user.password);
        await LoginScreen.loginFormInfoText.tap();
        await LoginScreen.signinButton.tap();

        // Optional post-login system / push-proxy alerts can cover the ToS modal.
        if (isIos()) {
            try {
                await element(by.label('Not Now')).tap();
                await wait(timeouts.HALF_SEC);
            } catch {
                // not present
            }
            try {
                await element(by.label('Okay')).tap();
                await wait(timeouts.HALF_SEC);
            } catch {
                // not present
            }
        } else {
            try {
                await waitFor(Alert.okayButton).toExist().withTimeout(timeouts.TWO_SEC);
                await Alert.okayButton.tap();
            } catch {
                // not present
            }
        }

        return this.toBeVisible();
    };

    accept = async () => {
        await this.acceptButton.tap();
        await waitFor(this.termsOfServiceScreen).not.toExist().withTimeout(timeouts.HALF_MIN);
        await ChannelListScreen.toBeVisible();
        await HomeScreen.toBeVisible();
    };

    declineAndConfirmLogout = async () => {
        await this.declineButton.tap();

        // * Decline confirmation alert
        await waitFor(Alert.termsDeclinedTitle).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(Alert.termsDeclinedTitle).toBeVisible();

        // # Confirm logout — expected destination is the server address screen
        await Alert.okButton.tap();
        await waitFor(ServerScreen.serverScreen).toExist().withTimeout(timeouts.HALF_MIN);
        await waitFor(ServerScreen.serverUrlInput).toExist().withTimeout(timeouts.TEN_SEC);

        // * No authenticated home chrome after decline
        await expect(HomeScreen.channelListTab).not.toExist();
        await expect(ChannelListScreen.channelListScreen).not.toExist();
    };
}

const termsOfServiceScreen = new TermsOfServiceScreen();
export default termsOfServiceScreen;
