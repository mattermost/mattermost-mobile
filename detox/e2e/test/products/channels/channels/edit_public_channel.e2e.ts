// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelInfoScreen,
    ChannelListScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {isAndroid, isIos} from '@support/utils';
import {expect} from 'detox';

describe('Channels - Edit Channel', () => {

    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testOtherUser1: any;
    let testOtherUser2: any;
    let testChannel: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        ({user: testOtherUser1} = await User.apiCreateUser(siteOneUrl, {prefix: 'a'}));
        if (!testOtherUser1?.id) {
            throw new Error('[beforeAll] Failed to create testOtherUser1');
        }
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser1.id, team.id);
        ({user: testOtherUser2} = await User.apiCreateUser(siteOneUrl, {prefix: 'b'}));
        if (!testOtherUser2?.id) {
            throw new Error('[beforeAll] Failed to create testOtherUser2');
        }
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser2.id, team.id);

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    beforeEach(async () => {
        try {
            await ChannelScreen.toBeVisible();
        } catch {
            // Prior test may have failed mid-flow (e.g. Create DM tutorial blocking channel).
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
        }
    });

    afterAll(async () => {
        // A failed test can leave the app on a screen without the home tab, so opening the channel
        // list may fail here; logout handles navigation recovery.
        try {
            await ChannelListScreen.open();
        } catch {
            // App may be on a different screen; logout will navigate home.
        }
        await HomeScreen.logout();
    });

    it('MM-T4906_2 - should be able to edit public channel', async () => {
        // # Open channel info screen and open edit channel screen
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannel();

        // * Verify current values of fields
        if (isIos()) {
            await expect(CreateOrEditChannelScreen.displayNameInput).toHaveValue(testChannel.display_name);
            await expect(CreateOrEditChannelScreen.purposeInput).toHaveValue(`Channel purpose: ${testChannel.display_name.toLowerCase()}`);
            await expect(CreateOrEditChannelScreen.headerInput).toHaveValue(`Channel header: ${testChannel.display_name.toLowerCase()}`);
        } else {
            await expect(CreateOrEditChannelScreen.displayNameInput).toHaveText(testChannel.display_name);
            await expect(CreateOrEditChannelScreen.purposeInput).toHaveText(`Channel purpose: ${testChannel.display_name.toLowerCase()}`);
            await expect(CreateOrEditChannelScreen.headerInput).toHaveText(`Channel header: ${testChannel.display_name.toLowerCase()}`);
        }

        // # Edit channel info and save changes
        if (isAndroid()) {
            await CreateOrEditChannelScreen.displayNameInput.replaceText(`${testChannel.display_name} name`);
            await CreateOrEditChannelScreen.purposeInput.replaceText(`Channel purpose: ${testChannel.display_name.toLowerCase()} purpose`);
            await CreateOrEditChannelScreen.headerInput.replaceText(`Channel header: ${testChannel.display_name.toLowerCase()}\nheader1\nheader2`);
        } else {
            await CreateOrEditChannelScreen.displayNameInput.typeText(' name');
            await CreateOrEditChannelScreen.purposeInput.typeText(' purpose');
            await CreateOrEditChannelScreen.headerInput.typeText('\nheader1\nheader2');
        }
        await CreateOrEditChannelScreen.saveButton.tap();

        // * Verify on channel info screen and changes have been saved
        // iOS pops back to ChannelSettingsScreen after save while Android goes straight to
        // ChannelInfoScreen, so try-catch handles both.
        try {
            await ChannelSettingsScreen.toBeVisible();
            await ChannelSettingsScreen.close();
        } catch {
            // Android: save navigated directly to ChannelInfoScreen
        }
        await ChannelInfoScreen.toBeVisible();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(`${testChannel.display_name} name`);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(`Channel purpose: ${testChannel.display_name.toLowerCase()} purpose`);

        if (isAndroid()) {
            await ChannelInfoScreen.scrollView.scrollTo('top');
        }
        await expect(element(by.text(`Channel header: ${testChannel.display_name.toLowerCase()}\nheader1\nheader2`))).toBeVisible();

        // # Go back to channel screen
        await ChannelInfoScreen.close();
    });
});
