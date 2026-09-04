// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Mfa, Setup, System, User} from '@support/server_api';
import {
    adminPassword,
    adminUsername,
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    MfaScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait} from '@support/utils';
import {generateTotp, waitForNextTotpWindow} from '@support/utils/totp';
import {expect} from 'detox';

describe('Server Login - Login with MFA', () => {
    const {
        loginFormInfoText,
        passwordInput,
        signinButton,
        usernameInput,
    } = LoginScreen;
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let mfaSecret = '';

    beforeAll(async () => {
        // # Enable MFA on the server (admin session) so the user can be enrolled
        await System.apiPatchConfig(siteOneUrl, {
            ServiceSettings: {EnableMultifactorAuthentication: true},
        });

        // # Create a user and enable MFA for it via the API
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        const mfaResult = await Mfa.apiEnableMfaForUser(siteOneUrl, {
            username: user.newUser.username,
            password: user.newUser.password,
        });
        if (mfaResult.error) {
            throw new Error(`Failed to enable MFA for user: ${JSON.stringify(mfaResult.error)}`);
        }
        mfaSecret = mfaResult.secret;

        // # Connect to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
    });

    afterAll(async () => {
        try {
            await HomeScreen.logout();
        } finally {
            // # Restore the admin session and disable MFA on the server
            await User.apiLogin(siteOneUrl, {username: adminUsername, password: adminPassword});
            await System.apiPatchConfig(siteOneUrl, {
                ServiceSettings: {EnableMultifactorAuthentication: false},
            });
        }
    });

    beforeEach(async () => {
        // * Verify on login screen
        await LoginScreen.toBeVisible();

        // # Clear fields
        await usernameInput.clearText();
        await passwordInput.clearText();
    });

    it('MM-T3181 - should log in with a valid MFA token', async () => {
        // # Enter credentials for the MFA-enabled user
        await usernameInput.replaceText(testUser.newUser.username);
        await passwordInput.replaceText(testUser.newUser.password);
        await loginFormInfoText.tap();
        await signinButton.tap();

        // * Verify the MFA screen is shown
        await MfaScreen.toBeVisible();

        // # Compute a fresh TOTP code from a new window and submit it. The
        // activation step is recorded server-side (DisallowReuse), so a code
        // from the same 30s window would be rejected as a replay.
        await waitForNextTotpWindow();
        const token = generateTotp(mfaSecret);

        // # Dismiss the iOS "Save Password?" system sheet when shown. It pops
        // up asynchronously once the password is validated (MFA challenge) and
        // its backdrop view covers the MFA input, blocking hit-tests. The sheet
        // is normally suppressed via utils/disable_ios_autofill.js; tap "Not Now"
        // directly as a fallback — if it is not present Detox throws fast and we
        // proceed (same pattern as AccountScreen).
        if (isIos()) {
            try {
                await element(by.label('Not Now')).atIndex(0).tap();
                await wait(timeouts.ONE_SEC);
            } catch {
                // Sheet not shown — nothing to dismiss
            }
        }

        await MfaScreen.submitToken(token);
        await wait(timeouts.TWO_SEC);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);
    });
});
