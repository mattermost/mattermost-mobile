// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverUrl} from '@support/test_config';
import {fulfillSelectServerScreen, logoutUser} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';

describe('On boarding', () => {
    let user;

    beforeAll(async () => {
        ({user} = await Setup.apiInit());
    });

    beforeEach(async () => {
        await device.reloadReactNative();
    });

    afterAll(async () => {
        await logoutUser();
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
        const input = element(by.id('server_url_input'));
        input.clearText();
        await input.typeText('http://invalid:8065');

        // Tap anywhere to hide keyboard
        await element(by.text('Enter Server URL')).tap();

        // Verify that the error message does not exist
        await waitFor(element(by.id('error_text'))).not.toExist().withTimeout(timeouts.HALF_SEC);

        // Tap connect button
        await element(by.id('connect_button')).tap();

        // Explicitly wait on Android before verifying error message
        if (isAndroid()) {
            await wait(timeouts.TWO_SEC);
        }

        // Verify error message
        await waitFor(element(by.id('error_text'))).toBeVisible().withTimeout(timeouts.ONE_MIN);
        await expect(element(by.id('error_text'))).toHaveText('Cannot connect to the server. Please check your server URL and internet connection.');
    });

    it('should move to Login screen on valid server URL', async () => {
        await expect(element(by.id('select_server_screen'))).toBeVisible();

        // Enter valid server URL
        await element(by.id('server_url_input')).replaceText(serverUrl);

        // Tap connect button
        await element(by.id('connect_button')).tap();

        // Verify that it goes into Login screen
        await expect(element(by.id('login_screen'))).toBeVisible();
    });

    it('should match elements on Login screen', async () => {
        await fulfillSelectServerScreen(serverUrl);

        // Verify basic elements on Login screen
        await expect(element(by.id('login_screen'))).toBeVisible();

        await expect(element(by.id('username_input'))).toBeVisible();
        await expect(element(by.id('password_input'))).toBeVisible();

        await expect(element(by.id('signin_button'))).toBeVisible();
    });

    it('should show error on missing any of the username or password', async () => {
        await fulfillSelectServerScreen(serverUrl);

        await expect(element(by.id('login_screen'))).toBeVisible();

        // On Login screen, enter invalid username
        await element(by.id('username_input')).typeText('any');

        // Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Tap "Sign in" button
        await element(by.id('signin_button')).tap();

        // Verify that the error message is shown as expected
        await expect(element(by.id('error_text'))).toBeVisible();
        await expect(element(by.id('error_text'))).toHaveText('Please enter your password');

        // Clear input to username and enter invalid password
        await element(by.id('username_input')).replaceText('');
        await element(by.id('password_input')).typeText('any');

        // Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Tap "Sign in" button
        await element(by.id('signin_button')).tap();

        // Verify that the error message is shown as expected
        await expect(element(by.id('error_text'))).toBeVisible();
        await expect(element(by.id('error_text'))).toHaveText('Please enter your email or username');
    });

    it('should show error on incorrect credential', async () => {
        await fulfillSelectServerScreen(serverUrl);

        await expect(element(by.id('login_screen'))).toBeVisible();

        // Enter invalid username
        await element(by.id('username_input')).replaceText('any');

        // Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Enter invalid password
        await element(by.id('password_input')).replaceText('any');

        // Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Tap "Sign in" button
        await element(by.id('signin_button')).tap();

        // Verify that the error message is shown as expected
        await expect(element(by.id('error_text'))).toBeVisible();
        await expect(element(by.id('error_text'))).toHaveText('Enter a valid email or username and/or password.');
    });

    it('should move to Channel screen on successful login', async () => {
        await fulfillSelectServerScreen(serverUrl);

        await expect(element(by.id('login_screen'))).toBeVisible();

        // Enter valid username
        await element(by.id('username_input')).replaceText(user.username);

        // # Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Enter valid password
        await element(by.id('password_input')).replaceText(user.password);

        // # Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // Tap "Sign in" button
        await element(by.id('signin_button')).tap();

        // Verify that it goes into Channel screen
        await expect(element(by.id('channel_screen'))).toBeVisible();
    });

    it('should directly go into Channel screen on reload', async () => {
        // On reload and after successful login, verify that it goes straight into Channel screen
        await expect(element(by.id('channel_screen'))).toBeVisible();
    });
});
