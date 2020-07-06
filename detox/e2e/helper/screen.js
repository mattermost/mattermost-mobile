// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import env from './env';

/**
 * fulfillSelectServerScreen enters site URL on Select Server screen and then tap connect button.
 * @param {String} url - site URL with default supplied from env variable
 */
export async function fulfillSelectServerScreen(url = env.siteUrl) {
    await expect(element(by.id('select_server_screen'))).toBeVisible();

    await element(by.id('server_url_input')).clearText();
    await element(by.id('server_url_input')).typeText(url);

    // # Tap anywhere to hide keyboard
    await element(by.text('Enter Server URL')).tap();

    await element(by.id('connect_button')).tap();
}

/**
 * fulfillLoginScreen enters credential on Login screen and then tap signin button to log in.
 * @param {String} options.username - username with admin username as default supplied from env variable
 * @param {String} options.password - password with admin password as default supplied from env variable
 */
export async function fulfillLoginScreen({username = env.adminUsername, password = env.adminPassword} = {}) {
    await expect(element(by.id('login_screen'))).toBeVisible();

    await element(by.id('username_input')).clearText();
    await element(by.id('username_input')).typeText(username);

    // # Tap anywhere to hide keyboard
    await element(by.text('Mattermost')).tap();

    await element(by.id('password_input')).clearText();
    await element(by.id('password_input')).typeText(password);

    // # Tap anywhere to hide keyboard
    await element(by.text('Mattermost')).tap();

    await element(by.id('signin_button')).tap();
}
