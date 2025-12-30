// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3201: RN apps Create public channel
 * - MM-T3203: RN apps Create private channel
 * - MM-T3199: RN apps Edit public channel
 * - MM-T3206: RN apps Edit private channel
 * - MM-T854: RN apps Channel can be created using 2 non-latin characters
 */

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    BrowseChannelsScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3201 - RN apps Create public channel', async () => {
        const channelName = `channel-${getRandomId()}`;
        const channelDisplayName = channelName.replace(/-/g, ' ');
        const channelPurpose = 'This is a test purpose\nwith multiple lines\nfor testing';
        const channelHeader = ':taco:';

        // # Step 1: From the channels list, tap on the "+" displayed to the right of "CHANNELS"
        await ChannelListScreen.headerPlusButton.tap();

        // * On step 1, a list of existing channels should be displayed.
        await BrowseChannelsScreen.toBeVisible();
        await expect(BrowseChannelsScreen.flatChannelList).toBeVisible();

        // # Step 2: Tap on "Create" bottomsheet option (Public Channel type is pre-selected in the Create screen, otherwise choose Public Channel)
        await BrowseChannelsScreen.createButton.tap();

        // * On step 2, a screen enabling you to name your channel should be displayed.
        await CreateOrEditChannelScreen.toBeVisible();
        await expect(CreateOrEditChannelScreen.displayNameInput).toBeVisible();

        // # Step 3: Type in a name, observing that the Create button is not tappable until at least 2 characters have been entered
        // * Verify Create button is disabled initially
        await expect(CreateOrEditChannelScreen.createButton).toBeVisible();

        // Type single character and verify button is still disabled
        await CreateOrEditChannelScreen.displayNameInput.typeText('a');
        await wait(timeouts.ONE_SEC);

        // Clear and type the full channel name (at least 2 characters)
        await CreateOrEditChannelScreen.displayNameInput.clearText();
        await CreateOrEditChannelScreen.displayNameInput.typeText(channelDisplayName);

        // # Step 4: Type in a purpose that has multiple returns (new lines)
        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.typeText(channelPurpose);

        // # Step 5: Type in a header that is an emoji (such as :taco:)
        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.typeText(channelHeader);

        // # Step 6: Tap "Create" in the top right of the screen
        await CreateOrEditChannelScreen.createButton.tap();

        // * The new channel should be created and you should be redirected to the new channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channelDisplayName);

        // * You can tap the channel name to view and verify channel purpose and header
        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(channelDisplayName.toUpperCase());
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(channelPurpose);

        // Verify header by opening channel screen and checking if header is visible
        await ChannelInfoScreen.close();
        await ChannelScreen.toBeVisible();

        // Go back to channel list for cleanup
        await ChannelScreen.back();
    });

    it('MM-T3203 - RN apps Create private channel', async () => {
        const channelName = `private-channel-${getRandomId()}`;
        const channelDisplayName = channelName.replace(/-/g, ' ');
        const channelPurpose = 'This is a private test channel purpose';
        const channelHeader = 'Private channel header';

        // # Step 1: From the channels list, tap on the "+" displayed to the right of "CHANNELS", then choose Create option from bottomsheet
        await ChannelListScreen.headerPlusButton.tap();
        await BrowseChannelsScreen.toBeVisible();
        await BrowseChannelsScreen.createButton.tap();

        // * After #1, a screen enabling you to name your channel should be displayed.
        await CreateOrEditChannelScreen.toBeVisible();
        await expect(CreateOrEditChannelScreen.displayNameInput).toBeVisible();

        // # Step 2: Select Private Channel type, type in a name, purpose and header for the new channel
        // Toggle to make it private
        await CreateOrEditChannelScreen.toggleMakePrivateOn();
        await expect(CreateOrEditChannelScreen.makePrivateToggledOn).toBeVisible();

        // Type channel name
        await CreateOrEditChannelScreen.displayNameInput.typeText(channelDisplayName);

        // Type channel purpose
        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.typeText(channelPurpose);

        // Type channel header
        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.typeText(channelHeader);

        // # Step 3: Tap on "Create" in the top right of the screen
        await CreateOrEditChannelScreen.createButton.tap();

        // * After #3, the new channel should be created and you should be redirected to the new channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channelDisplayName);

        // Verify it's a private channel by checking channel info
        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(channelDisplayName.toUpperCase());
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(channelPurpose);

        // Close channel info and go back to channel list
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T3199 - RN apps Edit public channel', async () => {
        // # Setup: Create a public test channel
        const channelName = `edit-pub-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // Navigate to the channel
        await ChannelScreen.open('public', channel.display_name);

        // # Step 1: On a public channel where permissions allow you to edit channel header etc., tap a channel name
        await ChannelInfoScreen.open();

        // # Step 2: Tap Edit Channel, verify Save button is dimmed until changes are made
        await expect(ChannelInfoScreen.editChannelOption).toBeVisible();
        await ChannelInfoScreen.editChannelOption.tap();
        await CreateOrEditChannelScreen.toBeVisible();
        await expect(CreateOrEditChannelScreen.saveButton).toBeVisible();

        // # Step 3: Add text to the channel name
        const additionalText = ' edited';
        await CreateOrEditChannelScreen.displayNameInput.tapAtPoint({x: 200, y: 10}); // Tap at end
        await CreateOrEditChannelScreen.displayNameInput.typeText(additionalText);

        // # Step 4: Type text in Purpose field
        const purposeText = 'Updated purpose for this channel';
        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.clearText();
        await CreateOrEditChannelScreen.purposeInput.typeText(purposeText);

        // # Step 5: Type text in Header field and tap Return to get new line
        const headerLine1 = 'First line of header';
        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.clearText();
        await CreateOrEditChannelScreen.headerInput.typeText(headerLine1 + '\n');

        // # Step 6: Type a second line of text
        const headerLine2 = 'Second line of header';
        await CreateOrEditChannelScreen.headerInput.typeText(headerLine2);

        // # Step 7: Tap Save
        await CreateOrEditChannelScreen.saveButton.tap();

        // * Edit modal closes, channel info is displayed
        await wait(timeouts.TWO_SEC);
        await ChannelInfoScreen.toBeVisible();

        // * The changes you made are displayed
        const updatedDisplayName = channelName + additionalText;
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(updatedDisplayName.toUpperCase());
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(purposeText);

        // Close channel info
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T3206 - RN apps Edit private channel', async () => {
        // # Setup: Create a private test channel
        const channelName = `edit-priv-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'P',
        });

        // Navigate to the channel
        await ChannelScreen.open('private', channel.display_name);

        // # Step 1: On a private channel where policy allows you to edit channel header etc., tap a channel name
        await ChannelInfoScreen.open();

        // # Step 2: Tap Edit Channel, verify Save button is dimmed until changes are made
        await expect(ChannelInfoScreen.editChannelOption).toBeVisible();
        await ChannelInfoScreen.editChannelOption.tap();
        await CreateOrEditChannelScreen.toBeVisible();
        await expect(CreateOrEditChannelScreen.saveButton).toBeVisible();

        // # Step 3: Add text to the channel name
        const additionalText = ' edited';
        await CreateOrEditChannelScreen.displayNameInput.tapAtPoint({x: 200, y: 10}); // Tap at end
        await CreateOrEditChannelScreen.displayNameInput.typeText(additionalText);

        // # Step 4: Type text in Purpose field
        const purposeText = 'Updated purpose for private channel';
        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.clearText();
        await CreateOrEditChannelScreen.purposeInput.typeText(purposeText);

        // # Step 5: Type text in Header field and tap Return to get new line
        const headerLine1 = 'First line of header';
        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.clearText();
        await CreateOrEditChannelScreen.headerInput.typeText(headerLine1 + '\n');

        // # Step 6: Tap a second line of text
        const headerLine2 = 'Second line of header';
        await CreateOrEditChannelScreen.headerInput.typeText(headerLine2);

        // # Step 7: Tap Save
        await CreateOrEditChannelScreen.saveButton.tap();

        // * Edit modal closes, channel info is displayed
        await wait(timeouts.TWO_SEC);
        await ChannelInfoScreen.toBeVisible();

        // * The changes you made are displayed
        const updatedDisplayName = channelName + additionalText;
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(updatedDisplayName.toUpperCase());
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(purposeText);

        // Close channel info
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T854 - RN apps Channel can be created using 2 non-latin characters', async () => {
        // # Step 1: Go to create a channel on the RN apps
        await ChannelListScreen.headerPlusButton.tap();
        await BrowseChannelsScreen.toBeVisible();
        await BrowseChannelsScreen.createButton.tap();
        await CreateOrEditChannelScreen.toBeVisible();

        // # Step 2: Enter some non-latin characters as the name (e.g. ÁÜäÊúü)
        const nonLatinChannelName = 'ÁÜ';
        await CreateOrEditChannelScreen.displayNameInput.typeText(nonLatinChannelName);
        await wait(timeouts.ONE_SEC);

        // # Step 3: Click create
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Channel is created
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(nonLatinChannelName);

        // Go back to channel list
        await ChannelScreen.back();
    });
});
