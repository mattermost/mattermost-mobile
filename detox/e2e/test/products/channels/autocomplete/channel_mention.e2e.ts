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

describe('Autocomplete - Channel Mention', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testOtherChannel: any;
    let testTeam: any;
    let channelMentionAutocomplete: any;
    let otherChannelMentionAutocomplete: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        ({channelMentionItem: channelMentionAutocomplete} = Autocomplete.getChannelMentionItem(testChannel.name));

        ({channel: testOtherChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id}));
        if (!testOtherChannel?.id) {
            throw new Error('[beforeAll] Failed to create testOtherChannel');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, user.id, testOtherChannel.id);
        ({channelMentionItem: otherChannelMentionAutocomplete} = Autocomplete.getChannelMentionItem(testOtherChannel.name));

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

    it('MM-T4879_1 - should suggest channel based on channel name', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete.
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in channel name
        await ChannelScreen.postInput.typeText(testChannel.name);

        // * Verify channel mention autocomplete contains associated channel suggestion
        await expect(channelMentionAutocomplete).toExist();
    });

    it('MM-T4879_2 - should suggest channel based on channel display name', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in channel display name
        await ChannelScreen.postInput.typeText(testChannel.display_name);

        // * Verify channel mention autocomplete contains associated channel suggestion
        await expect(channelMentionAutocomplete).toExist();
    });

    it('MM-T4879_3 - should suggest channel based on lowercase channel display name', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in lowercase channel display name
        await ChannelScreen.postInput.typeText(testChannel.display_name.toLowerCase());

        // * Verify channel mention autocomplete contains associated channel suggestion
        await expect(channelMentionAutocomplete).toExist();
    });

    it('MM-T4879_4 - should suggest channel based on partial channel display name', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in partial channel display name
        await ChannelScreen.postInput.typeText(`${testChannel.display_name.substring(0, testChannel.display_name.length - 4)}`);

        // * Verify channel mention autocomplete contains associated channel suggestion
        await expect(channelMentionAutocomplete).toExist();
    });

    it('MM-T4879_5 - should stop suggesting channel after channel display name with trailing space', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in channel display name
        await ChannelScreen.postInput.typeText(testChannel.display_name);

        // * Verify channel mention autocomplete contains associated channel suggestion
        await expect(channelMentionAutocomplete).toExist();

        // # Type in trailing space
        await ChannelScreen.postInput.typeText(' ');
        await wait(timeouts.ONE_SEC);

        // * Verify channel mention autocomplete does not contain associated channel suggestion
        await expect(channelMentionAutocomplete).not.toExist();
    });

    it('MM-T4879_6 - should stop suggesting channel when keyword is not associated with any channel', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in keyword not associated with any channel
        await ChannelScreen.postInput.typeText(getRandomId());

        // * Verify channel mention autocomplete does not contain associated channel suggestion
        await expect(channelMentionAutocomplete).not.toExist();
    });

    it('MM-T4879_7 - should be able to select channel mention multiple times', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete
        await expect(Autocomplete.sectionChannelMentionList).not.toExist();
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in channel name and tap on channel mention autocomplete
        await ChannelScreen.postInput.typeText(testChannel.name);
        await channelMentionAutocomplete.tap();

        // * Verify channel mention list disappears
        // After selecting a channel mention, the autocomplete dismissal is driven
        // by a React state update; on iOS 26 CI the assertion can race the update
        // (see MM-T4879_5 which uses the same settle-then-assert pattern after
        // typing a trailing space). Brief settle keeps this deterministic without
        // a timeout bump.
        await wait(timeouts.ONE_SEC);
        await expect(Autocomplete.sectionChannelMentionList).not.toExist();

        // # Clear the input (which now contains the inserted channel mention text),
        // then re-activate channel mention list via the tilde quick action.
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();
    });

    it('MM-T4879_8 - should be able to autocomplete archived channel', async () => {
        // # Archive another team channel and tap tilde quick action to activate autocomplete
        await Channel.apiDeleteChannel(siteOneUrl, testOtherChannel.id);
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in channel name of archived channel
        await ChannelScreen.postInput.typeText(testOtherChannel.name);

        // * Verify channel mention autocomplete contains associated channel suggestion
        await expect(otherChannelMentionAutocomplete).toExist();

        // # Unarchive channel, clear post input, and tap tilde quick action to activate autocomplete
        await Channel.apiRestoreChannel(siteOneUrl, testOtherChannel.id);
        await ChannelScreen.postInput.clearText();
        await Autocomplete.toBeVisible(false);
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in channel name of unarchived channel
        await ChannelScreen.postInput.typeText(testOtherChannel.name);

        // * Verify channel mention autocomplete contains associated channel suggestion
        await expect(otherChannelMentionAutocomplete).toExist();
    });

    it('MM-T4879_9 - should not be able to autocomplete out of team channel', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete
        const {team: otherTeam} = await Team.apiCreateTeam(siteOneUrl);
        const {channel: outOfTeamChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: otherTeam.id});
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in channel name of out of team channel
        await ChannelScreen.postInput.typeText(outOfTeamChannel.name);

        // * Verify channel mention autocomplete does not contain associated channel suggestion
        const {channelMentionItem: outOfTeamChannelChannelMentionAutocomplete} = Autocomplete.getChannelMentionItem(outOfTeamChannel.name);
        await expect(outOfTeamChannelChannelMentionAutocomplete).not.toExist();
    });

    it('MM-T4879_10 - should include current channel in autocomplete', async () => {
        // # Tap tilde quick action to insert "~" and activate channel mention autocomplete
        await ChannelScreen.tildeInputQuickAction.tap();
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toExist();

        // # Type in channel name of current channel
        await ChannelScreen.postInput.typeText(testChannel.name);

        // * Verify channel mention autocomplete contains current channel
        const {channelMentionItemChannelDisplayName} = Autocomplete.getChannelMentionItem(testChannel.name);
        await expect(channelMentionItemChannelDisplayName).toExist();
    });
});
