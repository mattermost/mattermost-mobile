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
import {Autocomplete} from '@support/ui/component';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Autocomplete - At-Mention - User Suggestions', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let testOtherUser: any;
    let userAtMentionAutocomplete: any;
    let otherUserAtMentionAutocomplete: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;
        ({atMentionItem: userAtMentionAutocomplete} = Autocomplete.getAtMentionItem(testUser.id));

        ({user: testOtherUser} = await User.apiCreateUser(siteOneUrl));
        if (!testOtherUser?.id) {
            throw new Error('[beforeAll] Failed to create testOtherUser');
        }
        await Team.apiAddUserToTeam(siteOneUrl, testOtherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, testOtherUser.id, testChannel.id);
        ({atMentionItem: otherUserAtMentionAutocomplete} = Autocomplete.getAtMentionItem(testOtherUser.id));

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Open a channel screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    beforeEach(async () => {
        // # Clear post input
        await ChannelScreen.postInput.clearText();

        // * Verify autocomplete is not displayed
        await Autocomplete.toBeVisible(false);
    });

    afterAll(async () => {
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-T4878_1 - should suggest user based on username', async () => {
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in username
        await ChannelScreen.postInput.typeText(testUser.username);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_2 - should suggest user based on nickname', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in nickname
        await ChannelScreen.postInput.typeText(testUser.nickname);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_3 - should suggest user based on first name', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in first name
        await ChannelScreen.postInput.typeText(testUser.first_name);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_4 - should suggest user based on last name', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in last name
        await ChannelScreen.postInput.typeText(testUser.last_name);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_5 - should suggest user based on lowercase first name', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in lowercase first name
        await ChannelScreen.postInput.typeText(testUser.first_name.toLowerCase());

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_6 - should suggest user based on lowercase last name', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in lowercase last name
        await ChannelScreen.postInput.typeText(testUser.last_name.toLowerCase());

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_7 - should suggest user based on full name with space', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in full name with space
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_8 - should suggest user based on partial full name with space', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in partial full name with space
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name.substring(0, testUser.last_name.length - 6)}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_9 - should stop suggesting user after full name with trailing space', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in full name
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();

        // # Add trailing space. Clear and retype to ensure cursor lands at end.
        // replaceText leaves cursor position stale on Android; typeText(' ') alone
        // can center-click and land between first/last names, creating a double-space.
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.atInputQuickAction.tap();
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name} `);
        await wait(timeouts.ONE_SEC);

        // * Verify at-mention autocomplete does not contain associated user suggestion
        await expect(userAtMentionAutocomplete).not.toExist();
    });

    it('MM-T4878_10 - should stop suggesting user when keyword is not associated with any user', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in keyword not associated with any user
        await ChannelScreen.postInput.typeText(getRandomId());
        await wait(timeouts.ONE_SEC);

        // * Verify at-mention autocomplete does not contain associated user suggestion
        await expect(userAtMentionAutocomplete).not.toExist();
    });

    it('MM-T4878_11 - should be able to select at-mention multiple times', async () => {
        // * Verify at-mention list is not displayed
        await expect(Autocomplete.sectionAtMentionList).not.toExist();

        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in username and tap on user at-mention autocomplete
        await ChannelScreen.postInput.typeText(testUser.username);
        await userAtMentionAutocomplete.tap();

        // * Verify at-mention list disappears
        await expect(Autocomplete.sectionAtMentionList).not.toExist();

        // # Clear the input so atInputQuickAction starts with an empty field, then
        // tap "@" again to re-activate at-mention list. After a mention is inserted the
        // input contains "@username " — clearText resets cursor state before the re-tap.
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();
    });

    it('MM-T4878_12 - should not be able to autocomplete deactivated user', async () => {
        // # Deactivate another channel member and tap "@" to activate at-mention autocomplete
        await User.apiDeactivateUser(siteOneUrl, testOtherUser.id);
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in username of deactivated user
        await ChannelScreen.postInput.typeText(testOtherUser.username);

        // * Verify at-mention autocomplete does not contain associated user suggestion
        await expect(otherUserAtMentionAutocomplete).not.toExist();

        // # Reactivate user, clear post input, and tap "@" to activate at-mention list
        await User.apiUpdateUserActiveStatus(siteOneUrl, testOtherUser.id, true);
        await ChannelScreen.postInput.clearText();
        await Autocomplete.toBeVisible(false);
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in username of reactivated user
        await ChannelScreen.postInput.typeText(testOtherUser.username);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(otherUserAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_13 - should be able to autocomplete out of channel user', async () => {
        // # Create a team member not in the channel, tap "@" to activate at-mention autocomplete
        const {user: outOfChannelUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, outOfChannelUser.id, testTeam.id);
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in username of out of channel user
        await ChannelScreen.postInput.typeText(outOfChannelUser.username);

        // * Verify at-mention autocomplete contains associated user suggestion
        const {atMentionItem: outOfChannelUserAtMentionAutocomplete} = Autocomplete.getAtMentionItem(outOfChannelUser.id);
        await expect(outOfChannelUserAtMentionAutocomplete).toExist();
    });

    it('MM-T4878_14 - should include current user in autocomplete', async () => {
        // # Tap the @ quick action to activate at-mention autocomplete
        await ChannelScreen.atInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in username of current user
        await ChannelScreen.postInput.typeText(testUser.username);

        // * Verify at-mention autocomplete contains current user with display name and profile picture
        await wait(timeouts.TWO_SEC);
        const {atMentionItemUserDisplayName, atMentionItemProfilePicture} = Autocomplete.getAtMentionItem(testUser.id);
        await expect(atMentionItemUserDisplayName).toExist();
        await expect(atMentionItemProfilePicture).toExist();
    });
});
