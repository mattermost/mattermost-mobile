// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Mfa, Setup, System, User} from '@support/server_api';
import {SITE_THREE_LOCK_TIMEOUT_MS, siteThreeLock} from '@support/site_three_lock';
import {
    hasThreeDistinctServers,
    serverThreeUrl,
    siteThreeUrl,
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

/**
 * Enabling MFA is server-wide, so it must not run against SITE_1 (shared with Maestro
 * and the other Detox shards). Same SITE_3 + lock + hasThreeDistinctServers gate as
 * custom_terms_of_service: siteThreeUrl falls back to siteOneUrl on 2-server topologies.
 */
jest.setTimeout(timeouts.ONE_MIN * 25);

const describeApiError = (error: any, status?: number): string => {
    return `status ${status ?? 'unknown'}: ${error?.message ?? error?.id ?? 'unknown error'}`;
};

const describeOrSkip = hasThreeDistinctServers ? describe : describe.skip;

describeOrSkip('Server Login - Login with MFA', () => {
    const {
        loginFormInfoText,
        passwordInput,
        signinButton,
        usernameInput,
    } = LoginScreen;
    const serverDisplayName = 'Server 1';
    let lockOwner = '';
    let lockAcquired = false;
    let testUser: any;
    let mfaSecret = '';

    beforeAll(async () => {
        lockOwner = siteThreeLock.createOwner();
        await siteThreeLock.acquire(siteThreeUrl, lockOwner, {timeoutMs: SITE_THREE_LOCK_TIMEOUT_MS});
        lockAcquired = true;

        await User.apiAdminLogin(siteThreeUrl);

        // A cancelled job leaves EnableMultifactorAuthentication on; clear it first.
        const healResult = await System.apiPatchConfig(siteThreeUrl, {
            ServiceSettings: {EnableMultifactorAuthentication: false},
        });
        if (healResult.error) {
            throw new Error(`Failed to heal-disable MFA: ${describeApiError(healResult.error, healResult.status)}`);
        }
        await System.waitForClientConfigFlag(siteThreeUrl, 'EnableMultifactorAuthentication', 'false');

        const enableResult = await System.apiPatchConfig(siteThreeUrl, {
            ServiceSettings: {EnableMultifactorAuthentication: true},
        });
        if (enableResult.error) {
            throw new Error(`Failed to enable MFA: ${describeApiError(enableResult.error, enableResult.status)}`);
        }
        const mfaEnabled = await System.waitForClientConfigFlag(siteThreeUrl, 'EnableMultifactorAuthentication', 'true');
        if (!mfaEnabled) {
            throw new Error('EnableMultifactorAuthentication never became "true" on SITE_3');
        }

        const {user} = await Setup.apiInit(siteThreeUrl);
        testUser = user;

        const mfaResult = await Mfa.apiEnableMfaForUser(siteThreeUrl, {
            username: user.newUser.username,
            password: user.newUser.password,
        });
        if (mfaResult.error) {
            throw new Error(`Failed to enable MFA for user: ${describeApiError(mfaResult.error, mfaResult.status)}`);
        }
        mfaSecret = mfaResult.secret;

        await ServerScreen.connectToServer(serverThreeUrl, serverDisplayName);
    }, timeouts.ONE_MIN * 22);

    afterAll(async () => {
        if (!lockAcquired) {
            return;
        }

        try {
            await HomeScreen.logout();
        } catch {
            // Suite may have failed before a session existed.
        } finally {
            try {
                const loginResult = await User.apiAdminLogin(siteThreeUrl);
                const configResult = await System.apiPatchConfig(siteThreeUrl, {
                    ServiceSettings: {EnableMultifactorAuthentication: false},
                });
                if (loginResult.error || configResult.error) {
                    throw new Error(
                        'afterAll failed to restore admin session or disable MFA ' +
                        `(login=${describeApiError(loginResult.error, loginResult.status)}; ` +
                        `config=${describeApiError(configResult.error, configResult.status)})`,
                    );
                }
                const mfaDisabled = await System.waitForClientConfigFlag(siteThreeUrl, 'EnableMultifactorAuthentication', 'false');
                if (!mfaDisabled) {
                    throw new Error('EnableMultifactorAuthentication never became "false" on SITE_3 after teardown');
                }
            } finally {
                await siteThreeLock.release(siteThreeUrl, lockOwner);
            }
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
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverDisplayName);
    });
});
