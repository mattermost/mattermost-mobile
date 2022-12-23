// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
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
    ChannelListScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Channels - Create Direct Message', () => {
    const serverOneDisplayName = 'Server 1';
    const directMessagesCategory = 'direct_messages';
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4730_1 - should match elements on create direct message screen', async () => {
        // # Open create direct message screen
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.closeTutorial();

        // * Verify basic elements on create direct message screen
        await expect(CreateDirectMessageScreen.closeButton).toBeVisible();
        await expect(CreateDirectMessageScreen.searchInput).toBeVisible();
        await expect(CreateDirectMessageScreen.sectionUserList).toBeVisible();

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });

    it('MM-T4730_2 - should be able to create a direct message', async () => {
        // # As admin, create a new user to open direct message with
        const {user: newUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);

        // * Verify no direct message channel for the new user appears on channel list screen
        const newUserDisplayName = newUser.username;
        await expect(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, newUserDisplayName)).not.toBeVisible();

        // # Open create direct message screen and search for the new user
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(newUserDisplayName);

        // * Verify search returns the new user item
        await expect(CreateDirectMessageScreen.getUserItemDisplayName(newUser.id)).toBeVisible();

        // # Tap on the new user item
        await CreateDirectMessageScreen.getUserItem(newUser.id).tap();

        // * Verify the new user is selected
        await expect(CreateDirectMessageScreen.getSelectedUserDisplayName(newUser.id)).toBeVisible();

        // # Tap on start button
        await CreateDirectMessageScreen.startButton.tap();

        // * Verify on direct message channel screen for the new user
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(newUserDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(newUserDisplayName);

        // # Post a message and go back to channel list screen
        await ChannelScreen.postMessage('test');
        await ChannelScreen.back();
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Verify direct message channel for the new user is added to direct message list
        const {channel: directMessageChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, newUser.id]);
        await expect(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, directMessageChannel.name)).toHaveText(newUserDisplayName);
    });

    it('MM-T4730_3 - should be able to create a group message', async () => {
        // # As admin, create two new users to open group message with
        const {user: firstNewUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'a'});
        await Team.apiAddUserToTeam(siteOneUrl, firstNewUser.id, testTeam.id);
        const {user: secondNewUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'b'});
        await Team.apiAddUserToTeam(siteOneUrl, secondNewUser.id, testTeam.id);

        // * Verify no group message channel for the new users appears on channel list screen
        const firstNewUserDisplayName = firstNewUser.username;
        const secondNewUserDisplayName = secondNewUser.username;
        const groupDisplayName = `${firstNewUserDisplayName}, ${secondNewUserDisplayName}`;
        await expect(element(by.text(groupDisplayName))).not.toBeVisible();

        // # Open create direct message screen, search for the first new user and tap on the first new user item
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(firstNewUser.username);
        await CreateDirectMessageScreen.getUserItem(firstNewUser.id).tap();

        // * Verify the first new user is selected
        await expect(CreateDirectMessageScreen.getSelectedUserDisplayName(firstNewUser.id)).toBeVisible();

        // # Search for the second new user and tap on the second new user item
        await CreateDirectMessageScreen.searchInput.replaceText(secondNewUser.username);
        await CreateDirectMessageScreen.getUserItem(secondNewUser.id).tap();

        // * Verify the second new user is selected
        await expect(CreateDirectMessageScreen.getSelectedUserDisplayName(secondNewUser.id)).toBeVisible();

        // # Tap on start button
        await CreateDirectMessageScreen.startButton.tap();

        // * Verify on group message channel screen for the other two new users
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(groupDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(groupDisplayName);

        // # Post a message and go back to channel list screen
        await ChannelScreen.postMessage('test');
        await ChannelScreen.back();
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();

        // * Verify group message channel for the other two new users is added to direct message list
        await expect(element(by.text(groupDisplayName))).toBeVisible();
    });

    it('MM-T4730_4 - should display empty search state for create direct message', async () => {
        // # Open create direct message screen and search for a non-existent user
        const searchTerm = 'blahblahblahblah';
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(searchTerm);

        // * Verify empty search state for create direct message
        await expect(element(by.text(`No matches found for “${searchTerm}”`))).toBeVisible();
        await expect(element(by.text('Check the spelling or try another search.'))).toBeVisible();

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });
});
