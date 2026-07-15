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
import {expect, waitFor} from 'detox';

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
        const expected = 'The email and password combination is incorrect';
        let lastText = '';

        // iOS sim URLSession intermittently drops the first login POST (-1005).
        // Retry until we get the invalid-credentials string (not a transport error).
        /* eslint-disable no-await-in-loop */
        for (let attempt = 0; attempt < 3; attempt++) {
            await usernameInput.replaceText('username');
            await passwordInput.replaceText('password');
            await wait(timeouts.TWO_SEC);
            await LoginScreen.loginFormInfoText.tap();
            await signinButton.tap();

            try {
                await waitFor(passwordInputError).toHaveText(expected).withTimeout(timeouts.TEN_SEC);
                return;
            } catch {
                try {
                    const attrs = await passwordInputError.getAttributes();
                    lastText = 'text' in attrs && typeof attrs.text === 'string' ? attrs.text : String(attrs);
                } catch {
                    lastText = '';
                }
                if (!/network connection was lost|\[object Object\]/i.test(lastText) || attempt === 2) {
                    break;
                }
                await wait(timeouts.TWO_SEC);
            }
        }
        /* eslint-enable no-await-in-loop */

        await expect(passwordInputError).toHaveText(expected);
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
