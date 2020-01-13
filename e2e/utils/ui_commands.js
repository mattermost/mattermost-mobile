// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import SelectServerScreen from '../screen_objects/select_server_screen';
import LoginScreen from '../screen_objects/login_screen';
import ChannelScreen from '../screen_objects/channel_screen';

import PermissionDialog from '../screen_objects/components/permission_dialog';

import users from '../fixtures/users.json';

export function login(username) {
    const user = users[username];

    browser.pause(2000);

    // # Click permission allow button if shown
    const dialogButton = PermissionDialog.allowButton;
    if (!dialogButton.error) {
        PermissionDialog.clickAllowButton();
    }

    SelectServerScreen.connectToServer(browser.config.serverUrl);

    // * Check if login screen in shown
    LoginScreen.waitForIsShown(true);

    // # Fill out email and password and sign in
    LoginScreen.editEmailOrUsernameInput(user.email);
    LoginScreen.editPasswordInput(user.password);
    LoginScreen.clickSignInButton();

    // * Check if channel screen is shown
    ChannelScreen.waitForIsShown(true);

    browser.pause(2000);
}

export default {
    login,
};
