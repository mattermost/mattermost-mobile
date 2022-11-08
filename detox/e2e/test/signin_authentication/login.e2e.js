// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    ChannelScreen,
    LoginScreen,
} from '@support/ui/screen';

describe('Login', () => {
    let user;

    const {
        errorText: loginErrorText,
        usernameInput,
        passwordInput,
        signinButton,
    } = LoginScreen;

    beforeAll(async () => {
        ({user} = await Setup.apiInit());
    });

    beforeEach(async () => {
        await device.reloadReactNative();
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('should match elements on Login screen', async () => {
        await LoginScreen.open();

        // * Verify basic elements on Login screen
        await expect(usernameInput).toBeVisible();
        await expect(passwordInput).toBeVisible();

        await expect(signinButton).toBeVisible();
    });

    it('should show error on missing any of the username or password', async () => {
        const loginScreen = await LoginScreen.open();

        // # On Login screen, enter invalid username
        await usernameInput.typeText('any');

        // # Tap anywhere to hide keyboard
        await loginScreen.tap({x: 5, y: 10});

        // # Tap "Sign in" button
        await signinButton.tap();

        // * Verify that the error message is shown as expected
        await expect(loginErrorText).toBeVisible();
        await expect(loginErrorText).toHaveText('Please enter your password');

        // # Clear input to username and enter invalid password
        await usernameInput.replaceText('');
        await passwordInput.typeText('any');

        // # Tap anywhere to hide keyboard
        await loginScreen.tap({x: 5, y: 10});

        // # Tap "Sign in" button
        await signinButton.tap();

        // * Verify that the error message is shown as expected
        await expect(loginErrorText).toBeVisible();
        await expect(loginErrorText).toHaveText('Please enter your email or username');
    });

    it('should show error on incorrect credential', async () => {
        const loginScreen = await LoginScreen.open();

        // # Enter invalid username
        await usernameInput.replaceText('any');

        // # Tap anywhere to hide keyboard
        await loginScreen.tap({x: 5, y: 10});

        // # Enter invalid password
        await passwordInput.replaceText('any');

        // # Tap anywhere to hide keyboard
        await loginScreen.tap({x: 5, y: 10});

        // # Tap "Sign in" button
        await signinButton.tap();

        // * Verify that the error message is shown as expected
        await expect(loginErrorText).toBeVisible();
        await expect(loginErrorText).toHaveText('Enter a valid email or username and/or password.');
    });

    it('should move to Channel screen on successful login', async () => {
        const loginScreen = await LoginScreen.open();

        // # Enter valid username
        await usernameInput.replaceText(user.username);

        // # Tap anywhere to hide keyboard
        await loginScreen.tap({x: 5, y: 10});

        // # Enter valid password
        await passwordInput.replaceText(user.password);

        // # Tap anywhere to hide keyboard
        await loginScreen.tap({x: 5, y: 10});

        // # Tap "Sign in" button
        await signinButton.tap();

        // * Verify that it goes into Channel screen
        await ChannelScreen.toBeVisible();
    });

    it('should directly go into Channel screen on reload', async () => {
        // # On reload and after successful login, verify that it goes straight into Channel screen
        await ChannelScreen.toBeVisible();
    });
});
