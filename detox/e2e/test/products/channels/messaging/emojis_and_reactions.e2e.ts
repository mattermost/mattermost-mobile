// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Post,
    Setup,
    Team,
    User,
} from '@support/server_api';
import client from '@support/server_api/client';
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
import {getRandomId, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Emojis and Reactions', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
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
        await EmojiPickerScreen.open();
        await device.disableSynchronization();
        await EmojiPickerScreen.searchInput.replaceText('clown_face');
        await EmojiPickerScreen.searchInput.tapReturnKey();
        await waitFor(element(by.text('🤡'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await element(by.text('🤡')).tap();
        await device.enableSynchronization();

        // * Verify new reaction is added to the message
        const reactionElement = element(by.text('🤡').withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await waitFor(reactionElement).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(reactionElement).toExist();

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
        await device.disableSynchronization();
        await EmojiPickerScreen.searchInput.replaceText('fire');
        await EmojiPickerScreen.searchInput.tapReturnKey();
        await waitFor(element(by.text('🔥'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await element(by.text('🔥')).tap();
        await device.enableSynchronization();

        // * Verify reaction is added to the message
        const reaction = element(by.text('🔥').withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await waitFor(reaction).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(reaction).toExist();

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
        await device.disableSynchronization();

        // * Verify emojis exist in recently used section
        await waitFor(element(by.text('RECENTLY USED')).atIndex(0)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.text('🦊')).atIndex(0)).toExist();
        await expect(element(by.text('🐶')).atIndex(0)).toExist();
        await device.enableSynchronization();

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
        await device.disableSynchronization();
        await EmojiPickerScreen.searchInput.replaceText(searchTerm);
        await EmojiPickerScreen.searchInput.tapReturnKey();

        // * Verify empty search state for emoji picker
        await waitFor(element(by.text(`No matches found for “${searchTerm}”`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.text('Check the spelling or try another search.'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await device.enableSynchronization();

        // # Go back to channel list screen
        await EmojiPickerScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T146 - should be able to tap another user\'s emoji reaction to add the same reaction and then remove it', async () => {
        // # Create another user, add them to the team and channel
        const {user: otherUser} = await User.apiCreateUser(siteOneUrl);
        await Team.apiAddUserToTeam(siteOneUrl, otherUser.id, testTeam.id);
        await Channel.apiAddUserToChannel(siteOneUrl, otherUser.id, testChannel.id);

        // # Post a message as the test user via API
        const message = `Message ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message});
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // # Log in as the other user via the shared API client and add a thumbsup reaction to the post
        await User.apiLogin(siteOneUrl, {username: otherUser.newUser.username, password: otherUser.newUser.password});
        await client.post(`${siteOneUrl}/api/v4/reactions`, {
            user_id: otherUser.id,
            post_id: post.id,
            emoji_name: '+1',
            create_at: 0,
        });

        // # Log back in as the test user so subsequent API calls use the right session
        await User.apiLogin(siteOneUrl, {username: testUser.username, password: testUser.password});

        // # Open the channel screen and verify the other user's reaction is visible
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const reactionEmoji = element(by.id('reaction.emoji.+1').withAncestor(by.id(`channel.post_list.post.${post.id}`)));
        await waitFor(reactionEmoji).toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the other user's +1 reaction is displayed on the post
        await expect(reactionEmoji).toExist();

        // # Tap the other user's reaction to add the same reaction from the current user
        await device.disableSynchronization();
        await reactionEmoji.tap();

        // * Verify the reaction count increases (current user has now also reacted)
        await waitFor(reactionEmoji).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(reactionEmoji).toExist();

        // # Tap the reaction again to remove the current user's reaction
        await reactionEmoji.tap();

        // * Verify the reaction still exists (other user's reaction remains) but current user's reaction is removed
        await waitFor(reactionEmoji).toExist().withTimeout(timeouts.TEN_SEC);
        await device.enableSynchronization();
        await expect(reactionEmoji).toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
