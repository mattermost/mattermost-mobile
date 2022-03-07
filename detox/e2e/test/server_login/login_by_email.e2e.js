// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverUrl} from '@support/test_config';
import {
    ChannelListScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';

describe('Server Login - Login by Email', () => {
    const {
        connectButton,
        serverDisplayNameInput,
        serverUrlInput,
    } = ServerScreen;
    const {
        backButton,
        forgotPasswordButton,
        passwordInput,
        passwordInputError,
        signinButton,
        signinButtonDisabled,
        usernameInput,
    } = LoginScreen;
    const serverDisplayName = 'Server 1';

    beforeAll(async () => {
        // * Verify on server screen
        await ServerScreen.toBeVisible();

        // # Connect to server
        await serverUrlInput.replaceText(serverUrl);
        await serverDisplayNameInput.replaceText(serverDisplayName);
        await connectButton.tap();
    });

    beforeEach(async () => {
        // * Verify on login screen
        await LoginScreen.toBeVisible();

        // # Clear fields
        await usernameInput.clearText();
        await passwordInput.clearText();
    });

    it('MM-T4677_1 - should match elements on login screen', async () => {
        // * Verify basic elements on login screen
        await expect(backButton).toBeVisible();
        await expect(usernameInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(forgotPasswordButton).toBeVisible();
        await expect(signinButtonDisabled).toBeVisible();
    });

    it('MM-T4677_2 - should show disabled signin button on empty username or password', async () => {
        // # Log in with empty username and non-empty password
        await usernameInput.replaceText('');
        await passwordInput.replaceText('password');

        // * Verify signin button is disabled
        await expect(signinButtonDisabled).toBeVisible();

        // # Log in with non-empty username and empty password
        await usernameInput.replaceText('username');
        await passwordInput.replaceText('');

        // * Verify signin button is disabled
        await expect(signinButtonDisabled).toBeVisible();
    });

    it('MM-T4677_3 - should show incorrect combination error on incorrect credentials', async () => {
        // # Log in with incorrect credentials
        await usernameInput.replaceText('username');
        await passwordInput.replaceText('password');
        await signinButton.tap();

        // * Verify incorrect combination error
        await expect(passwordInputError).toHaveText('The email and password combination is incorrect');
    });

    it('MM-T4677_4 - should show channel list screen on successful login', async () => {
        // # Log in to server with correct credentials
        const {user} = await Setup.apiInit(serverUrl);
        await usernameInput.replaceText(user.username);
        await passwordInput.replaceText(user.password);
        await signinButton.tap();

        // * Verify on channel list screen and channel list header shows server display name
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverDisplayName);
    });
});
