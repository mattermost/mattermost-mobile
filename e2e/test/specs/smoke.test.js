// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-unused-expressions */

const {CONNECT_TO_SERVER_SCREEN, LOGIN_SCREEN, APP_SCREEN} = require('../../screens');

describe('Smoke', () => {
    it('Select server URL', () => {
        const serverInstance = 'http://10.0.2.2:8065';
        const testUser = {username: 'user-1', password: 'SampleUs@r-1'};

        $(CONNECT_TO_SERVER_SCREEN.serverUrlInput).waitForDisplayed();
        const fieldText = $(CONNECT_TO_SERVER_SCREEN.serverUrlInput).getText();
        expect(fieldText).to.equal('https://mattermost.example.com');

        // Inspect: Connect button
        const connectButtonText = $(CONNECT_TO_SERVER_SCREEN.connectButton).
            $('android.widget.TextView').
            getText();
        expect(connectButtonText).to.equal('Connect');

        // Connect without having a URL in field
        $(CONNECT_TO_SERVER_SCREEN.connectButton).touchAction('tap');
        const errorMsg = $(CONNECT_TO_SERVER_SCREEN.errorMessage).getText();
        expect(errorMsg).to.equal('URL must start with http:// or https://');

        // Input server instance into field
        $(CONNECT_TO_SERVER_SCREEN.serverUrlInput).touchAction('tap');
        $(CONNECT_TO_SERVER_SCREEN.serverUrlInput).setValue(serverInstance);

        // Verify text was input correctly
        const serverInputText = $(CONNECT_TO_SERVER_SCREEN.serverUrlInput).getText();
        expect(serverInputText).to.equal(serverInstance);

        // Tap the connect button
        $(CONNECT_TO_SERVER_SCREEN.connectButton).touchAction('tap');

        // Wait for email address to be visible
        $(LOGIN_SCREEN.emailInput).waitForDisplayed();

        // Verify screen CONNECT_TO_SERVER_SCREEN
        expect($(LOGIN_SCREEN.emailInput).isDisplayed()).to.equal(true, 'Email address input is not displayed');
        expect($(LOGIN_SCREEN.passwordInput).isDisplayed()).to.equal(true, 'Password input is not displayed');
        expect($(LOGIN_SCREEN.signInButton).isDisplayed()).to.equal(true, 'Sign in button is not displayed');
        expect($(LOGIN_SCREEN.forgotPasswordButton).isDisplayed()).to.equal(
            true,
            'Forgot password button is not displayed'
        );

        // Verify submitting without credentials displays error
        $(LOGIN_SCREEN.signInButton).touchAction('tap');
        $(LOGIN_SCREEN.errorMessage).waitForDisplayed();
        expect($(LOGIN_SCREEN.errorMessage).getText()).to.equal('Please enter your email or username');

        // Login with user
        $(LOGIN_SCREEN.emailInput).setValue(testUser.username);
        $(LOGIN_SCREEN.passwordInput).setValue(testUser.password);
        $(LOGIN_SCREEN.signInButton).touchAction('tap');

        // Wait until we see Town Square
        $(APP_SCREEN.townSquare).waitForDisplayed();
    });
});
