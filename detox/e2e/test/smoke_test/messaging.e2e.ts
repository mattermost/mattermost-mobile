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
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    EditPostScreen,
    EmojiPickerScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Smoke Test - Messaging', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const savedText = 'Saved';
    const pinnedText = 'Pinned';
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

    it('MM-T4786_1 - should be able to post, edit, and delete a message', async () => {
        // # Open a channel screen and post a message
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: originalPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(originalPostListPostItem).toBeVisible();

        // # Open post options for the message that was just posted and tap edit option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.saveButton.tap();

        // * Verify post message is updated and displays edited indicator '(edited)'
        const {postListPostItem: updatedPostListPostItem, postListPostItemEditedIndicator} = ChannelScreen.getPostListPostItem(post.id, updatedMessage);
        await expect(updatedPostListPostItem).toBeVisible();
        await expect(postListPostItemEditedIndicator).toHaveText('(edited)');

        // # Open post options for the updated message, tap delete option and confirm
        await ChannelScreen.openPostOptionsFor(post.id, updatedMessage);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify post message is deleted
        await expect(updatedPostListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4786_2 - should be able to reply to a message', async () => {
        // # Open a channel screen, post a message, and tap on the post
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await postListPostItem.tap();

        // * Verify on reply thread screen
        await ThreadScreen.toBeVisible();

        // * Verify no thread overview while there are no replies
        await expect(ThreadScreen.getThreadOverview()).not.toBeVisible();

        // # Reply to parent post
        const replyMessage = `${message} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply message is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(replyPostListPostItem).toBeVisible();

        // * Verify thread overview when there are replies
        await expect(ThreadScreen.getThreadOverview()).toBeVisible();

        // # Go back to channel list screen
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('MM-T4786_3 - should be able to include emojis in a message and add reaction to a message', async () => {
        // # Open a channel screen and post a message that includes emojis
        const message = 'The quick brown fox :fox_face: jumps over the lazy dog :dog:';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message is posted with emojis
        const resolvedMessage = 'The quick brown fox 🦊 jumps over the lazy dog 🐶';
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, resolvedMessage);
        await expect(postListPostItem).toBeVisible();

        // # Open post options for message, open emoji picker screen, and add a reaction
        await ChannelScreen.openPostOptionsFor(post.id, resolvedMessage);
        await EmojiPickerScreen.open(true);
        await EmojiPickerScreen.searchInput.replaceText('clown_face');
        await element(by.text('🤡')).tap();

        // * Verify reaction is added to the message
        await waitFor(element(by.text('🤡').withAncestor(by.id(`channel.post_list.post.${post.id}`)))).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4786_4 - should be able to follow/unfollow a message, save/unsave a message, and pin/unpin a message', async () => {
        // # Open a channel screen, post a message, open post options for message, and tap on follow message option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.followThreadOption.tap();

        // * Verify message is followed by user via post footer
        const {postListPostItem, postListPostItemFooterFollowingButton} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItemFooterFollowingButton).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Tap on following button via post footer
        await postListPostItemFooterFollowingButton.tap();

        // * Verify message is not followed by user via post footer
        await expect(postListPostItemFooterFollowingButton).not.toBeVisible();

        // # Open post options for message and tap on save option
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.savePostOption.tap();

        // * Verify saved text is displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        const {postListPostItemPreHeaderText: channelPostListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(channelPostListPostItemPreHeaderText).toHaveText(savedText);

        // # Tap on post to open thread and tap on thread overview unsave button
        await postListPostItem.tap();
        await element(by.text(message)).longPress();
        await PostOptionsScreen.unsavePostOption.tap();

        // * Verify saved text is not displayed on the post pre-header
        await expect(channelPostListPostItemPreHeaderText).not.toBeVisible();

        // # Open post options for message and tap on pin to channel option
        await ThreadScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.pinPostOption.tap();

        // * Verify pinned text is displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        const {postListPostItemPreHeaderText: threadPostListPostItemPreHeaderText} = ThreadScreen.getPostListPostItem(post.id, message);
        await expect(threadPostListPostItemPreHeaderText).toHaveText(pinnedText);

        // # Go back to channel, open post options for message, and tap on unpin from channel option
        await ThreadScreen.back();
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.unpinPostOption.tap();

        // * Verify pinned text is not displayed on the post pre-header
        await wait(timeouts.ONE_SEC);
        await expect(channelPostListPostItemPreHeaderText).not.toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4786_5 - should be able to post a message with at-mention and channel mention', async () => {
        // # Open a channel screen and post a message with at-mention and channel mention
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const message = `Message @${testUser.username} ~${targetChannel.name}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify at-mention is posted as lowercase and channel mention is posted as display name
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, `Message @${testUser.username.toLowerCase()} ~${targetChannel.display_name}`);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4786_6 - should be able to post labeled permalink and labeled channel link', async () => {
        // # Post a target message in a target channel
        const permalinkTargetMessage = `Message ${getRandomId()}`;
        const {channel: targetChannel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id});
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, targetChannel.id);
        const permalinkTargetPost = await Post.apiCreatePost(siteOneUrl, {
            channelId: targetChannel.id,
            message: permalinkTargetMessage,
        });

        // # Open a channel screen and post a message with labeled permalink to the target message and labeled channel link to the target channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        const permalinkLabel = `permalink-${getRandomId()}`;
        const permalinkMessage = `[${permalinkLabel}](/${testTeam.name}/pl/${permalinkTargetPost.id})`;
        const channelLinkLabel = `channel-link-${getRandomId()}`;
        const channelLinkMessage = `[${channelLinkLabel}](${serverOneUrl}/${testTeam.name}/channels/${targetChannel.name})`;
        const message = `Message ${permalinkMessage} ${channelLinkMessage}`;
        await ChannelScreen.postMessage(message);

        // * Verify permalink and channel link are posted as labeled links
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, `Message ${permalinkLabel} ${channelLinkLabel}`);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4786_7 - should be able to post a message with markdown', async () => {
        // # Open a channel screen and post a message with markdown
        const message = `Message ${getRandomId()}`;
        const markdown = `#### ${message}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(markdown);

        // * Verify message with markdown is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItemHeading} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItemHeading).toBeVisible();
        await expect(element(by.text(message))).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
