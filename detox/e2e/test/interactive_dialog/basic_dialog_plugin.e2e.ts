// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    DemoPlugin,
    Plugin,
    Setup,
    System,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    InteractiveDialogScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {wait} from '@support/utils';
import {expect} from 'detox';

describe('Interactive Dialog - Basic Dialog (Plugin)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        // Log environment info for debugging CI vs local differences
        // eslint-disable-next-line no-console
        console.log('=== Test Environment Info ===');
        // eslint-disable-next-line no-console
        console.log(`Platform: ${process.platform}`);
        // eslint-disable-next-line no-console
        console.log(`Architecture: ${process.arch}`);
        // eslint-disable-next-line no-console
        console.log(`Node version: ${process.version}`);
        // eslint-disable-next-line no-console
        console.log(`Test server: ${siteOneUrl}`);
        // eslint-disable-next-line no-console
        console.log('=============================');

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Login as admin for configuration API calls
        await User.apiAdminLogin(siteOneUrl);

        // # Check plugin upload is enabled
        await System.shouldHavePluginUploadEnabled(siteOneUrl);

        // # Configure server for tests
        await System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {
                EnableGifPicker: true,
            },
            FileSettings: {
                EnablePublicLink: true,
            },
            FeatureFlags: {
                InteractiveDialogAppsForm: true,
            },
        });

        // # Upload and enable demo plugin
        const latestUrl = await DemoPlugin.getLatestDownloadUrl();
        const pluginResult = await Plugin.apiUploadAndEnablePlugin({
            baseUrl: siteOneUrl,
            url: latestUrl,
            id: DemoPlugin.id,
            force: true,
        });

        // # Verify plugin installation succeeded
        if (pluginResult.error) {
            // Check if this is a Cloudflare timeout (CI infrastructure issue)
            if (pluginResult.status === 524) {
                throw new Error(
                    'Plugin installation failed due to Cloudflare timeout (Error 524). ' +
                    'This is a known CI infrastructure limitation when the test server downloads plugins from GitHub. ' +
                    'To fix: Either (1) pre-download plugin in CI workflow to detox/e2e/support/fixtures/ and use filename instead of url, ' +
                    'or (2) use a test server without Cloudflare proxy.',
                );
            }
            throw new Error(`Failed to install demo plugin: ${pluginResult.error} (status: ${pluginResult.status})`);
        }

        // # Wait for plugin to be fully initialized
        await wait(2000);

        // # Verify plugin is actually active
        const statusCheck = await Plugin.apiGetPluginStatus(siteOneUrl, DemoPlugin.id);
        if (!statusCheck.isActive) {
            throw new Error(`Demo plugin is not active after installation. Installed: ${statusCheck.isInstalled}, Active: ${statusCheck.isActive}`);
        }

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Navigate to the test channel for all tests
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    afterEach(async () => {
        // # Dismiss any error alerts that might be blocking the UI
        try {
            await element(by.text('OK')).tap();
            await wait(300);
        } catch {
            // No alert to dismiss
        }

        // # Clean up any open dialogs between tests
        try {
            await InteractiveDialogScreen.cancel();
        } catch {
            // No dialog to cancel
        }

        // # Ensure we're back in the channel for the next test
        try {
            await ChannelScreen.open(channelsCategory, testChannel.name);
        } catch {
            // Already in channel
        }
        await wait(500);
    });

    it('MM-T4101 should open simple interactive dialog (Plugin)', async () => {
        // # Execute plugin basic dialog command
        await ChannelScreen.postMessage('/dialog basic');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Cancel the dialog
        await InteractiveDialogScreen.cancel();

        // * Verify dialog is dismissed
        await expect(InteractiveDialogScreen.interactiveDialogScreen).not.toExist();
    });

    it('MM-T4102 should submit simple interactive dialog (Plugin)', async () => {
        // # Execute plugin basic dialog command
        await ChannelScreen.postMessage('/dialog basic');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Submit the dialog
        await InteractiveDialogScreen.submit();

        // # Wait for submission to process
        await wait(500);

        // * Verify dialog is dismissed after submission
        try {
            await expect(InteractiveDialogScreen.interactiveDialogScreen).not.toExist();
        } catch (dialogStillOpen) {
            // Try to cancel to clean up
            try {
                await InteractiveDialogScreen.cancel();
            } catch (cancelError) {
                // Ignore cancel errors
            }
            throw dialogStillOpen; // Re-throw to fail the test
        }

        // # Verify submission response is posted to channel
        await wait(500);
        await waitFor(element(by.text('Dialog Submitted:'))).toExist().withTimeout(1000);
    });

    it('MM-T4103 should fill text field and submit dialog (Plugin)', async () => {
        // # Ensure we're back in the channel view
        await wait(500);

        // # Execute plugin basic dialog command
        await ChannelScreen.postMessage('/dialog basic');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Fill in the optional text field (basic dialog has 'optional_text' field)
        await InteractiveDialogScreen.fillTextElement('optional_text', 'Plugin Test Value');

        // # Submit the dialog with text filled
        await InteractiveDialogScreen.submit();

        // # Wait for submission to process
        await wait(500);

        // * Verify dialog is dismissed after submission
        try {
            await expect(InteractiveDialogScreen.interactiveDialogScreen).not.toExist();
        } catch (dialogStillOpen) {
            // Dialog may stay open, try to cancel to clean up
            try {
                await InteractiveDialogScreen.cancel();
            } catch (cancelError) {
                // Ignore cancel errors
            }
            throw dialogStillOpen; // Re-throw to fail the test
        }

        // # Verify submission response is posted to channel
        await wait(500);
        await waitFor(element(by.text('Dialog Submitted:'))).toExist().withTimeout(1000);
    });

    it('MM-T4104 should handle server error on dialog submission (Plugin)', async () => {
        // # Ensure we're back in the channel view
        await wait(500);

        // # Execute plugin error dialog command
        await ChannelScreen.postMessage('/dialog error');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Fill in the optional text field
        await InteractiveDialogScreen.fillTextElement('optional_text', 'This will trigger server error');

        // # Submit the dialog - this should trigger server error
        await InteractiveDialogScreen.submit();
        await wait(500);

        // * Verify dialog is still visible (server error should keep dialog open)
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Clean up by canceling the dialog
        await InteractiveDialogScreen.cancel();
    });
});
