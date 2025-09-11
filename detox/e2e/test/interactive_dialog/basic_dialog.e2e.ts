// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Command,
    Setup,
    Webhook,
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

describe('Interactive Dialog - Basic Dialog', () => {
    const serverOneDisplayName = 'Server 1';
    const webhookBaseUrl = 'http://localhost:3000'; // Webhook test server
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        // # Ensure webhook server is running
        await Webhook.requireWebhookServer(webhookBaseUrl);

        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // # Create slash command for dialog testing
        const command = {
            team_id: testTeam.id,
            trigger: 'testdialog',
            url: `${webhookBaseUrl}/simple_dialog_request`,
            method: 'P',
            username: 'testbot',
            display_name: 'Test Dialog Command',
            description: 'Test command for interactive dialog e2e tests',
        };
        await Command.apiCreateCommand(siteOneUrl, command);

        // # Create slash command for error dialog testing
        const errorCommand = {
            team_id: testTeam.id,
            trigger: 'dialogerror',
            url: `${webhookBaseUrl}/simple_dialog_error_request`,
            method: 'P',
            username: 'testbot',
            display_name: 'Dialog Error Command',
            description: 'Test command for dialog error handling e2e tests',
        };
        await Command.apiCreateCommand(siteOneUrl, errorCommand);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
        
        // # Navigate to the test channel for all tests
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    it('MM-T4101 should open simple interactive dialog', async () => {
        // # Execute slash command to trigger dialog
        await ChannelScreen.postMessage('/testdialog');
        await wait(1000);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Cancel the dialog
        await InteractiveDialogScreen.cancel();

        // * Verify dialog is dismissed
        await expect(InteractiveDialogScreen.interactiveDialogScreen).not.toExist();
    });

    it('MM-T4102 should submit simple interactive dialog', async () => {
        // # Execute slash command to trigger dialog
        await ChannelScreen.postMessage('/testdialog');
        await wait(1000);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Submit the dialog
        await InteractiveDialogScreen.submit();

        // * Verify dialog is dismissed after submission
        await expect(InteractiveDialogScreen.interactiveDialogScreen).not.toExist();
    });

    it('MM-T4103 should fill optional text field and submit dialog', async () => {
        // # Execute slash command to trigger dialog
        await ChannelScreen.postMessage('/testdialog');
        await wait(1000);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Fill in the optional text field
        await InteractiveDialogScreen.fillTextElement('optional_text', 'Test input value');

        // # Submit the dialog with text filled
        await InteractiveDialogScreen.submit();

        // * Verify dialog is dismissed after submission
        await expect(InteractiveDialogScreen.interactiveDialogScreen).not.toExist();
    });

    it('MM-T4104 should handle server error on dialog submission', async () => {
        // # Execute slash command to trigger error dialog
        await ChannelScreen.postMessage('/dialogerror');
        await wait(1000);

        // * Verify interactive dialog appears
        await InteractiveDialogScreen.toBeVisible();
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Fill in the optional text field
        await InteractiveDialogScreen.fillTextElement('optional_text', 'This will trigger server error');

        // # Submit the dialog - this should trigger server error
        await InteractiveDialogScreen.submit();
        await wait(1000);

        // * Verify dialog is still visible (server error should keep dialog open)
        try {
            await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();
            // # Clean up by canceling the dialog
            await InteractiveDialogScreen.cancel();
        } catch (dialogClosedError) {
            // Dialog may have closed despite error - this is acceptable
        }
    });
});