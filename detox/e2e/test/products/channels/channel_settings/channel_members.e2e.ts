// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3195: RN apps Add members to channel
 * - MM-T856: Add existing users to public channel from drop-down Add Members
 * - MM-T3196: RN apps Manage members in channel
 * - MM-T3204: RN apps Add user to private channel
 * - MM-T3205: RN apps Remove user from private channel
 * - MM-T878: RN apps View Members in GM
 */

import {Channel, Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    AddMembersScreen,
    ChannelInfoScreen,
    ChannelScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    ManageChannelMembersScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let testTeam: any;
    let testChannel: any;

    beforeAll(async () => {
        const {user, team, channel} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;
        testChannel = channel;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3195 - RN apps Add members to channel', async () => {
        // # Create a new user and add to team
        const {user: newUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'addmember'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);

        // # Open default test channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open channel info and tap add members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Dismiss tutorial if present
        await AddMembersScreen.dismissTutorial();
        await AddMembersScreen.toBeVisible();

        // # Search and add user
        await AddMembersScreen.searchAndAddUser(newUser.username, newUser.id);

        // * Verify user added system message appears
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${newUser.username} added to the channel by ${testUser.username}`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();
        await ChannelScreen.back();
    });

    it('MM-T856 - Add existing users to public channel from drop-down Add Members', async () => {
        // # Create a new user and add to team
        const {user: user2} = await User.apiCreateUser(siteOneUrl, {prefix: 'user2'});
        await Team.apiAddUserToTeam(siteOneUrl, user2.id, testTeam.id);

        // # Open default test channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open channel info and tap add members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Dismiss tutorial if present and search and add user
        await AddMembersScreen.toBeVisible();
        await AddMembersScreen.dismissTutorial();
        await AddMembersScreen.searchAndAddUser(user2.username, user2.id);

        // * Verify user added system message appears
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${user2.username} added to the channel by ${testUser.username}`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();
        await ChannelScreen.back();
    });

    it('MM-T3196 - RN apps Manage members in channel', async () => {
        // # Create a new user, add to team and channel
        const {user: memberUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'member'});
        await Team.apiAddUserToTeam(siteOneUrl, memberUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, memberUser.id, testChannel.id);

        // # Open default test channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open channel info and tap members option
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.membersOption).toBeVisible();
        await ChannelInfoScreen.membersOption.tap();

        await wait(timeouts.TWO_SEC);
        await element(by.text(isAndroid()? 'MANAGE': 'Manage')).tap();
        await wait(timeouts.TWO_SEC);

        // # Search and remove user
        await ManageChannelMembersScreen.searchAndRemoveUser(memberUser.username, memberUser.id);

        // * Verify user removed system message appears
        await ChannelInfoScreen.close();
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${memberUser.username} was removed from the channel`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();
        await ChannelScreen.back();
    });

    it('MM-T3204 - RN apps Add user to private channel', async () => {
        // # Create private channel
        const {channel: privateChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'P',
        });

        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privateChannel.id);

        // # Create a new user and add to team
        const {user: newUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'privuser'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);

        // # Open private channel
        await ChannelScreen.open(channelsCategory, privateChannel.name);

        // # Open channel info and tap add members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Dismiss tutorial if present and search and add user
        await AddMembersScreen.toBeVisible();
        await AddMembersScreen.dismissTutorial();
        await AddMembersScreen.searchAndAddUser(newUser.username, newUser.id);

        // * Verify user added system message appears
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${newUser.username} added to the channel by ${testUser.username}`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T3205 - RN apps Remove user from private channel', async () => {
        // # Create private channel
        const {channel: privateChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'P',
        });
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privateChannel.id);

        // # Create a new user, add to team and private channel
        const {user: memberUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'removeme'});
        await Team.apiAddUserToTeam(siteOneUrl, memberUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, memberUser.id, privateChannel.id);

        // # Open private channel
        await ChannelScreen.open(channelsCategory, privateChannel.name);

        // # Open channel info and tap members option
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.membersOption).toBeVisible();
        await ChannelInfoScreen.membersOption.tap();
        await wait(timeouts.TWO_SEC);

        await element(by.text(isAndroid()? 'MANAGE': 'Manage')).tap();
        await wait(timeouts.TWO_SEC);

        // # Search and remove user
        await ManageChannelMembersScreen.searchAndRemoveUser(memberUser.username, memberUser.id);

        // * Verify user removed system message appears
        await ChannelInfoScreen.close();
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${memberUser.username} was removed from the channel`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T878 - RN apps View Members in GM', async () => {
        // # Create two new users and add to team
        const {user: user1} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser1'});
        await wait(timeouts.ONE_SEC);
        const {user: user2} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser2'});
        await wait(timeouts.ONE_SEC);
        await Team.apiAddUserToTeam(siteOneUrl, user1.id, testTeam.id);
        await wait(timeouts.ONE_SEC);
        await Team.apiAddUserToTeam(siteOneUrl, user2.id, testTeam.id);
        await wait(timeouts.ONE_SEC);

        // # Create a group message
        await CreateDirectMessageScreen.open();
        await wait(timeouts.TWO_SEC);
        await CreateDirectMessageScreen.closeTutorial();
        await wait(timeouts.TWO_SEC);

        await CreateDirectMessageScreen.searchInput.replaceText(user1.username);
        await wait(timeouts.ONE_SEC);
        const user1Item = CreateDirectMessageScreen.getUserItem(user1.id);
        await waitFor(user1Item).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await user1Item.tap();
        await wait(timeouts.ONE_SEC);

        await CreateDirectMessageScreen.searchInput.replaceText(user2.username);
        await wait(timeouts.ONE_SEC);

        const user2Item = CreateDirectMessageScreen.getUserItem(user2.id);
        await waitFor(user2Item).toBeVisible().whileElement(by.id(CreateDirectMessageScreen.testID.flatUserList)).scroll(200, 'down');
        await user2Item.tap();
        await wait(timeouts.ONE_SEC);

        await CreateDirectMessageScreen.startButton.tap();
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.dismissScheduledPostTooltip();
        await ChannelScreen.toBeVisible();

        // # Open channel info and tap members option
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.membersOption).toBeVisible();
        await ChannelInfoScreen.membersOption.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify members list is visible
        await expect(ManageChannelMembersScreen.gmMemberSectionList).toBeVisible();

        // # Go back
        await ManageChannelMembersScreen.backButton.tap();
        await wait(timeouts.ONE_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
