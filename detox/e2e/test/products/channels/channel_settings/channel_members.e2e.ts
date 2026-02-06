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

    // Base setup (shared across all tests)
    let testUser: any;
    let testTeam: any;
    let testChannel: any;

    // Test-specific data
    let addMemberUser: any; // For MM-T3195
    let user2: any; // For MM-T856
    let memberUser: any; // For MM-T3196
    let privateChannel1: any; // For MM-T3204
    let privUser: any; // For MM-T3204
    let privateChannel2: any; // For MM-T3205
    let removeMeUser: any; // For MM-T3205
    let gmUser1: any; // For MM-T878
    let gmUser2: any; // For MM-T878

    beforeAll(async () => {
        // 1. Base setup (shared across all tests)
        const {user, team, channel} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;
        testChannel = channel;

        // 2. Test 1 (MM-T3195): User for adding to channel
        const {user: newUser1} = await User.apiCreateUser(siteOneUrl, {prefix: 'addmember'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser1.id, testTeam.id);
        addMemberUser = newUser1;

        // 3. Test 2 (MM-T856): Another user for adding to channel
        const {user: newUser2} = await User.apiCreateUser(siteOneUrl, {prefix: 'user2'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser2.id, testTeam.id);
        user2 = newUser2;

        // 4. Test 3 (MM-T3196): User already in channel for removal
        const {user: newUser3} = await User.apiCreateUser(siteOneUrl, {prefix: 'member'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser3.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, newUser3.id, testChannel.id);
        memberUser = newUser3;

        // 5. Test 4 (MM-T3204): Private channel + user to add
        const {channel: privChan1} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'P',
        });
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privChan1.id);
        privateChannel1 = privChan1;

        const {user: newUser4} = await User.apiCreateUser(siteOneUrl, {prefix: 'privuser'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser4.id, testTeam.id);
        privUser = newUser4;

        // 6. Test 5 (MM-T3205): Private channel + user already in it for removal
        const {channel: privChan2} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'P',
        });
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privChan2.id);
        privateChannel2 = privChan2;

        const {user: newUser5} = await User.apiCreateUser(siteOneUrl, {prefix: 'removeme'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser5.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, newUser5.id, privChan2.id);
        removeMeUser = newUser5;

        // 7. Test 6 (MM-T878): Two users for GM creation
        const {user: gmUserOne} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser1'});
        await wait(timeouts.ONE_SEC);
        const {user: gmUserTwo} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser2'});
        await wait(timeouts.ONE_SEC);
        await Team.apiAddUserToTeam(siteOneUrl, gmUserOne.id, testTeam.id);
        await wait(timeouts.ONE_SEC);
        await Team.apiAddUserToTeam(siteOneUrl, gmUserTwo.id, testTeam.id);
        await wait(timeouts.ONE_SEC);
        gmUser1 = gmUserOne;
        gmUser2 = gmUserTwo;

        // 8. Login once with test user
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3195 - RN apps Add members to channel', async () => {
        // # Use pre-created user
        const newUser = addMemberUser;

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
        // # Use pre-created user
        const newUser = user2;

        // # Open default test channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // # Open channel info and tap add members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Dismiss tutorial if present and search and add user
        await AddMembersScreen.dismissTutorial();
        await AddMembersScreen.toBeVisible();
        await AddMembersScreen.searchAndAddUser(newUser.username, newUser.id);

        // * Verify user added system message appears
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${newUser.username} added to the channel by ${testUser.username}`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();
        await ChannelScreen.back();
    });

    it('MM-T3196 - RN apps Manage members in channel', async () => {
        // # Use pre-created user (already in channel)
        const removedUser = memberUser;

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
        await ManageChannelMembersScreen.searchAndRemoveUser(removedUser.username, removedUser.id);

        // * Verify user removed system message appears
        await ChannelInfoScreen.close();
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${removedUser.username} was removed from the channel`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();
        await ChannelScreen.back();
    });

    it('MM-T3204 - RN apps Add user to private channel', async () => {
        // # Use pre-created private channel and user
        const privateChannel = privateChannel1;
        const newUser = privUser;

        // # Open private channel
        await ChannelScreen.open(channelsCategory, privateChannel.name);

        // # Open channel info and tap add members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Dismiss tutorial if present and search and add user
        await AddMembersScreen.dismissTutorial();
        await AddMembersScreen.toBeVisible();
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
        // # Use pre-created private channel and user (already in channel)
        const privateChannel = privateChannel2;
        const removedUser = removeMeUser;

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
        await ManageChannelMembersScreen.searchAndRemoveUser(removedUser.username, removedUser.id);

        // * Verify user removed system message appears
        await ChannelInfoScreen.close();
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${removedUser.username} was removed from the channel`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T878 - RN apps View Members in GM', async () => {

        await CreateDirectMessageScreen.open();
        await CreateDirectMessageScreen.searchInput.replaceText(`${gmUser1.username}`);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.getUserItem(gmUser1.id).tap();

        // * Verify the first new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(gmUser1.id)).toBeVisible();

        // # Search for the second new user and tap on the second new user item
        await CreateDirectMessageScreen.searchInput.replaceText(`${gmUser2.username}`);
        await CreateDirectMessageScreen.searchInput.tapReturnKey();
        await wait(timeouts.ONE_SEC);
        await CreateDirectMessageScreen.getUserItem(gmUser2.id).tap();

        // * Verify the second new user is selected
        await expect(CreateDirectMessageScreen.getSelectedDMUserDisplayName(gmUser2.id)).toBeVisible();

        // # Tap on start button
        await CreateDirectMessageScreen.startButton.tap();
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
