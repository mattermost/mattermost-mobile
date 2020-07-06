// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import env from '@helper/env';
import {fulfillSelectServerScreen} from '@helper/screen';

describe('Select Server', () => {
    beforeEach(async () => {
        await device.reloadReactNative();
    });

    it('should show Select server screen on initial load', async () => {
        // Verify basic elements on Select Server screen
        await expect(element(by.id('select_server_screen'))).toBeVisible();
        await expect(element(by.id('server_url_input'))).toBeVisible();
        await expect(element(by.id('connect_button'))).toBeVisible();
    });

    it('should show error on invalid server URL', async () => {
        await expect(element(by.id('select_server_screen'))).toBeVisible();

        // Enter invalid server URL
        await element(by.id('server_url_input')).clearText();
        await element(by.id('server_url_input')).typeText('http://invalid:8065');

        // Tap anywhere to hide keyboard
        await element(by.text('Enter Server URL')).tap();

        // Tap connect button
        await element(by.id('connect_button')).tap();

        // Verify that the error message is shown as expected
        await expect(element(by.id('error_text'))).toBeVisible();
        await expect(element(by.id('error_text'))).toHaveText('Cannot connect to the server. Please check your server URL and internet connection.');
    });

    it('should move to Login screen on valid server URL', async () => {
        await expect(element(by.id('select_server_screen'))).toBeVisible();

        // Enter valid server URL
        await element(by.id('server_url_input')).clearText();
        await element(by.id('server_url_input')).typeText(env.siteUrl);

        // Tap connect button
        await element(by.id('connect_button')).tap();

        // Verify that it goes into Login screen
        await expect(element(by.id('login_screen'))).toBeVisible();
    });

    it('should match elements on Login screen', async () => {
        await fulfillSelectServerScreen();

        // Verify basic elements on Login screen
        await expect(element(by.id('login_screen'))).toBeVisible();

        await expect(element(by.id('username_input'))).toBeVisible();
        await expect(element(by.id('password_input'))).toBeVisible();

        await expect(element(by.id('signin_button'))).toBeVisible();
    });

    it('should show error on missing any of the username or password', async () => {
        await fulfillSelectServerScreen();

        await expect(element(by.id('login_screen'))).toBeVisible();

        // On Login screen, enter invalid username
        await element(by.id('username_input')).typeText('any');

        // Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Tap signin button
        await element(by.id('signin_button')).tap();

        // Verify that the error message is shown as expected
        await expect(element(by.id('error_text'))).toBeVisible();
        await expect(element(by.id('error_text'))).toHaveText('Please enter your password');

        // Clear input to username and enter invalid password
        await element(by.id('username_input')).clearText();
        await element(by.id('password_input')).typeText('any');

        // Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Tap signin button
        await element(by.id('signin_button')).tap();

        // Verify that the error message is shown as expected
        await expect(element(by.id('error_text'))).toBeVisible();
        await expect(element(by.id('error_text'))).toHaveText('Please enter your email or username');
    });

    it('should show error on incorrect credential', async () => {
        await fulfillSelectServerScreen();

        await expect(element(by.id('login_screen'))).toBeVisible();

        // Enter invalid username
        await element(by.id('username_input')).clearText();
        await element(by.id('username_input')).typeText('any');

        // Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Enter invalid password
        await element(by.id('password_input')).clearText();
        await element(by.id('password_input')).typeText('any');

        // Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Tap signin button
        await element(by.id('signin_button')).tap();

        // Verify that the error message is shown as expected
        await expect(element(by.id('error_text'))).toBeVisible();
        await expect(element(by.id('error_text'))).toHaveText('Enter a valid email or username and/or password.');
    });

    it('should move to Channel screen on successful login', async () => {
        await fulfillSelectServerScreen();

        await expect(element(by.id('login_screen'))).toBeVisible();

        // Enter valid username
        await element(by.id('username_input')).clearText();
        await element(by.id('username_input')).typeText(env.adminUsername);

        // # Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Enter valid password
        await element(by.id('password_input')).clearText();
        await element(by.id('password_input')).typeText(env.adminPassword);

        // # Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Tap signin button
        await element(by.id('signin_button')).tap();

        // Verify that it goes into Channel screen
        await expect(element(by.id('channel_screen'))).toBeVisible();
    });

    it('should directly go into Channel screen on reload', async () => {
        // On reload and after successful login, verify that it goes straight into Channel screen
        await expect(element(by.id('channel_screen'))).toBeVisible();
    });
});
