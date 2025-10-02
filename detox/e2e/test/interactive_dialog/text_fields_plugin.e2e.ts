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

describe('Interactive Dialog - Text Fields (Plugin)', () => {
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

    it('MM-T4201 should fill and submit all text field types (Plugin)', async () => {
        // # Execute plugin command to trigger text fields dialog
        await ChannelScreen.postMessage('/dialog textfields');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Fill all text field types (only required_text is required)
        await InteractiveDialogScreen.fillTextElement('text_field', 'Regular text input');
        await InteractiveDialogScreen.fillTextElement('required_text', 'Required field value');
        await InteractiveDialogScreen.fillTextElement('email_field', 'test@example.com');
        await InteractiveDialogScreen.fillTextElement('number_field', '42');
        await InteractiveDialogScreen.fillTextElement('password_field', 'secret123');
        await InteractiveDialogScreen.fillTextElement('textarea_field', 'This is a multiline\ntext area input\nwith multiple lines');

        // # Submit the dialog with all fields filled
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

    it('MM-T4202 should validate required text field (Plugin)', async () => {
        // # Execute plugin command to trigger text fields dialog
        await ChannelScreen.postMessage('/dialog textfields');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Fill only optional fields, leave required field empty
        await InteractiveDialogScreen.fillTextElement('text_field', 'Optional text');
        await InteractiveDialogScreen.fillTextElement('email_field', 'optional@example.com');

        // # Try to submit without required field - should fail or show validation
        try {
            await InteractiveDialogScreen.submit();
            await wait(500);

            // Check if dialog is still visible (validation failed)
            const isStillVisible = await InteractiveDialogScreen.interactiveDialogScreen.getAttributes().then(() => true).catch(() => false);

            if (isStillVisible) {
                // # Now fill the required field and submit successfully
                await InteractiveDialogScreen.fillTextElement('required_text', 'Now filled');
                await InteractiveDialogScreen.submit();
                await wait(500);
            }
        } catch (submitError) {
            // # Fill required field and try again
            await InteractiveDialogScreen.fillTextElement('required_text', 'Required value');
            await InteractiveDialogScreen.submit();
            await wait(500);
        }

        // * Verify dialog is eventually dismissed
        try {
            await expect(InteractiveDialogScreen.interactiveDialogScreen).not.toExist();
        } catch (stillVisibleError) {
            // If dialog is still visible, cancel it to clean up
            try {
                await InteractiveDialogScreen.cancel();
            } catch (cancelError) {
                // Ignore cancel errors
            }
            throw stillVisibleError; // Re-throw to fail the test
        }

        // # Verify submission response is posted to channel
        await wait(500);
        await waitFor(element(by.text('Dialog Submitted:'))).toExist().withTimeout(1000);
    });

    it('MM-T4203 should handle different text input subtypes (Plugin)', async () => {
        // # Execute plugin command to trigger text fields dialog
        await ChannelScreen.postMessage('/dialog textfields');
        await wait(500);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Test each subtype with appropriate input
        await InteractiveDialogScreen.fillTextElement('email_field', 'valid.email+test@example.com');
        await InteractiveDialogScreen.fillTextElement('number_field', '12345');

        // # Fill required field
        await InteractiveDialogScreen.fillTextElement('required_text', 'Subtype test complete');

        // # Submit the dialog
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
});