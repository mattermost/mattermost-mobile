// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {serverUrl} from '../test_config';

// ****************************************************************
// Select Server Screen
// ****************************************************************

/**
 * fulfillSelectServerScreen enters server URL on Select Server screen and then tap connect button.
 * @param {String} url - server URL
 */
export async function fulfillSelectServerScreen(url) {
    await expect(element(by.id('select_server_screen'))).toBeVisible();

    await element(by.id('server_url_input')).replaceText(url);

    // # Tap anywhere to hide keyboard
    await element(by.text('Enter Server URL')).tap();

    await element(by.id('connect_button')).tap();
}

// ****************************************************************
// Login Screen
// ****************************************************************

/**
 * fulfillLoginScreen enters credential on Login screen and then tap "Sign in" button to log in.
 * @param {Object} user - user to login with username and password
 */
export async function fulfillLoginScreen(user = {}) {
    await expect(element(by.id('login_screen'))).toBeVisible();

    await element(by.id('username_input')).replaceText(user.username);

    // # Tap anywhere to hide keyboard
    await element(by.text('Mattermost')).tap();

    await element(by.id('password_input')).replaceText(user.password);

    // # Tap anywhere to hide keyboard
    await element(by.text('Mattermost')).tap();

    await element(by.id('signin_button')).tap();
}

// ****************************************************************
// Channel Screen
// ****************************************************************

export async function toChannelScreen(user) {
    await fulfillSelectServerScreen(serverUrl);
    await fulfillLoginScreen(user);
}
