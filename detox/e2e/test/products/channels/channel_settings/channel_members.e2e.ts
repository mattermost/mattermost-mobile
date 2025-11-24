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
 */

import {Channel, Setup, Team, User} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelScreen,
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

    it('MM-T3195 - RN apps Add members to channel', async () => {
        // Expected Results (for all steps):
        // * The user is added to the channel
        // * Total number of members next to "manage members" menu option should increase by the number of users added to the channel
        // * System message should display in the channel showing which members were added to the channel.
        // * Tapping on the user's name in the system message should open the user's profile from where you can send them a DM

        // # Setup: Create a test channel and a new user to add
        const channelName = `add-members-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        const {user: newUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'addmember'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);

        // Navigate to the channel
        await ChannelScreen.open('public', channel.display_name);

        // # Step 1: Tap a channel title to view channel info, and note the number of channel members next to Manage Members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 2: Tap on "Add members", observe list of users on the server
        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Step 3: Tap on "Search", observe keyboard opens
        // Search input should be available
        const addMembersSearchInput = element(by.id('add_members.search_bar.search.input'));
        await expect(addMembersSearchInput).toBeVisible();

        // # Step 4: Type in the name of the user to be added, observe user list filters accordingly
        await addMembersSearchInput.typeText(newUser.username);
        await wait(timeouts.TWO_SEC);

        // # Step 5: Tap on the circle to the left of the user's name (first tap may just close keyboard; may have to tap again), observe the circle next to their name appears selected
        const userItem = element(by.id(`add_members.user_list.user_item.${newUser.id}.${newUser.id}`));
        await waitFor(userItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await userItem.tap();
        await wait(timeouts.ONE_SEC);

        // # Step 6: Tap on "add" at the top right of the screen
        const addButton = element(by.id('add_members.add.button'));
        await expect(addButton).toBeVisible();
        await addButton.tap();
        await wait(timeouts.TWO_SEC);

        // * The user is added to the channel
        // * System message should display in the channel showing which members were added to the channel.
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        // Verify system message about user being added
        const systemMessage = `${newUser.username} added to the channel by ${testUser.username}`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible().
            whileElement(by.id('post_list.flat_list')).
            scroll(50, 'down');

        // Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T856 - Add existing users to public channel from drop-down Add Members', async () => {
        // Expected Results (for all steps):
        // * at step 5. Selected user is removed from the list as soon as it is selected to be added
        // * At step 7. System message posts in channel for each user added: "[user2, user3, user4] added to the channel by [user1]" (or "added... by you"), visible for both user1 and user2
        // * This step N/A for mobile view / RN:
        // * On user1 clicking "members" icon at top of channel, added user2 and user3 appear in list

        // # Setup: Create test channel and user
        const channelName = `add-users-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // # Step 1: In another window/browser, log in as another user, who you want to add to the public channel [user2]
        const {user: user2} = await User.apiCreateUser(siteOneUrl, {prefix: 'user2'});
        await Team.apiAddUserToTeam(siteOneUrl, user2.id, testTeam.id);

        // # Step 2: As user1 in your main browser or device, view a public channel other than Town Square or Off-Topic (can create a new channel if needed)
        await ChannelScreen.open('public', channel.display_name);

        // # Step 3: Click the "v" to the right of the channel name at the top of the center panel (mobile apps tap the channel name)
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 4: Click or tap "Add Members" and search for 'user2'
        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        const searchInput = element(by.id('add_members.search_bar.search.input'));
        await expect(searchInput).toBeVisible();
        await searchInput.typeText(user2.username);
        await wait(timeouts.TWO_SEC);

        // # Step 5: Select the member [user2] you want to add to the channel and observe that the user is added to the modal text box or on mobile has check mark next to the name Verify status icon displays on the user's profile picture on the search results list
        // * Selected user is removed from the list as soon as it is selected to be added
        const userItem = element(by.id(`add_members.user_list.user_item.${user2.id}.${user2.id}`));
        await waitFor(userItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await userItem.tap();
        await wait(timeouts.ONE_SEC);

        // Add the user
        const addButton = element(by.id('add_members.add.button'));
        await expect(addButton).toBeVisible();
        await addButton.tap();
        await wait(timeouts.TWO_SEC);

        // * System message posts in channel for each user added
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${user2.username} added to the channel by ${testUser.username}`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible().
            whileElement(by.id('post_list.flat_list')).
            scroll(50, 'down');

        // Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T3196 - RN apps Manage members in channel', async () => {
        // Expected Results (for all steps):
        // * The user should disappear from the list of users and be removed from the channel
        // * A system message showing that the user has been removed from the channel should display in the channel

        // # Setup: Create a test channel and add a user to it
        const channelName = `manage-members-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        const {user: memberUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'member'});
        await Team.apiAddUserToTeam(siteOneUrl, memberUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, memberUser.id, channel.id);

        // Navigate to the channel
        await ChannelScreen.open('public', channel.display_name);

        // # Step 1: In channel info screen, note the number of users in the channel
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 2: Tap on "Manage members"
        await expect(ChannelInfoScreen.membersOption).toBeVisible();
        await ChannelInfoScreen.membersOption.tap();
        await wait(timeouts.TWO_SEC);

        // # Step 3: Tap on the circle to the left of a user, observe it appears selected
        const manageMembersSearchInput = element(by.id('manage_members.search_bar.search.input'));
        await expect(manageMembersSearchInput).toBeVisible();
        await manageMembersSearchInput.typeText(memberUser.username);
        await wait(timeouts.TWO_SEC);

        const userItem = element(by.id(`manage_members.user_list.user_item.${memberUser.id}.${memberUser.id}`));
        await waitFor(userItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await userItem.tap();
        await wait(timeouts.ONE_SEC);

        // # Step 4: Tap on "remove" at the top right of the screen, observe confirmation message
        const removeButton = element(by.id('manage_members.remove.button'));
        await expect(removeButton).toBeVisible();
        await removeButton.tap();
        await wait(timeouts.ONE_SEC);

        // # Step 5: Tap on "yes" to remove the user from the channel
        const yesButton = element(by.text('Yes'));
        await expect(yesButton).toBeVisible();
        await yesButton.tap();
        await wait(timeouts.TWO_SEC);

        // * The user should disappear from the list of users and be removed from the channel
        // * A system message showing that the user has been removed from the channel should display in the channel
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        // Verify system message about user being removed
        const systemMessage = `${memberUser.username} was removed from the channel`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible().
            whileElement(by.id('post_list.flat_list')).
            scroll(50, 'down');

        // Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T3204 - RN apps Add user to private channel', async () => {
        // Expected Results (for all steps):
        // * After #2,
        // * A list of users on the server should be displayed
        // * After #3,
        // * Your keyboard should pop up so you can type in the name of a user.
        // * The list should filter as you type in the name and display all users matching your input
        // * After #4,
        // * The circle should show blue with a white tick (selected)
        // * After #5,
        // * The user should be added to the channel, total number of members next to "manage members" menu option should increase by the number of users added to the channel and a system message should display in the channel showing which members were added to the channel.

        // # Setup: Create a private test channel and a new user
        const channelName = `private-add-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'P',
        });

        const {user: newUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'privuser'});
        await Team.apiAddUserToTeam(siteOneUrl, newUser.id, testTeam.id);

        // Navigate to the channel
        await ChannelScreen.open('private', channel.display_name);

        // # Step 1: Tap the name of a private channel where you have permission to add members
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 2: Tap Add Members
        // * A list of users on the server should be displayed
        await expect(ChannelInfoScreen.addMembersAction).toBeVisible();
        await ChannelInfoScreen.addMembersAction.tap();
        await wait(timeouts.TWO_SEC);

        // # Step 3: Type the beginning of a user's name in the search box
        // * Your keyboard should pop up so you can type in the name of a user.
        // * The list should filter as you type in the name and display all users matching your input
        const searchInput = element(by.id('add_members.search_bar.search.input'));
        await expect(searchInput).toBeVisible();
        await searchInput.typeText(newUser.username);
        await wait(timeouts.TWO_SEC);

        // # Step 4: Select user
        // * The circle should show blue with a white tick (selected)
        const userItem = element(by.id(`add_members.user_list.user_item.${newUser.id}.${newUser.id}`));
        await waitFor(userItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await userItem.tap();
        await wait(timeouts.ONE_SEC);

        // # Step 5: Tap Add
        // * The user should be added to the channel
        const addButton = element(by.id('add_members.add.button'));
        await expect(addButton).toBeVisible();
        await addButton.tap();
        await wait(timeouts.TWO_SEC);

        // * System message should display in the channel showing which members were added to the channel.
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${newUser.username} added to the channel by ${testUser.username}`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible().
            whileElement(by.id('post_list.flat_list')).
            scroll(50, 'down');

        // Go back to channel list
        await ChannelScreen.back();
    });

    it('MM-T3205 - RN apps Remove user from private channel', async () => {
        // Expected Results (for all steps):
        // * User is removed from channel:
        // * Member count decrements by one
        // * System message posts in channel for the user who removed them
        // * If watching as the removed user, that user sees Town Square, and the channel is removed from their channel drawer list
        // * User that was removed now also sees a message in a modal (from desktop) advising them they have been removed (if viewing channel while removed).

        // # Setup: Create a private channel with an additional member
        const channelName = `private-remove-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'P',
        });

        const {user: memberUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'removeme'});
        await Team.apiAddUserToTeam(siteOneUrl, memberUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, memberUser.id, channel.id);

        // Navigate to the channel
        await ChannelScreen.open('private', channel.display_name);

        // # Step 1: Tap the name of a private channel
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 2: Tap Manage Members
        await expect(ChannelInfoScreen.membersOption).toBeVisible();
        await ChannelInfoScreen.membersOption.tap();
        await wait(timeouts.TWO_SEC);

        // # Step 3: Type the beginning of a user's name in the search box
        const searchInput = element(by.id('manage_members.search_bar.search.input'));
        await expect(searchInput).toBeVisible();
        await searchInput.typeText(memberUser.username);
        await wait(timeouts.TWO_SEC);

        // # Step 4: Select user and tap Remove
        const userItem = element(by.id(`manage_members.user_list.user_item.${memberUser.id}.${memberUser.id}`));
        await waitFor(userItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await userItem.tap();
        await wait(timeouts.ONE_SEC);

        const removeButton = element(by.id('manage_members.remove.button'));
        await expect(removeButton).toBeVisible();
        await removeButton.tap();
        await wait(timeouts.ONE_SEC);

        // Confirm removal
        const yesButton = element(by.text('Yes'));
        await expect(yesButton).toBeVisible();
        await yesButton.tap();
        await wait(timeouts.TWO_SEC);

        // * User is removed from channel
        // * System message posts in channel for the user who removed them
        await ChannelScreen.toBeVisible();
        await wait(timeouts.TWO_SEC);

        const systemMessage = `${memberUser.username} was removed from the channel`;
        await waitFor(element(by.text(systemMessage).withAncestor(by.id('post_list')))).
            toBeVisible().
            whileElement(by.id('post_list.flat_list')).
            scroll(50, 'down');

        // Go back to channel list
        await ChannelScreen.back();
    });
});
