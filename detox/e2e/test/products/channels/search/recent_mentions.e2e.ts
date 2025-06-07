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
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PermalinkScreen,
    PinnedMessagesScreen,
    PostOptionsScreen,
    RecentMentionsScreen,
    SavedMessagesScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Search - Recent Mentions', () => {
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

    it('MM-T4909_1 - should match elements on recent mentions screen', async () => {
        // # Open recent mentions screen
        await RecentMentionsScreen.open();

        // * Verify basic elements on recent mentions screen
        await expect(RecentMentionsScreen.largeHeaderTitle).toHaveText('Recent Mentions');
        await expect(RecentMentionsScreen.largeHeaderSubtitle).toHaveText('Messages you\'ve been mentioned in');
        await expect(RecentMentionsScreen.emptyTitle).toHaveText('No Mentions yet');
        await expect(RecentMentionsScreen.emptyParagraph).toHaveText('You\'ll see messages here when someone mentions you or uses terms you\'re monitoring.');

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T4909_2 - should be able to display a recent mention in recent mentions screen and navigate to message channel', async () => {
        // # Open a channel screen and post a message with at-mention to current user
        const message = `@${testUser.username}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify message with at-mention to current user is posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel list screen and open recent mentions screen
        await ChannelScreen.back();
        await RecentMentionsScreen.open();

        // * Verify on recent mentions screen and recent mention is displayed with channel info
        await RecentMentionsScreen.toBeVisible();
        const {postListPostItem: recentMentionsPostListPostItem, postListPostItemChannelInfoChannelDisplayName, postListPostItemChannelInfoTeamDisplayName} = RecentMentionsScreen.getPostListPostItem(post.id, message);
        await expect(recentMentionsPostListPostItem).toBeVisible();
        await expect(postListPostItemChannelInfoChannelDisplayName).toHaveText(testChannel.display_name);
        await expect(postListPostItemChannelInfoTeamDisplayName).toHaveText(testTeam.display_name);

        // # Tap on post and jump to recent messages
        await recentMentionsPostListPostItem.tap();
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen and recent mention is displayed
        await ChannelScreen.toBeVisible();
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(channelPostListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });

    it('MM-T4909_3 - should be able to edit, reply to, and delete a recent mention from recent mentions screen', async () => {
        // # Open a channel screen, post a message with at-mention to current user, go back to channel list screen, and open recent mentions screen
        const message = `@${testUser.username}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await RecentMentionsScreen.open();

        // * Verify on recent mentions screen
        await RecentMentionsScreen.toBeVisible();

        // # Open post options for recent mention and tap on edit option
        const {post: mentionPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.saveButton.tap();

        // * Verify post message is updated and displays edited indicator '(edited)'
        const {postListPostItem: updatedPostListPostItem, postListPostItemEditedIndicator} = RecentMentionsScreen.getPostListPostItem(mentionPost.id, updatedMessage);
        await expect(updatedPostListPostItem).toBeVisible();
        await expect(postListPostItemEditedIndicator).toHaveText('(edited)');

        // # Open post options for recent mention and tap on reply option
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, updatedMessage);
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Post a reply
        const replyMessage = `${message} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to recent mentions screen
        await ThreadScreen.back();

        // * Verify reply count and following button
        const {postListPostItemFooterReplyCount, postListPostItemFooterFollowingButton} = RecentMentionsScreen.getPostListPostItem(mentionPost.id, updatedMessage);
        await expect(postListPostItemFooterReplyCount).toHaveText('1 reply');
        await expect(postListPostItemFooterFollowingButton).toBeVisible();

        // # Open post options for updated recent mention and delete post
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, updatedMessage);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify updated recent mention is deleted
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T4909_4 - should be able to save/unsave a recent mention from recent mentions screen', async () => {
        // # Open a channel screen, post a message with at-mention to current user, go back to channel list screen, and open recent mentions screen
        const message = `@${testUser.username}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await RecentMentionsScreen.open();

        // * Verify on recent mentions screen
        await RecentMentionsScreen.toBeVisible();

        // # Open post options for recent mention, tap on save option, and open saved messages screen
        const {post: mentionPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await SavedMessagesScreen.open();

        // * Verify recent mention is displayed on saved messages screen
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(mentionPost.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to recent mentions screen, open post options for recent mention, tap on usave option, and open saved messages screen
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, message);
        await PostOptionsScreen.unsavePostOption.tap();
        await SavedMessagesScreen.open();

        // * Verify recent mention is not displayed anymore on saved messages screen
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T4909_5 - should be able to pin/unpin a recent mention from recent mentions screen', async () => {
        // # Open a channel screen, post a message with at-mention to current user, go back to channel list screen, and open recent mentions screen
        const message = `@${testUser.username}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        await ChannelScreen.back();
        await RecentMentionsScreen.open();

        // * Verify on recent mentions screen
        await RecentMentionsScreen.toBeVisible();

        // # Open post options for recent mention, tap on pin to channel option, go back to channel list screen, open the channel screen where recent mention is posted, open channel info screen, and open pinned messages screen
        const {post: mentionPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, message);
        await PostOptionsScreen.pinPostOption.tap();
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify recent mention is displayed on pinned messages screen
        const {postListPostItem} = PinnedMessagesScreen.getPostListPostItem(mentionPost.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to recent mentions screen, open post options for recent mention, tap on unpin from channel option, go back to channel list screen, open the channel screen where recent mention is posted, open channel info screen, and open pinned messages screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await RecentMentionsScreen.open();
        await RecentMentionsScreen.openPostOptionsFor(mentionPost.id, message);
        await PostOptionsScreen.unpinPostOption.tap();
        await ChannelListScreen.open();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify recent mention is not displayed anymore on pinned messages screen
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
