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
import {
    ChannelListScreen,
    ChannelScreen,
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ReactionsScreen,
    ServerScreen,
    UserProfileScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Emojis and Reactions', () => {
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
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4862_1 - should be able to view recent reactions and add new reaction via post options', async () => {
        // # Open a channel screen, post a message, and open post options for message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);

        // * Verify six default reactions are displayed
        await expect(PostOptionsScreen.getReactionEmoji('+1')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('smiley')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('white_check_mark')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('heart')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('eyes')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('raised_hands')).toBeVisible();

        // # Open emoji picker screen and add a new reaction
        await EmojiPickerScreen.open(true);
        await EmojiPickerScreen.searchInput.replaceText('clown_face');
        await element(by.text('🤡')).tap();

        // * Verify new reaction is added to the message
        await expect(element(by.text('🤡').withAncestor(by.id(`channel.post_list.post.${post.id}`)))).toBeVisible();

        // # Open post options for message
        await ChannelScreen.openPostOptionsFor(post.id, message);

        // * Verify recent reactions are displayed, newest reaction first and then the first five default reactions
        await expect(PostOptionsScreen.getReactionEmoji('clown_face')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('+1')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('smiley')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('white_check_mark')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('heart')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('eyes')).toBeVisible();
        await expect(PostOptionsScreen.getReactionEmoji('raised_hands')).not.toBeVisible();

        // # Go back to channel list screen
        await PostOptionsScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4862_2 - should be able to long press on a reaction to view the list of users who reacted', async () => {
        // # Open a channel screen, post a message, open post options for message, open emoji picker screen, and add a reaction
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await EmojiPickerScreen.open();
        await EmojiPickerScreen.searchInput.replaceText('fire');
        await element(by.text('🔥')).tap();

        // * Verify reaction is added to the message
        const reaction = element(by.text('🔥').withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await expect(reaction).toBeVisible();

        // # Long press on the reaction
        await reaction.longPress();

        // * Verify user who reacted with the emoji
        await ReactionsScreen.toBeVisible();
        const {reactorItemEmojiAliases, reactorItemUserProfilePicture, reactorItemUser} = ReactionsScreen.getReactorItem(testUser.id, 'fire');
        await expect(reactorItemEmojiAliases).toHaveText(':fire:');
        await expect(reactorItemUserProfilePicture).toBeVisible();
        await expect(reactorItemUser).toBeVisible();
        await reactorItemUser.tap();
        await expect(UserProfileScreen.userDisplayName).toHaveText(`@${testUser.username}`);

        // # Go back to channel list screen
        await UserProfileScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4862_3 - should be able to include emojis in a message and be able to find them in emoji bar and recently used section', async () => {
        // # Open a channel screen and post a message that includes emojis
        const message = 'brown fox :fox_face: lazy dog :dog:';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted with emojis
        const resolvedMessage = 'brown fox 🦊 lazy dog 🐶';
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, resolvedMessage);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for message
        await ChannelScreen.openPostOptionsFor(post.id, resolvedMessage);
        await PostOptionsScreen.toBeVisible();

        // * Verify emojis exist in emoji bar
        await expect(element(by.text('🦊'))).toExist();
        await expect(element(by.text('🐶'))).toExist();

        // # Open emoji picker screen
        await EmojiPickerScreen.open();

        // * Verify emojis exist in recently used section
        await expect(element(by.text('RECENTLY USED')).atIndex(0)).toBeVisible();
        await expect(element(by.text('🦊')).atIndex(0)).toExist();
        await expect(element(by.text('🐶')).atIndex(0)).toExist();

        // # Go back to channel list screen
        await EmojiPickerScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T4862_4 - should display empty search state for emoji picker', async () => {
        // # Open a channel screen, post a message, open post options for message, open emoji picker screen, and search for a non-existent emoji
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const searchTerm = 'blahblahblahblah';
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await EmojiPickerScreen.open();
        await EmojiPickerScreen.searchInput.replaceText(searchTerm);

        // * Verify empty search state for emoji picker
        await expect(element(by.text(`No matches found for “${searchTerm}”`))).toBeVisible();
        await expect(element(by.text('Check the spelling or try another search.'))).toBeVisible();

        // # Go back to channel list screen
        await EmojiPickerScreen.close();
        await ChannelScreen.back();
    });
});
