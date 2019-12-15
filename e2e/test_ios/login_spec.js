// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *********************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use accessibility ID when selecting an element. Create one if none.
// *********************************************************************

import PermissionScreen from '../screen_objects/alert_permission_dialog';
import SelectServerScreen from '../screen_objects/select_server_screen';
import LoginScreen from '../screen_objects/login_screen';
import ChannelScreen from '../screen_objects/channel_screen';

import users from '../fixtures/users.json';

describe('Login', () => {
    it('should be able to email login successfully', () => {
        const user = users['user-1'];

        connectToServer();

        // * Check if login options creen in shown
        // LoginOptionsScreen.waitForIsShown(true);

        // # Choose email login
        // LoginOptionsScreen.clickEmailLoginOptionButton();

        // * Check if login screen in shown
        LoginScreen.waitForIsShown(true);

        // # Fill out email and password and sign in
        LoginScreen.editEmailOrUsernameInput(user.email);
        LoginScreen.editPasswordInput(user.password);
        LoginScreen.clickSignInButton();

        // * Check if channel screen is shown
        ChannelScreen.waitForIsShown(true);
    });

    function connectToServer() {
        const serverUrl = browser.config.baseUrl;

        // # Click permission allow button if shown
        browser.pause(2000);

        if (PermissionScreen.allowButton != null) {
            PermissionScreen.clickAllowButton();
        }

        // * Check if server screen is shown
        // SelectServerScreen.waitForIsShown(true);

        // * Check logo image is displayed
        expect(SelectServerScreen.logoImage.isDisplayed()).toBe(true);

        // # Connect to server
        SelectServerScreen.editUrlInput(serverUrl);
        SelectServerScreen.clickConnectButton();
    }
});
