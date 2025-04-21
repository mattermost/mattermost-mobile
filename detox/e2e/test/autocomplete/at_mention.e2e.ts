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

describe('Autocomplete - At-Mention', () => {
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
        // # Log out
        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-T4878_1 - should suggest user based on username', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in username
        await ChannelScreen.postInput.typeText(testUser.username);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_2 - should suggest user based on nickname', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in nickname
        await ChannelScreen.postInput.typeText(testUser.nickname);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_3 - should suggest user based on first name', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in first name
        await ChannelScreen.postInput.typeText(testUser.first_name);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_4 - should suggest user based on last name', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in last name
        await ChannelScreen.postInput.typeText(testUser.last_name);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_5 - should suggest user based on lowercase first name', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in lowercase first name
        await ChannelScreen.postInput.typeText(testUser.first_name.toLowerCase());

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_6 - should suggest user based on lowercase last name', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in lowercase last name
        await ChannelScreen.postInput.typeText(testUser.last_name.toLowerCase());

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_7 - should suggest user based on full name with space', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in full name with space
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_8 - should suggest user based on partial full name with space', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in partial full name with space
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name.substring(0, testUser.last_name.length - 6)}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_9 - should stop suggesting user after full name with trailing space', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in full name
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toBeVisible();

        // # Type in trailing space
        await ChannelScreen.postInput.typeText(' ');
        await wait(timeouts.ONE_SEC);

        // * Verify at-mention autocomplete does not contain associated user suggestion
        await expect(userAtMentionAutocomplete).not.toBeVisible();
    });

    it('MM-T4878_10 - should stop suggesting user when keyword is not associated with any user', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in keyword not associated with any user
        await ChannelScreen.postInput.typeText(getRandomId());

        // * Verify at-mention autocomplete does not contain associated user suggestion
        await expect(userAtMentionAutocomplete).not.toBeVisible();
    });

    it('MM-T4878_11 - should be able to select at-mention multiple times', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await expect(Autocomplete.sectionAtMentionList).not.toBeVisible();
        await ChannelScreen.postInput.typeText('@');

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in username and tap on user at-mention autocomplete
        await ChannelScreen.postInput.typeText(testUser.username);
        await userAtMentionAutocomplete.tap();

        // * Verify at-mention list disappears
        await expect(Autocomplete.sectionAtMentionList).not.toBeVisible();

        // # Type in "@" again to re-activate at-mention list
        await ChannelScreen.postInput.typeText('@');

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();
    });

    it('MM-T4878_12 - should not be able to autocomplete deactivated user', async () => {
        // # Deactivate another channel member user and type in "@" to activate at-mention autocomplete
        await User.apiDeactivateUser(siteOneUrl, testOtherUser.id);
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in username of deactivated user
        await ChannelScreen.postInput.typeText(testOtherUser.username);

        // * Verify at-mention autocomplete does not contain associated user suggestion
        await expect(otherUserAtMentionAutocomplete).not.toBeVisible();

        // # Reactivate user, clear post input, and type in "@" to activate at-mention list
        await User.apiUpdateUserActiveStatus(siteOneUrl, testOtherUser.id, true);
        await ChannelScreen.postInput.clearText();
        await Autocomplete.toBeVisible(false);
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in username of reactivated user
        await ChannelScreen.postInput.typeText(testOtherUser.username);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(otherUserAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_13 - should be able to autocomplete out of channel user', async () => {
        // # Type in "@" to activate at-mention autocomplete
        const {user: outOfChannelUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, outOfChannelUser.id, testTeam.id);
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in username of out of channel user
        await ChannelScreen.postInput.typeText(outOfChannelUser.username);

        // * Verify at-mention autocomplete contains associated user suggestion
        const {atMentionItem: outOfChannelUserAtMentionAutocomplete} = Autocomplete.getAtMentionItem(outOfChannelUser.id);
        await expect(outOfChannelUserAtMentionAutocomplete).toBeVisible();
    });

    it('MM-T4878_14 - should include current user in autocomplete', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in username of current user
        await ChannelScreen.postInput.typeText(testUser.username);

        // * Verify at-mention autocomplete contains current user
        await wait(timeouts.TWO_SEC);
        const {atMentionItemUserDisplayName, atMentionItemProfilePicture} = Autocomplete.getAtMentionItem(testUser.id);
        await expect(atMentionItemUserDisplayName).toBeVisible();
        await expect(atMentionItemProfilePicture).toBeVisible();
    });
});
