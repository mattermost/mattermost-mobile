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
    SavedMessagesScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Search - Saved Messages', () => {
    const serverOneDisplayName = 'Server 1';
    const savedText = 'Saved';
    let testChannel: any;
    let testTeam: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4910_1 - should match elements on saved messages screen', async () => {
        // # Open saved messages screen
        await SavedMessagesScreen.open();

        // * Verify basic elements on saved messages screen
        await expect(SavedMessagesScreen.largeHeaderTitle).toHaveText('Saved Messages');
        await expect(SavedMessagesScreen.largeHeaderSubtitle).toHaveText('All messages you\'ve saved for follow up');
        await expect(SavedMessagesScreen.emptyTitle).toHaveText('No saved messages yet');
        await expect(SavedMessagesScreen.emptyParagraph).toHaveText('To save something for later, long-press on a message and choose Save from the menu. Saved messages are only visible to you.');

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T4910_2 - should be able to display a saved message in saved messages screen and navigate to message channel', async () => {
        // # Open a channel screen, post a message, open post options for message, and tap on save option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(testChannel);
        await ChannelScreen.postMessage(message);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.savePostOption.tap();

        // * Verify saved text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Go back to channel list screen and open saved messages screen
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify on saved messages screen and saved message is displayed with channel info
        await SavedMessagesScreen.toBeVisible();
        const {postListPostItem: savedMessagesPostListPostItem, postListPostItemChannelInfoChannelDisplayName, postListPostItemChannelInfoTeamDisplayName} = SavedMessagesScreen.getPostListPostItem(post.id, message);
        await expect(savedMessagesPostListPostItem).toBeVisible();
        await expect(postListPostItemChannelInfoChannelDisplayName).toHaveText(testChannel.display_name);
        await expect(postListPostItemChannelInfoTeamDisplayName).toHaveText(testTeam.display_name);

        // # Tap on post and jump to recent messages
        await savedMessagesPostListPostItem.tap();
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen and saved message is displayed
        await ChannelScreen.toBeVisible();
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(channelPostListPostItem).toBeVisible();

        // # Go back to channel list screen
        await ChannelScreen.back();
        await ChannelListScreen.open();
    });

    it('MM-T4910_3 - should be able to edit, reply to, and delete a saved message from saved messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on save option, go back to channel list screen, and open saved messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(testChannel);
        await ChannelScreen.postMessage(message);

        const {post: savedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(savedPost.id, message);
        await waitFor(channelPostListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify on saved messages screen
        await SavedMessagesScreen.toBeVisible();

        // # Open post options for saved message and tap on edit option
        await SavedMessagesScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${message} edit`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.saveButton.tap();

        // * Verify post message is updated and displays edited indicator '(edited)'
        await ChannelScreen.assertPostMessageEdited(savedPost.id, updatedMessage, 'saved_messages_page');

        // # Open post options for updated saved message and tap on reply option
        await element(by.id(`saved_messages.post_list.post.${savedPost.id}`)).longPress();
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Post a reply
        const replyMessage = `${updatedMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await waitFor(replyPostListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // # Go back to saved messages screen
        await ThreadScreen.back();

        // * Verify reply count and following button
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(savedPost.id, updatedMessage);
        await waitFor(element(by.text('1 reply'))).toBeVisible().withTimeout(timeouts.TWO_SEC);
        await waitFor(element(by.text('Following'))).toBeVisible().withTimeout(timeouts.TWO_SEC);

        // # Open post options for updated saved message and delete post
        await element(by.id(`saved_messages.post_list.post.${savedPost.id}`)).longPress();
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify updated saved message is deleted
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T4910_4 - should be able to unsave a message from saved messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on save option, go back to channel list screen, and open saved messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(testChannel);
        await ChannelScreen.postMessage(message);

        const {post: savedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(savedPost.id, message);
        await waitFor(channelPostListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify on saved messages screen
        await SavedMessagesScreen.toBeVisible();

        // # Open post options for saved message and tap on unsave option
        await SavedMessagesScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.unsavePostOption.tap();

        // * Verify saved message is not displayed anymore
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(savedPost.id, message);
        await waitFor(postListPostItem).not.toExist().withTimeout(3000);
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

    it('MM-T4910_5 - should be able to pin/unpin a saved message from saved messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on save option, go back to channel list screen, and open saved messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(testChannel);
        await ChannelScreen.postMessage(message);

        const {post: savedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(savedPost.id, message);
        await waitFor(channelPostListPostItem).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await ChannelScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify on saved messages screen
        await SavedMessagesScreen.toBeVisible();

        // # Open post options for saved message, tap on pin to channel option, go back to channel list screen, open the channel screen where saved message is posted, open channel info screen, and open pinned messages screen
        await SavedMessagesScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.pinPostOption.tap();
        await ChannelListScreen.open();
        await ChannelScreen.open(testChannel);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify saved message is displayed on pinned messages screen
        const {postListPostItem} = PinnedMessagesScreen.getPostListPostItem(savedPost.id, message);
        await expect(postListPostItem).toBeVisible();

        // # Go back to saved messages screen, open post options for saved message, tap on unpin from channel option, go back to channel list screen, open the channel screen where saved message is posted, open channel info screen, and open pinned messages screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();
        await SavedMessagesScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.unpinPostOption.tap();
        await ChannelListScreen.open();
        await ChannelScreen.open(testChannel);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify saved message is not displayed anymore on pinned messages screen
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
