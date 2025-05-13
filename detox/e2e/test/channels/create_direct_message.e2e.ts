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
import {timeouts, wait} from '@support/utils';
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
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(newUser.id)).toBeVisible();

        // # Tap on start button
        await CreateDirectMessageScreen.startButton.tap();
        await waitFor(ChannelScreen.scheduledPostTooltipCloseButton).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.scheduledPostTooltipCloseButton.tap();

        // * Verify on direct message channel screen for the new user
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(newUserDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(newUserDisplayName);

        // # Post a message and go back to channel list screen
        await ChannelScreen.postMessage('test');
        await ChannelScreen.back();
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
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.getUserItem(firstNewUser.id).tap();

        // * Verify the first new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(firstNewUser.id)).toBeVisible();

        // # Search for the second new user and tap on the second new user item
        await CreateDirectMessageScreen.searchInput.replaceText(secondNewUser.username);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.getUserItem(secondNewUser.id).tap();

        // * Verify the second new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(secondNewUser.id)).toBeVisible();

        // # Tap on start button
        await CreateDirectMessageScreen.startButton.tap();

        // * Verify on group message channel screen for the other two new users
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(groupDisplayName);
        await expect(ChannelScreen.introDisplayName).toHaveText(groupDisplayName);

        // # Post a message and go back to channel list screen
        await ChannelScreen.postMessage('test');
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T4730_4 - should display empty search state for create direct message', async () => {
        // # Open create direct message screen and search for a non-existent user
        const searchTerm = 'blahblahblahblah';
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(searchTerm);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);

        // * Verify empty search state for create direct message
        await expect(element(by.text(`No matches found for “${searchTerm}”`))).toBeVisible();
        await expect(element(by.text('Check the spelling or try another search.'))).toBeVisible();

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });

    it('MM-T63374 - should not display deactivated users in the create direct message screen', async () => {
        // # As admin, create a new user to test with
        const {user: deactivatedUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, deactivatedUser.id, testTeam.id);

        // # Open create direct message screen and verify we can find the user
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(deactivatedUser.username);
        await wait(timeouts.ONE_SEC);

        // * Verify the new user appears in search results before deactivation
        await expect(CreateDirectMessageScreen.getUserItemDisplayName(deactivatedUser.id)).toBeVisible();

        // # Close the create direct message screen
        await CreateDirectMessageScreen.close();

        // # Deactivate the user
        await User.apiDeactivateUser(siteOneUrl, deactivatedUser.id);

        // # Open create direct message screen again and search for the deactivated user
        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(deactivatedUser.username);
        await wait(timeouts.ONE_SEC);

        // * Verify the deactivated user does not appear in search results
        await expect(element(by.text(`No matches found for “${deactivatedUser.username}”`))).toBeVisible();

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });
});
