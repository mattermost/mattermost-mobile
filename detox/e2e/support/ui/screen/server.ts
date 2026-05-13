// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {isAndroid, isIos, timeouts, wait, waitForElementToExist} from '@support/utils';
import {expect, waitFor} from 'detox';

class ServerScreen {
    testID = {
        serverScreen: 'server.screen',
        closeButton: 'close.server.button',
        headerTitleAddServer: 'server_header.title.add_server',
        headerTitleConnectToServer: 'server_header.title.connect_to_server',
        headerWelcome: 'server_header.welcome',
        headerDescription: 'server_header.description',
        serverUrlInput: 'server_form.server_url.input',
        serverUrlInputError: 'server_form.server_url.input.error',
        serverDisplayNameInput: 'server_form.server_display_name.input',
        serverDisplayNameInputError: 'server_form.server_display_name.input.error',
        displayHelp: 'server_form.display_help',
        connectButton: 'server_form.connect.button',
        connectButtonDisabled: 'server_form.connect.button.disabled',
        advancedOptionsToggle: 'server_form.advanced_options.toggle',
        preauthSecretInput: 'server_form.preauth_secret.input',
        preauthSecretHelp: 'server_form.preauth_secret_help',
        usernameInput: 'login_form.username.input',
        usernameInputError: 'login_form.username.input.error',
    };

    serverScreen = element(by.id(this.testID.serverScreen));
    closeButton = element(by.id(this.testID.closeButton));
    headerTitleAddServer = element(by.id(this.testID.headerTitleAddServer));
    headerTitleConnectToServer = element(by.id(this.testID.headerTitleConnectToServer));
    headerWelcome = element(by.id(this.testID.headerWelcome));
    headerDescription = element(by.id(this.testID.headerDescription));

    serverUrlInput = element(by.id(this.testID.serverUrlInput));
    serverUrlInputError = element(by.id(this.testID.serverUrlInputError));
    serverDisplayNameInput = element(by.id(this.testID.serverDisplayNameInput));
    serverDisplayNameInputError = element(by.id(this.testID.serverDisplayNameInputError));
    displayHelp = element(by.id(this.testID.displayHelp));
    connectButton = element(by.id(this.testID.connectButton));
    connectButtonDisabled = element(by.id(this.testID.connectButtonDisabled));
    advancedOptionsToggle = element(by.id(this.testID.advancedOptionsToggle));
    preauthSecretInput = element(by.id(this.testID.preauthSecretInput));
    preauthSecretHelp = element(by.id(this.testID.preauthSecretHelp));
    usernameInput = element(by.id(this.testID.usernameInput));

    toBeVisible = async () => {
        // iOS 26.2 on macos-15 CI runners takes longer than 10s to present the
        // server screen after cold launch. Use HALF_MIN for both platforms so the
        // first-launch case never races with OS-level app registration delays.
        const timeout = timeouts.HALF_MIN;
        await waitFor(this.serverScreen).toExist().withTimeout(timeout);
        await waitFor(this.serverUrlInput).toExist().withTimeout(timeout);

        return this.serverScreen;
    };

    connectToServer = async (serverUrl: string, serverDisplayName: string) => {
        await this.toBeVisible();
        await this.serverUrlInput.replaceText(serverUrl);
        await this.serverDisplayNameInput.replaceText(serverDisplayName);
        if (isAndroid()) {
            await this.tapConnectButton();

            // Dismiss "Notifications cannot be received from this server" dialog if it appears.
            // This Android-only dialog blocks the login form and must be dismissed before proceeding.
            try {
                await waitFor(Alert.notificationsCannotBeReceivedTitle).toExist().withTimeout(timeouts.TEN_SEC);
                await element(by.text('OKAY')).tap();
            } catch {
                // Dialog did not appear — proceed normally
            }
        }

        if (isIos()) {
            await this.tapConnectButton();
        }

        // Wait for the login form to appear after server connection.
        // Use polling waitForElementToExist instead of waitFor().toExist() — Detox's
        // built-in wait relies on app-idle sync which can stall indefinitely on
        // iOS 26.x because the main run loop keeps 2 work items pending (known RN/
        // RCT_NEW_ARCH=0 behaviour on iOS 26 simulators). The polling helper probes
        // the element on a wall-clock interval regardless of app-idle state.
        const timeout = isAndroid() ? timeouts.ONE_MIN : timeouts.HALF_MIN;
        await waitForElementToExist(this.usernameInput, timeout);

        if (isIos()) {
            // The push-proxy alert is now deferred in the app (via
            // InteractionManager.runAfterInteractions in app/screens/server/index.tsx)
            // so it appears AFTER the RNN transition to LoginScreen completes, not
            // during. Dismiss it here — the login form is already visible, so any
            // subsequent LoginScreen interaction would otherwise hit the alert's
            // dimming overlay and fail.
            await this.dismissIosNotificationsAlert();
        }
    };

    /**
     * Dismiss the iOS "Notifications could not/cannot be received from this server"
     * alert that appears after connecting to a dev/self-hosted server without a valid
     * push notification config. iOS 26.x on iPad exposes the Okay button with label
     * "Okay" at multiple indexes (button wrapper + label), and the correct index
     * varies by device + iOS build. We tap each candidate in sequence and verify the
     * alert title disappears before claiming success, so a no-op tap on the wrong
     * element does not silently leave the alert blocking the login transition.
     */
    dismissIosNotificationsAlert = async () => {
        // Alert may not exist (e.g. push-proxy verified cleanly); early-exit the check
        // quickly so clean environments aren't penalised by retries.
        const alertTitle = element(by.label('Notifications cannot be received from this server')).atIndex(0);
        const alertTitleAlt = element(by.label('Notifications could not be received from this server')).atIndex(0);

        const alertIsPresent = async () => {
            try {
                await waitFor(alertTitle).toExist().withTimeout(timeouts.HALF_SEC);
                return true;
            } catch {
                // try alt title
            }
            try {
                await waitFor(alertTitleAlt).toExist().withTimeout(timeouts.HALF_SEC);
                return true;
            } catch {
                return false;
            }
        };

        // Short initial wait so the alert has a chance to animate in before we probe.
        try {
            await waitFor(alertTitle).toExist().withTimeout(timeouts.FOUR_SEC);
        } catch {
            try {
                await waitFor(alertTitleAlt).toExist().withTimeout(timeouts.ONE_SEC);
            } catch {
                // No alert — clean connect
                return;
            }
        }

        const strategies = [
            element(by.label('Okay')).atIndex(0),
            element(by.label('Okay')).atIndex(1),
            element(by.text('Okay')),
        ];

        /* eslint-disable no-await-in-loop -- sequential fallbacks with verification */
        for (const btn of strategies) {
            try {
                await btn.tap();

                // Verify the alert is actually gone; a tap on the wrong element
                // silently no-ops (Detox still returns success) and the alert
                // remains, blocking the next screen transition.
                if (!(await alertIsPresent())) {
                    return;
                }
            } catch {
                // Element not found for this strategy — try the next
            }
        }
        /* eslint-enable no-await-in-loop */
        // All strategies failed — let the caller's waitFor(username) time out
        // with a clear stack trace (better than a silent no-dismiss here).
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.serverScreen).not.toBeVisible();
    };

    tapConnectButton = async () => {
        await this.connectButton.tap();
        await wait(timeouts.ONE_SEC);
    };

    toggleAdvancedOptions = async () => {
        await this.advancedOptionsToggle.tap();
        await wait(timeouts.ONE_SEC);
    };

    enterPreauthSecret = async (secret: string) => {
        // On Android, secureTextEntry={true} causes Espresso to match two native
        // views under the same testID (the ReactEditText wrapper + the inner EditText).
        // Use atIndex(0) to unambiguously target the first match and avoid the
        // "AmbiguousMatcher" failure. On iOS there is always exactly one match.
        const input = isAndroid()
            ? element(by.id(this.testID.preauthSecretInput)).atIndex(0)
            : this.preauthSecretInput;
        await waitFor(input).toExist().withTimeout(timeouts.TEN_SEC);
        await input.replaceText(secret);
    };

    connectToServerWithPreauthSecret = async (serverUrl: string, serverDisplayName: string, preauthSecret: string) => {
        await this.toBeVisible();
        await this.serverUrlInput.replaceText(serverUrl);
        await this.serverDisplayNameInput.replaceText(serverDisplayName);

        // Toggle advanced options to show preauth secret field
        await this.toggleAdvancedOptions();

        // Enter preauth secret
        await this.enterPreauthSecret(preauthSecret);

        // Connect
        if (isAndroid()) {
            await this.tapConnectButton();

            // Dismiss "Notifications cannot be received from this server" dialog if it appears.
            try {
                await waitFor(Alert.notificationsCannotBeReceivedTitle).toExist().withTimeout(timeouts.TEN_SEC);
                await element(by.text('OKAY')).tap();
            } catch {
                // Dialog did not appear — proceed normally
            }
        }
        if (isIos()) {
            await this.tapConnectButton();
            await this.dismissIosNotificationsAlert();
        }

        // Wait for the login form to appear after server connection with preauth.
        const timeout = isAndroid() ? timeouts.ONE_MIN : timeouts.HALF_MIN;
        await waitFor(this.usernameInput).toExist().withTimeout(timeout);
    };
}

const serverScreen = new ServerScreen();
export default serverScreen;
