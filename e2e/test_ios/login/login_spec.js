// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *********************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use accessibility ID when selecting an element. Create one if none.
// *********************************************************************

import SelectServerScreen from '../../screen_objects/select_server_screen';
import LoginScreen from '../../screen_objects/login_screen';
import ChannelScreen from '../../screen_objects/channel_screen';

import PermissionDialog from '../../screen_objects/components/permission_dialog';

import users from '../../fixtures/users.json';

describe('Login', () => {
    it('should be able to email login successfully', () => {
        const user = users['user-1'];

        browser.pause(2000);

        // # Click permission allow button if shown
        const dialogButton = PermissionDialog.allowButton;
        if (!dialogButton.error) {
            PermissionDialog.clickAllowButton();
        }

        SelectServerScreen.connectToServer(browser.config.serverUrl);

        // * Check if login screen is shown
        LoginScreen.waitForIsShown(true);

        // # Fill out email and password and sign in
        LoginScreen.editEmailOrUsernameInput(user.email);
        LoginScreen.editPasswordInput(user.password);
        LoginScreen.clickSignInButton();

        // * Check if channel screen is shown
        ChannelScreen.waitForIsShown(true);
    });
});
