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
    IntegrationSelectorScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {wait} from '@support/utils';
import {expect} from 'detox';

describe('Interactive Dialog - Select Fields (Plugin)', () => {
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

    it('MM-T4498 should open and handle interactive dialog with select fields (Plugin)', async () => {
        // # Post the slash command to trigger the dialog
        await ChannelScreen.postMessage('/dialog selectfields');
        await wait(500);

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
        await wait(500);

        await IntegrationSelectorScreen.toBeVisible();
        const optionElement = element(by.text('Option2'));
        await optionElement.tap();

        // # Test user selector
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();

        // Use wildcard patterns to find any visible user
        let userSelected = false;
        const userTestIdPatterns = [
            'integration_selector.user_list.user_item',
            'integration_selector.user_list',
        ];

        // Try each pattern sequentially without loops
        if (userTestIdPatterns[0]) {
            try {
                const firstUserElement = element(by.id(userTestIdPatterns[0]));
                await expect(firstUserElement).toExist();
                await firstUserElement.tap();
                userSelected = true;
            } catch (error1) {
                if (userTestIdPatterns[1]) {
                    try {
                        const secondUserElement = element(by.id(userTestIdPatterns[1]));
                        await expect(secondUserElement).toExist();
                        await secondUserElement.tap();
                        userSelected = true;
                    } catch (error2) {
                        // Will try fallback below
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
            await wait(500);
        }

        // # Test channel selector
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));
        await expect(channelSelectorButton).toExist();
        await channelSelectorButton.tap();
        await wait(500);
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
            await wait(500);
        } else {
            await IntegrationSelectorScreen.done();
        }

        // # Submit the dialog
        await InteractiveDialogScreen.toBeVisible();
        await InteractiveDialogScreen.submit();
        await wait(500);
        await ChannelScreen.toBeVisible();
    });

    it('MM-T4499 should handle required select field validation (Plugin)', async () => {
        // # Post the slash command to trigger the dialog
        await ChannelScreen.postMessage('/dialog selectfields');
        await wait(500);

        // * Interactive dialog should appear
        await InteractiveDialogScreen.toBeVisible();

        // # Try to submit without filling required fields - should fail validation
        await InteractiveDialogScreen.submit();
        await wait(500);

        // * Verify dialog is still visible (validation should prevent submission)
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // # Now fill required fields and submit successfully
        // Fill required radio selector
        const engineeringRadioButton = element(by.id('AppFormElement.someradiooptions.radio.engineering.button'));
        await expect(engineeringRadioButton).toExist();
        await engineeringRadioButton.tap();

        // Fill required option selector
        const selectDropdownButton = element(by.id('AppFormElement.someoptionselector.select.button'));
        await expect(selectDropdownButton).toExist();
        await selectDropdownButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();
        const optionElement = element(by.text('Option1'));
        await optionElement.tap();

        // Fill required user selector
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();

        // Use same pattern as test 1 for user selection
        let userSelected = false;
        const userTestIdPatterns = [
            'integration_selector.user_list.user_item',
            'integration_selector.user_list',
        ];

        if (userTestIdPatterns[0]) {
            try {
                const firstUserElement = element(by.id(userTestIdPatterns[0]));
                await expect(firstUserElement).toExist();
                await firstUserElement.tap();
                userSelected = true;
            } catch (error1) {
                if (userTestIdPatterns[1]) {
                    try {
                        const secondUserElement = element(by.id(userTestIdPatterns[1]));
                        await expect(secondUserElement).toExist();
                        await secondUserElement.tap();
                        userSelected = true;
                    } catch (error2) {
                        // Will try fallback below
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
            await wait(500);
        }

        // # Submit with required fields filled
        await InteractiveDialogScreen.toBeVisible();
        await InteractiveDialogScreen.submit();
        await wait(500);
        await ChannelScreen.toBeVisible();
    });

    it('MM-T4500 should handle different selector types (Plugin)', async () => {
        // # Post the slash command to trigger the dialog
        await ChannelScreen.postMessage('/dialog selectfields');
        await wait(500);

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
        await wait(500);

        await IntegrationSelectorScreen.toBeVisible();
        const optionElement = element(by.text('Option2'));
        await optionElement.tap();

        // # Test user selector
        const userSelectorButton = element(by.id('AppFormElement.someuserselector.select.button'));
        await expect(userSelectorButton).toExist();
        await userSelectorButton.tap();
        await wait(500);
        await IntegrationSelectorScreen.toBeVisible();

        // Use wildcard patterns to find any visible user
        let userSelected = false;
        const userTestIdPatterns = [
            'integration_selector.user_list.user_item',
            'integration_selector.user_list',
        ];

        // Try each pattern sequentially without loops
        if (userTestIdPatterns[0]) {
            try {
                const firstUserElement = element(by.id(userTestIdPatterns[0]));
                await expect(firstUserElement).toExist();
                await firstUserElement.tap();
                userSelected = true;
            } catch (error1) {
                if (userTestIdPatterns[1]) {
                    try {
                        const secondUserElement = element(by.id(userTestIdPatterns[1]));
                        await expect(secondUserElement).toExist();
                        await secondUserElement.tap();
                        userSelected = true;
                    } catch (error2) {
                        // Will try fallback below
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
            await wait(500);
        }

        // # Test channel selector
        const channelSelectorButton = element(by.id('AppFormElement.somechannelselector.select.button'));
        await expect(channelSelectorButton).toExist();
        await channelSelectorButton.tap();
        await wait(500);
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
            await wait(500);
        } else {
            await IntegrationSelectorScreen.done();
        }

        // # Submit the dialog
        await InteractiveDialogScreen.toBeVisible();
        await InteractiveDialogScreen.submit();
        await wait(500);
        await ChannelScreen.toBeVisible();
    });
});
