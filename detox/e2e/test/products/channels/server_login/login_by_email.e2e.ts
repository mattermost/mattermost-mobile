// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Server Login - Login by Email', () => {
    const {
        backButton,
        descriptionEnterCredentials,
        forgotPasswordButton,
        passwordInput,
        passwordInputError,
        signinButton,
        signinButtonDisabled,
        titleLoginToAccount,
        usernameInput,
    } = LoginScreen;
    const serverOneDisplayName = 'Server 1';

    beforeAll(async () => {
        // # Connect to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
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
        await expect(titleLoginToAccount).toHaveText('Log In to Your Account');
        await expect(descriptionEnterCredentials).toHaveText('Enter your login details below.');
        await expect(usernameInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(forgotPasswordButton).toBeVisible();
        await expect(signinButtonDisabled).toBeVisible();
    });

    it('MM-T4677_2 - should show disabled signin button on empty username or password', async () => {
        // # Log in with empty username and non-empty password
        await usernameInput.clearText();
        await passwordInput.replaceText('password');
        await wait(timeouts.TWO_SEC);

        // * Verify signin button is disabled
        await expect(signinButtonDisabled).toBeVisible();

        // # Log in with non-empty username and empty password
        await usernameInput.replaceText('username');
        await passwordInput.clearText();
        await LoginScreen.loginFormInfoText.tap();

        // * Verify signin button is disabled
        await expect(signinButtonDisabled).toBeVisible();
    });

    it('MM-T4677_3 - should show incorrect combination error on incorrect credentials', async () => {
        // # Log in with incorrect credentials
        await usernameInput.replaceText('username');
        await passwordInput.replaceText('password');
        await wait(timeouts.TWO_SEC);
        await LoginScreen.loginFormInfoText.tap();
        await signinButton.tap();

        // * Verify incorrect combination error
        await expect(passwordInputError).toHaveText('The email and password combination is incorrect');
    });

    it('MM-T4677_4 - should show channel list screen on successful login', async () => {
        // # Log in to server with correct credentials
        const {team, user} = await Setup.apiInit(siteOneUrl);
        await usernameInput.replaceText(user.newUser.username);
        await passwordInput.replaceText(user.newUser.password);
        await LoginScreen.loginFormInfoText.tap();

        await signinButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify on channel list screen and channel list header shows team display name and server display name
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(team.display_name);
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);
    });
});
