// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {serverUrl} from '@support/test_config';

describe('Smoke Tests', () => {
    it('MM-T3179 Log in - Email / password', async () => {
        const {user} = await Setup.apiInit();

        // * Verify that it starts with the Select Server screen
        await expect(element(by.id('select_server_screen'))).toBeVisible();

        // # Type in the server URL
        await element(by.id('server_url_input')).replaceText(serverUrl);

        // # Tap connect button
        await element(by.text('Connect')).tap();

        // # Verify that it goes into Login screen
        await expect(element(by.id('login_screen'))).toBeVisible();

        // # Type in username
        await element(by.id('username_input')).replaceText(user.username);

        // # Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // # Type in password
        await element(by.id('password_input')).replaceText(user.password);

        // # Tap anywhere to hide keyboard
        await element(by.text('Mattermost')).tap();

        // # Tap "Sign in" button
        await element(by.text('Sign in')).tap();

        // * Verify that the user has successfully logged in by checking it redirects into the Channel screen
        await expect(element(by.id('channel_screen'))).toBeVisible();
    });
});
