// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
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
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

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