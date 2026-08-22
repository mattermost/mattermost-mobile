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
    System,
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
import {getRandomId, timeouts, waitForElementToBeVisible} from '@support/utils';
import {by, expect, waitFor} from 'detox';

describe('Search - Saved Messages', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const savedText = 'Saved';
    let testChannel: any;
    let testTeam: any;
    let testUser: any;
    let previousCollapsedThreads: string | undefined;
    let previousThreadAutoFollow: boolean | undefined;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;
        testUser = user;

        // Reply should leave the thread Following (same CRT setup as reply_to_thread.e2e.ts).
        // Capture the current values so afterAll can put them back: these are global
        // server settings, so leaving them flipped changes thread behaviour for every
        // suite that runs after this one on the same server.
        const {config: originalConfig} = await System.apiGetConfig(siteOneUrl);
        previousCollapsedThreads = originalConfig?.ServiceSettings?.CollapsedThreads;
        previousThreadAutoFollow = originalConfig?.ServiceSettings?.ThreadAutoFollow;

        await System.apiUpdateConfig(siteOneUrl, {
            ServiceSettings: {
                CollapsedThreads: 'always_on',
                ThreadAutoFollow: true,
            },
        });

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Restore the thread settings this suite changed
        if (previousCollapsedThreads !== undefined || previousThreadAutoFollow !== undefined) {
            await System.apiUpdateConfig(siteOneUrl, {
                ServiceSettings: {
                    CollapsedThreads: previousCollapsedThreads,
                    ThreadAutoFollow: previousThreadAutoFollow,
                },
            });
        }

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
        await SavedMessagesScreen.close();
    });

    it('MM-T4910_2 - should be able to display a saved message in saved messages screen and navigate to message channel', async () => {
        // # Open a channel screen, post a message, open post options for message, and tap on save option
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.savePostOption.tap();

        // Flagged-posts index lag varies, so poll the API instead of waiting a fixed interval
        // before asserting the saved state.
        await Post.waitForPostFlagged(siteOneUrl, testUser.id, post.id);

        // * Verify saved text is displayed on the post pre-header
        const {postListPostItemPreHeaderText} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItemPreHeaderText).toHaveText(savedText);

        // # Go back to channel list screen and open saved messages screen
        await ChannelScreen.back();
        await SavedMessagesScreen.open();

        // * Verify on saved messages screen and saved message is displayed with channel info.
        await SavedMessagesScreen.toBeVisible();
        const {postListPostItem: savedMessagesPostListPostItem, postListPostItemChannelInfoChannelDisplayName, postListPostItemChannelInfoTeamDisplayName} = SavedMessagesScreen.getPostListPostItem(post.id, message);
        await SavedMessagesScreen.waitForPostInList(post.id, message);
        await expect(postListPostItemChannelInfoChannelDisplayName).toHaveText(testChannel.display_name);
        await expect(postListPostItemChannelInfoTeamDisplayName).toHaveText(testTeam.display_name);

        // # Tap on post and jump to recent messages
        await savedMessagesPostListPostItem.tap();
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify on channel screen and saved message is displayed
        await ChannelScreen.toBeVisible();
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(channelPostListPostItem).toBeVisible();

        // # Unsave so later tests (empty state) are not polluted by this leftover
        await ChannelScreen.back();
        await SavedMessagesScreen.open();
        await SavedMessagesScreen.openPostOptionsFor(post.id, message);
        await PostOptionsScreen.unsavePostOption.tap();
        await SavedMessagesScreen.verifyPostUnsaved(post.id);
        await SavedMessagesScreen.close();
    });

    it('MM-T4910_3 - should be able to edit, reply to, and delete a saved message from saved messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on save option, go back to channel list screen, and open saved messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post: savedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();

        // Flagged-posts index lag varies; wait for the server to catch up.
        await Post.waitForPostFlagged(siteOneUrl, testUser.id, savedPost.id);
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
        await EditPostScreen.save();

        // * Verify post message is updated and displays edited indicator '(edited)'
        await ChannelScreen.assertPostMessageEdited(savedPost.id, updatedMessage, 'saved_messages_page');

        // # Open post options for updated saved message and tap on reply option
        // Post text now renders as "<message> edit (edited)", so the exact-text matcher
        // would not match; use the post-id-only matcher (same pattern as message_edit.e2e.ts).
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(savedPost.id);
        await postListPostItem.longPress(timeouts.TWO_SEC);
        await PostOptionsScreen.replyPostOption.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Post a reply
        const replyMessage = `${updatedMessage} reply`;
        await ThreadScreen.postMessage(replyMessage);

        // * Verify reply is posted
        const {post: replyPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(replyPost.id, replyMessage);
        await waitForElementToBeVisible(replyPostListPostItem, timeouts.FOUR_SEC);

        // # Go back to saved messages screen
        await ThreadScreen.back();

        // * Verify reply count and thread follow control on the saved message
        await waitForElementToBeVisible(element(by.text('1 reply')), timeouts.TWO_SEC);

        // Reply auto-follows (ThreadAutoFollow). Assert the Following control, not
        // by.text('Follow'), which misses the Following label during the local flash.
        await waitForElementToBeVisible(
            element(by.id('post_footer.following_thread.button')),
        );

        // # Open post options for updated saved message and delete post
        await postListPostItem.longPress(timeouts.TWO_SEC);
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify updated saved message is deleted
        await waitFor(postListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await SavedMessagesScreen.close();
    });

    it('MM-T4910_4 - should be able to unsave a message from saved messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on save option, go back to channel list screen, and open saved messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post: savedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(savedPost.id, message);
        await waitForElementToBeVisible(channelPostListPostItem);
        await ChannelScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await Post.waitForPostFlagged(siteOneUrl, testUser.id, savedPost.id);
        await ChannelScreen.back();
        await SavedMessagesScreen.open();
        await SavedMessagesScreen.waitForPostInList(savedPost.id, message);

        // * Verify on saved messages screen
        await SavedMessagesScreen.toBeVisible();

        // # Open post options for saved message and tap on unsave option
        await device.disableSynchronization();
        try {
            await SavedMessagesScreen.openPostOptionsFor(savedPost.id, message);
        } finally {
            await device.enableSynchronization();
        }
        await PostOptionsScreen.unsavePostOption.tap();

        // * Verify saved message is not displayed anymore
        await SavedMessagesScreen.verifyPostUnsaved(savedPost.id);

        // # Go back to channel list screen
        await SavedMessagesScreen.close();
    });

    it('MM-T4910_5 - should be able to pin/unpin a saved message from saved messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on save option, go back to channel list screen, and open saved messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post: savedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: channelPostListPostItem} = ChannelScreen.getPostListPostItem(savedPost.id, message);
        await waitForElementToBeVisible(channelPostListPostItem);
        await ChannelScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await Post.waitForPostFlagged(siteOneUrl, testUser.id, savedPost.id);
        await ChannelScreen.back();
        await SavedMessagesScreen.open();
        await SavedMessagesScreen.waitForPostInList(savedPost.id, message);

        // * Verify on saved messages screen
        await SavedMessagesScreen.toBeVisible();

        // # Open post options for saved message, tap on pin to channel option, go back to channel list screen, open the channel screen where saved message is posted, open channel info screen, and open pinned messages screen
        await SavedMessagesScreen.openPostOptionsFor(savedPost.id, message);

        await PostOptionsScreen.tapPinPost();
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
        await Post.waitForPostPinned(siteOneUrl, testChannel.id, savedPost.id);
        await SavedMessagesScreen.close();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify saved message is displayed on pinned messages screen
        const {postListPostItem} = PinnedMessagesScreen.getPostListPostItem(savedPost.id, message);
        await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to saved messages screen, open post options for saved message, tap on unpin from channel option, go back to channel list screen, open the channel screen where saved message is posted, open channel info screen, and open pinned messages screen
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();
        await SavedMessagesScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.tapUnpinPost();
        await waitFor(PostOptionsScreen.postOptionsScreen).not.toExist().withTimeout(timeouts.TEN_SEC);
        await Post.waitForPostUnpinned(siteOneUrl, testChannel.id, savedPost.id);
        await SavedMessagesScreen.close();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();

        // * Verify saved message is not displayed anymore on pinned messages screen
        await waitFor(postListPostItem).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Unsave so later tests (empty state) are not polluted by this leftover
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
        await SavedMessagesScreen.open();
        await SavedMessagesScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.unsavePostOption.tap();
        await SavedMessagesScreen.verifyPostUnsaved(savedPost.id);
        await SavedMessagesScreen.close();
    });

    // Run last so the first Saved tab mount happens after a save (production order).
    // Prior tests unsave or delete their posts, so this opens an empty list.
    it('MM-T4910_1 - should match elements on saved messages screen', async () => {
        // # Open saved messages screen
        await SavedMessagesScreen.open();

        // T4910_3 on 5865fcd SIGSEGV'd during reloadReactNative before delete.
        // Screenshot showed leftover "Message 1c9777" instead of empty state.
        const flagged = await Post.apiGetFlaggedPosts(siteOneUrl, testUser.id);
        if (flagged.error) {
            throw new Error(`MM-T4910_1: flagged posts lookup failed: ${JSON.stringify(flagged.error)}`);
        }
        const leftoverIds = flagged.order;
        /* eslint-disable no-await-in-loop -- unsaves must finish before the empty-state assert */
        for (const postId of leftoverIds) {
            await SavedMessagesScreen.openPostOptionsFor(postId, '');
            await PostOptionsScreen.unsavePostOption.tap();
            await SavedMessagesScreen.verifyPostUnsaved(postId);
        }
        /* eslint-enable no-await-in-loop */

        // * Verify basic elements on saved messages screen
        await expect(SavedMessagesScreen.largeHeaderTitle).toHaveText('Saved Messages');
        await expect(SavedMessagesScreen.largeHeaderSubtitle).toHaveText('All messages you\'ve saved for follow up');
        await expect(SavedMessagesScreen.emptyTitle).toHaveText('No saved messages yet');
        await expect(SavedMessagesScreen.emptyParagraph).toHaveText('To save something for later, long-press on a message and choose Save from the menu. Saved messages are only visible to you.');

        // # Go back to channel list screen
        await SavedMessagesScreen.close();
    });
});
