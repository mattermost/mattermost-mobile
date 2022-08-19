// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Post,
    Setup,
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
import {expect} from 'detox';

describe('Smoke Test - Autocomplete', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

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

    it('MM-T4886_1 - should be able to select and post at-mention suggestion', async () => {
        // # Type in "@" to activate at-mention autocomplete
        await ChannelScreen.postInput.typeText('@');
        await Autocomplete.toBeVisible();

        // * Verify at-mention list is displayed
        await expect(Autocomplete.sectionAtMentionList).toBeVisible();

        // # Type in username
        await ChannelScreen.postInput.typeText(testUser.username);

        // * Verify at-mention autocomplete contains associated user suggestion
        const {atMentionItem} = Autocomplete.getAtMentionItem(testUser.id);
        await expect(atMentionItem).toBeVisible();

        // # Select and post at-mention suggestion
        await atMentionItem.tap();
        await ChannelScreen.sendButton.tap();

        // * Verify at-mention suggestion is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, `@${testUser.username}`);
    });

    it('MM-T4886_2 - should be able to select and post channel mention suggestion', async () => {
        // # Type in "~" to activate channel mention autocomplete
        await ChannelScreen.postInput.typeText('~');
        await Autocomplete.toBeVisible();

        // * Verify channel mention list is displayed
        await expect(Autocomplete.sectionChannelMentionList).toBeVisible();

        // # Type in channel name
        await ChannelScreen.postInput.typeText(testChannel.name);

        // * Verify channel mention autocomplete contains associated channel suggestion
        const {channelMentionItem} = Autocomplete.getChannelMentionItem(testChannel.name);
        await expect(channelMentionItem).toBeVisible();

        // # Select and post channel mention suggestion
        await channelMentionItem.tap();
        await ChannelScreen.sendButton.tap();

        // * Verify channel mention suggestion is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, `~${testChannel.display_name}`);
    });

    it('MM-T4886_3 - should be able to select and post emoji suggestion', async () => {
        // # Type in ":" then first 2 characters of emoji name to activate emoji suggestion autocomplete
        const emojiName = 'fox_face';
        const emojiNameFirst2Chars = emojiName.substring(0, 2);
        const emojiName3rdToLastChars = emojiName.substring(2);
        await ChannelScreen.postInput.typeText(`:${emojiNameFirst2Chars}`);
        await Autocomplete.toBeVisible();

        // * Verify emoji suggestion list is displayed
        await expect(Autocomplete.flatEmojiSuggestionList).toBeVisible();

        // # Type in 3rd to last characters of emoji name
        await ChannelScreen.postInput.typeText(emojiName3rdToLastChars);

        // * Verify emoji suggestion autocomplete contains associated emoji suggestion
        const {emojiSuggestionItem} = Autocomplete.getEmojiSuggestionItem(emojiName);
        await expect(emojiSuggestionItem).toBeVisible();

        // # Select and post emoji suggestion
        await emojiSuggestionItem.tap();
        await ChannelScreen.sendButton.tap();

        // * Verify emoji suggestion is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, '🦊');
    });

    it('MM-T4886_4 - should be able to select and post slash suggestion', async () => {
        // # Type in "/" to activate slash suggestion autocomplete
        await ChannelScreen.postInput.typeText('/');
        await Autocomplete.toBeVisible();

        // * Verify slash suggestion list is displayed
        await expect(Autocomplete.flatSlashSuggestionList).toBeVisible();

        // # Type in slash command name
        const slashCommand = 'away';
        await ChannelScreen.postInput.typeText(slashCommand);

        // * Verify slash suggestion autocomplete contains associated slash command suggestion
        const {slashSuggestionItem} = Autocomplete.getSlashSuggestionItem(slashCommand);
        await expect(slashSuggestionItem).toBeVisible();

        // # Select and post slash suggestion
        await slashSuggestionItem.tap();
        await ChannelScreen.sendButton.tap();

        // * Verify slash suggestion is posted
        await expect(element(by.text('You are now away'))).toBeVisible();
    });
});
