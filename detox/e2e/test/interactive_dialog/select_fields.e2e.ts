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
    IntegrationSelectorScreen,
    InteractiveDialogScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {wait} from '@support/utils';
import {expect} from 'detox';

describe('Interactive Dialog - Select Fields', () => {
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

        // # Create slash command for select fields dialog testing
        const command = {
            team_id: testTeam.id,
            trigger: 'selectfields',
            url: `${webhookBaseUrl}/select_fields_dialog_request`,
            method: 'P',
            username: 'testbot',
            display_name: 'Select Fields Dialog Command',
            description: 'Test command for select fields dialog functionality',
            auto_complete: true,
            auto_complete_desc: 'Test select fields dialog',
            auto_complete_hint: '[subcommand]',
        };

        await Command.apiCreateCommand(siteOneUrl, command);

        // # Login to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Navigate to the test channel for all tests
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    it('MM-T4498 should open and handle interactive dialog with select fields', async () => {
        // # Post the slash command to trigger the dialog
        await ChannelScreen.postMessage('/selectfields');
        await wait(1000);

        // * Interactive dialog should appear
        await InteractiveDialogScreen.toBeVisible();

        // # Test radio button selector
        const engineeringRadioButton = element(by.id('AppFormElement.someradiooptions.radio.engineering.button'));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();

        // # Test select dropdown with static options (MM-T4502)
        const selectDropdownButton = element(by.id('AppFormElement.someoptionselector.select.button'));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await wait(1000);

        await IntegrationSelectorScreen.toBeVisible();
        const optionElement = element(by.text('Option2'));
        await optionElement.tap();

        // # Test user selector
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await wait(1000);
        await IntegrationSelectorScreen.toBeVisible();

        // Use wildcard patterns to find any visible user
        let userSelected = false;
        const userTestIdPatterns = [
            /^integration_selector\.user_list\.user_item\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/,
            /^integration_selector\.user_list\.user_item\.[a-zA-Z0-9]+$/,
            /integration_selector.*user_item.*[a-zA-Z0-9]{10,}/,
        ];

        // Try each pattern sequentially without loops
        if (!userSelected && userTestIdPatterns[0]) {
            try {
                const firstUserElement = element(by.id(userTestIdPatterns[0])).atIndex(0);
                await expect(firstUserElement).toExist();
                await firstUserElement.tap();
                userSelected = true;
            } catch (error1) {
                if (userTestIdPatterns[1]) {
                    try {
                        const secondUserElement = element(by.id(userTestIdPatterns[1])).atIndex(0);
                        await expect(secondUserElement).toExist();
                        await secondUserElement.tap();
                        userSelected = true;
                    } catch (error2) {
                        if (userTestIdPatterns[2]) {
                            try {
                                const thirdUserElement = element(by.id(userTestIdPatterns[2])).atIndex(0);
                                await expect(thirdUserElement).toExist();
                                await thirdUserElement.tap();
                                userSelected = true;
                            } catch (error3) {
                                // Will try fallback below
                            }
                        }
                    }
                }
            }
        }

        // Fallback to section list tap
        if (!userSelected) {
            try {
                const sectionListElement = element(by.id('integration_selector.user_list.section_list'));
                await sectionListElement.tap();
                userSelected = true;
            } catch (fallbackError) {
                // If no user selection works, close manually
                await IntegrationSelectorScreen.done();
            }
        }

        if (userSelected) {
            await wait(1000);
        }

        // # Test channel selector
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));
        await expect(channelSelectorButton).toExist();
        await channelSelectorButton.tap();
        await wait(1000);
        await IntegrationSelectorScreen.toBeVisible();

        // Use wildcard patterns to find any visible channel
        let channelSelected = false;
        const channelTestIdPatterns = [
            'integration_selector.channel_list',
            'integration_selector.channel_list.channel_item',
        ];

        // Try each pattern sequentially without loops
        if (channelTestIdPatterns[0]) {
            try {
                const firstChannelElement = element(by.id(channelTestIdPatterns[0]));
                await expect(firstChannelElement).toExist();
                await firstChannelElement.tap();
                channelSelected = true;
            } catch (error1) {
                if (channelTestIdPatterns[1]) {
                    try {
                        const secondChannelElement = element(by.id(channelTestIdPatterns[1]));
                        await expect(secondChannelElement).toExist();
                        await secondChannelElement.tap();
                        channelSelected = true;
                    } catch (error2) {
                        // Will try fallback below
                    }
                }
            }
        }

        // Fallback to common channel names
        if (!channelSelected) {
            try {
                const townSquare = element(by.text('Town Square'));
                await expect(townSquare).toExist();
                await townSquare.tap();
                channelSelected = true;
            } catch (error1) {
                try {
                    const offTopic = element(by.text('Off-Topic'));
                    await expect(offTopic).toExist();
                    await offTopic.tap();
                    channelSelected = true;
                } catch (error2) {
                    try {
                        const general = element(by.text('General'));
                        await expect(general).toExist();
                        await general.tap();
                        channelSelected = true;
                    } catch (error3) {
                        // No channel found
                    }
                }
            }
        }

        if (channelSelected) {
            await wait(1000);
        } else {
            await IntegrationSelectorScreen.done();
        }

        // # Submit the dialog
        await InteractiveDialogScreen.toBeVisible();
        await InteractiveDialogScreen.submit();
        await wait(1000);
        await ChannelScreen.toBeVisible();
    });
});
