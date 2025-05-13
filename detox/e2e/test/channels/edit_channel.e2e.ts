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
    CreateDirectMessageScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, isIos, timeouts, wait} from '@support/utils';
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
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser1.id, team.id);
        ({user: testOtherUser2} = await User.apiCreateUser(siteOneUrl, {prefix: 'b'}));
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
        // * Verify on channel screen
        await ChannelScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-T4906_1 - should match elements on edit channel screen', async () => {
        // # Open channel info screen and open edit channel screen
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannel();

        // * Verify basic elements on edit channel screen
        await expect(CreateOrEditChannelScreen.backButton).toBeVisible();
        await expect(CreateOrEditChannelScreen.saveButton).toBeVisible();
        await expect(CreateOrEditChannelScreen.displayNameInput).toBeVisible();
        await expect(CreateOrEditChannelScreen.purposeInput).toBeVisible();
        await expect(CreateOrEditChannelScreen.purposeDescription).toHaveText('Describe how this channel should be used.');
        await expect(CreateOrEditChannelScreen.headerInput).toBeVisible();
        await expect(CreateOrEditChannelScreen.headerDescription).toHaveText('Specify text to appear in the channel header beside the channel name. For example, include frequently used links by typing link text [Link Title](http://example.com).');

        // # Go back to channel screen
        await CreateOrEditChannelScreen.back();
        await ChannelInfoScreen.close();
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
        await CreateOrEditChannelScreen.displayNameInput.typeText(' name');
        await CreateOrEditChannelScreen.purposeInput.typeText(' purpose');
        await CreateOrEditChannelScreen.headerInput.typeText('\nheader1\nheader2');
        await CreateOrEditChannelScreen.saveButton.tap();

        // * Verify on channel info screen and changes have been saved
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

    it('MM-T4906_3 - should be able edit direct message channel', async () => {
        // # Create a direct message with another user
        await ChannelScreen.back();
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();
        await CreateDirectMessageScreen.searchInput.replaceText(testOtherUser1.username);
        await CreateDirectMessageScreen.getUserItem(testOtherUser1.id).tap();
        await CreateDirectMessageScreen.startButton.tap();

        // * Verify on direct message channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testOtherUser1.username);

        // # Open channel info screen, open edit channel header screen, edit channel info, and save changes
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannelHeader({fromChannelInfo: true});
        await CreateOrEditChannelScreen.headerInput.typeText('header1');
        await CreateOrEditChannelScreen.headerInput.tapReturnKey();
        await CreateOrEditChannelScreen.headerInput.typeText('header2');
        await CreateOrEditChannelScreen.saveButton.tap();

        // * Verify on channel info screen and changes have been saved
        await ChannelInfoScreen.toBeVisible();
        await expect(element(by.text('header1\nheader2'))).toBeVisible();

        // # Go back to channel screen
        await ChannelInfoScreen.close();
    });

    it('MM-T4906_4 - should be able edit group message channel', async () => {
        // # Create a group message with two other users
        await ChannelScreen.back();
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(testOtherUser1.username);
        await CreateDirectMessageScreen.getUserItem(testOtherUser1.id).tap();
        await CreateDirectMessageScreen.searchInput.replaceText(testOtherUser2.username);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.TWO_SEC);
        await CreateDirectMessageScreen.getUserItem(testOtherUser2.id).tap();
        await CreateDirectMessageScreen.startButton.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify on group message channel screen
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(`${testOtherUser1.username}, ${testOtherUser2.username}`);

        // # Open channel info screen, open edit channel header screen, edit channel info, and save changes
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannelHeader({fromChannelInfo: true});
        await CreateOrEditChannelScreen.headerInput.typeText('header1');
        await CreateOrEditChannelScreen.headerInput.tapReturnKey();
        await CreateOrEditChannelScreen.headerInput.typeText('header2');
        await CreateOrEditChannelScreen.saveButton.tap();

        // * Verify on channel info screen and changes have been saved
        await ChannelInfoScreen.toBeVisible();
        await expect(element(by.text('header1\nheader2'))).toBeVisible();

        // # Go back to channel screen
        await ChannelInfoScreen.close();
    });
});
