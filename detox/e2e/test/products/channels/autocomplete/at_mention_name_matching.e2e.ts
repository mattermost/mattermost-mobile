// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
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

describe('Autocomplete - At-Mention - Name Matching', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;
    let userAtMentionAutocomplete: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;
        ({atMentionItem: userAtMentionAutocomplete} = Autocomplete.getAtMentionItem(testUser.id));

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
        try {
            await ChannelScreen.back();
        } catch {
            // Channel may already be closed on iOS 26 after test interruptions
        }
        await HomeScreen.logout();
    });

    it('MM-T3409_1 - should suggest user based on username', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in username
        await ChannelScreen.postInput.typeText(testUser.username);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T3409_2 - should suggest user based on nickname', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in nickname
        await ChannelScreen.postInput.typeText(testUser.nickname);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T3409_3 - should suggest user based on camel case first name', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in camel case first name
        await ChannelScreen.postInput.typeText(testUser.first_name);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T3409_4 - should suggest user based on camel case last name', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in camel case last name
        await ChannelScreen.postInput.typeText(testUser.last_name);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T3409_5 - should suggest user based on lower case first name', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in lowercase first name
        await ChannelScreen.postInput.typeText(testUser.first_name.toLowerCase());

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T3409_6 - should suggest user based on lower case last name', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in lowercase last name
        await ChannelScreen.postInput.typeText(testUser.last_name.toLowerCase());

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T3409_7 - should suggest user based on full name with space', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in full name with space between first and last name
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T3409_8 - should suggest user based on partial full name with space', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in partial full name with space (first name + partial last name)
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name.substring(0, testUser.last_name.length - 6)}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();
    });

    it('MM-T3409_9 - should stop suggesting user after full name with trailing space', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in full name
        await ChannelScreen.postInput.typeText(`${testUser.first_name} ${testUser.last_name}`);

        // * Verify at-mention autocomplete contains associated user suggestion
        await expect(userAtMentionAutocomplete).toExist();

        // # Type in trailing space after full name
        await ChannelScreen.postInput.typeText(' ');
        await wait(timeouts.ONE_SEC);

        // * Verify at-mention autocomplete does not contain associated user suggestion
        await expect(userAtMentionAutocomplete).not.toExist();
    });

    it('MM-T3409_10 - should stop suggesting user when keyword is not associated with any user', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toExist();

        // # Type in keyword not associated with any user
        await ChannelScreen.postInput.typeText(getRandomId());
        await wait(timeouts.ONE_SEC);

        // * Verify at-mention autocomplete does not contain associated user suggestion
        await expect(userAtMentionAutocomplete).not.toExist();
    });

    it('MM-T3409_11 - should be able to select at-mention multiple times', async () => {
        // * Verify at-mention list is not displayed
        await expect(Autocomplete.sectionAtMentionList).not.toExist();

        // # Type in "@" and username, then tap user to select
        await ChannelScreen.postInput.typeText('@');
        await wait(timeouts.ONE_SEC);
        await expect(Autocomplete.sectionAtMentionList).toExist();
        await ChannelScreen.postInput.typeText(testUser.username);
        await userAtMentionAutocomplete.tap();

        // * Verify at-mention list disappears after selection
        await expect(Autocomplete.sectionAtMentionList).not.toExist();

        // # Type in "@" again to re-activate at-mention list
        await ChannelScreen.postInput.typeText('@');
        await wait(timeouts.ONE_SEC);

        // * Verify at-mention list is displayed again
        await expect(Autocomplete.sectionAtMentionList).toExist();
    });
});
