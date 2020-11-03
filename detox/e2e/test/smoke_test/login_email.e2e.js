// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {ChannelScreen, LoginScreen} from '@support/ui/screen';

describe('Smoke Tests', () => {
    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3179 Log in - Email / password', async () => {
        const {user} = await Setup.apiInit();

        // # Navigate to Login screen
        const loginScreen = await LoginScreen.open();

        const {usernameInput, passwordInput, signinButton} = LoginScreen;

        // # Type in username
        await usernameInput.replaceText(user.username);

        // # Tap anywhere to hide keyboard
        await loginScreen.tap({x: 5, y: 10});

        // # Type in password
        await passwordInput.replaceText(user.password);

        // # Tap anywhere to hide keyboard
        await loginScreen.tap({x: 5, y: 10});

        // # Tap "Sign in" button
        await signinButton.tap();

        // * Verify that the user has successfully logged in by checking it redirects into the Channel screen
        await ChannelScreen.toBeVisible();
    });
});
