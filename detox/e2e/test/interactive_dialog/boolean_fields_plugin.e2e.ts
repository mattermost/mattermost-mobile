// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
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

describe('Interactive Dialog - Boolean Fields (Plugin)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
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
        });

        // # Upload and enable demo plugin
        await Plugin.apiUploadAndEnablePlugin({
            baseUrl: siteOneUrl,
            force: true,
        });

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Navigate to the test channel for all tests
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    afterEach(async () => {
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

    it('MM-T4401 should toggle boolean fields and submit (Plugin)', async () => {
        // # Execute plugin dialog command for boolean fields
        await ChannelScreen.postMessage('/dialog boolean');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Verify initial states match the defaults configured in the plugin
        // * Verify required_boolean is initially false (no default specified)
        await expect(element(by.id('AppFormElement.required_boolean.toggled..button'))).toExist();

        // * Verify optional_boolean is initially false (no default specified)
        await expect(element(by.id('AppFormElement.optional_boolean.toggled..button'))).toExist();

        // * Verify boolean_default_true is initially true (default: 'true')
        await expect(element(by.id('AppFormElement.boolean_default_true.toggled.true.button'))).toExist();

        // * Verify boolean_default_false is initially false (default: 'false')
        await expect(element(by.id('AppFormElement.boolean_default_false.toggled..button'))).toExist();

        // # Toggle required boolean (must be enabled for submission)
        await InteractiveDialogScreen.toggleBooleanElement('required_boolean');

        // # Leave optional boolean untouched (test what default/untouched value is submitted)
        // # Leave default true field as is (testing defaults)
        // # Toggle default false field to true
        await InteractiveDialogScreen.toggleBooleanElement('boolean_default_false');

        // # Submit the dialog with all boolean fields configured
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

    it('MM-T4402 should handle boolean field validation (Plugin)', async () => {
        // # Execute plugin dialog command for boolean fields
        await ChannelScreen.postMessage('/dialog boolean');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Try to submit the dialog without toggling required fields (should fail)
        await InteractiveDialogScreen.submit();

        // # Wait for validation to process
        await wait(500);

        // * Verify dialog is still visible (validation should have failed)
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Now toggle both required boolean fields that start as false to make them valid
        await InteractiveDialogScreen.toggleBooleanElement('required_boolean');
        await InteractiveDialogScreen.toggleBooleanElement('boolean_default_false');

        // # Submit the dialog again with required field set to true
        await InteractiveDialogScreen.submit();

        // # Wait for submission to process
        await wait(500);

        // * Verify dialog is dismissed after successful submission
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
        await expect(element(by.text('Dialog Submitted:')).atIndex(1)).toBeVisible();
    });
});
