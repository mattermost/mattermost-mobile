// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Mfa, Setup, System, User} from '@support/server_api';
import {canMutateServer, requireMutationServer} from '@support/server_role';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
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

// Enabling MFA is server-wide, so this runs alone on the mutation server
// (detox/e2e/server_mutation_specs.json).
jest.setTimeout(timeouts.ONE_MIN * 25);

const describeApiError = (error: any, status?: number): string => {
    return `status ${status ?? 'unknown'}: ${error?.message ?? error?.id ?? 'unknown error'}`;
};

const MFA_PATCH_ATTEMPTS = 3;

describe('Server Login - Login with MFA', () => {
    const {
        loginFormInfoText,
        passwordInput,
        signinButton,
        usernameInput,
    } = LoginScreen;
    const serverDisplayName = 'Server 1';
    let testUser: any;
    let mfaSecret = '';

    beforeAll(async () => {
        requireMutationServer('login_mfa');

        await User.apiAdminLogin(siteOneUrl);

        // A cancelled job leaves EnableMultifactorAuthentication on; clear it first.
        const healResult = await System.apiPatchConfig(siteOneUrl, {
            ServiceSettings: {EnableMultifactorAuthentication: false},
        });
        if (healResult.error) {
            throw new Error(`Failed to heal-disable MFA: ${describeApiError(healResult.error, healResult.status)}`);
        }
        await System.waitForClientConfigFlag(siteOneUrl, 'EnableMultifactorAuthentication', 'false');

        // An accepted patch does not always reach the client config; re-patch and poll again,
        // the same way enableChannelAttributes does. Report what was observed on the last try
        // so a server that owns the setting is distinguishable from one that is just slow.
        let mfaEnabled = false;
        /* eslint-disable no-await-in-loop -- sequential re-patch until client config catches up */
        for (let attempt = 1; attempt <= MFA_PATCH_ATTEMPTS && !mfaEnabled; attempt++) {
            const enableResult = await System.apiPatchConfig(siteOneUrl, {
                ServiceSettings: {EnableMultifactorAuthentication: true},
            });
            if (enableResult.error) {
                throw new Error(`Failed to enable MFA: ${describeApiError(enableResult.error, enableResult.status)}`);
            }
            mfaEnabled = await System.waitForClientConfigFlag(siteOneUrl, 'EnableMultifactorAuthentication', 'true');
        }
        /* eslint-enable no-await-in-loop */
        if (!mfaEnabled) {
            const {config: serverConfig} = await System.apiGetConfig(siteOneUrl);
            const {config: clientConfig} = await System.apiGetClientConfigOld(siteOneUrl);
            throw new Error(
                'EnableMultifactorAuthentication never became "true" on the mutation server. Last observed ' +
                `server=${String(serverConfig?.ServiceSettings?.EnableMultifactorAuthentication)} ` +
                `client=${String(clientConfig?.EnableMultifactorAuthentication)}.`,
            );
        }

        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        const mfaResult = await Mfa.apiEnableMfaForUser(siteOneUrl, {
            username: user.newUser.username,
            password: user.newUser.password,
        });
        if (mfaResult.error) {
            throw new Error(`Failed to enable MFA for user: ${describeApiError(mfaResult.error, mfaResult.status)}`);
        }
        mfaSecret = mfaResult.secret;

        await ServerScreen.connectToServer(serverOneUrl, serverDisplayName);
    });

    afterAll(async () => {
        if (!canMutateServer) {
            return;
        }

        try {
            await HomeScreen.logout();
        } catch {
            // Suite may have failed before a session existed.
        } finally {
            const loginResult = await User.apiAdminLogin(siteOneUrl);
            const configResult = await System.apiPatchConfig(siteOneUrl, {
                ServiceSettings: {EnableMultifactorAuthentication: false},
            });
            if (loginResult.error || configResult.error) {
                throw new Error(
                    'afterAll failed to restore admin session or disable MFA ' +
                    `(login=${describeApiError(loginResult.error, loginResult.status)}; ` +
                    `config=${describeApiError(configResult.error, configResult.status)})`,
                );
            }
            const mfaDisabled = await System.waitForClientConfigFlag(siteOneUrl, 'EnableMultifactorAuthentication', 'false');
            if (!mfaDisabled) {
                throw new Error('EnableMultifactorAuthentication never became "false" on the mutation server after teardown');
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

        // # Dismiss the iOS "Save Password?" sheet: it pops asynchronously once the password is
        // validated and its backdrop covers the MFA input. Normally suppressed by
        // utils/disable_ios_autofill.js; tapping "Not Now" is the fallback and throws fast if absent.
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
