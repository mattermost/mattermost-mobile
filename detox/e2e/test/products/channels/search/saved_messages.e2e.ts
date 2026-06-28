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
    EditPostScreen,
    HomeScreen,
    LoginScreen,
    PostOptionsScreen,
    SavedMessagesScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait, waitForElementToBeVisible} from '@support/utils';
import {expect} from 'detox';

describe('Search - Saved Messages', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

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

    // edit_post.screen overlay does not dismiss after save from saved messages.
    it.skip('MM-T4910_3 - should be able to edit, reply to, and delete a saved message from saved messages screen', async () => {
        // # Open a channel screen, post a message, open post options for message, tap on save option, go back to channel list screen, and open saved messages screen
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        const {post: savedPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.openPostOptionsFor(savedPost.id, message);
        await PostOptionsScreen.savePostOption.tap();
        await wait(timeouts.TWO_SEC);
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
        await waitForElementToBeVisible(replyPostListPostItem, timeouts.FOUR_SEC);

        // # Go back to saved messages screen
        await ThreadScreen.back();

        // * Verify reply count and following button
        const {postListPostItem} = SavedMessagesScreen.getPostListPostItem(savedPost.id, updatedMessage);
        await waitForElementToBeVisible(element(by.text('1 reply')), timeouts.TWO_SEC);
        await waitForElementToBeVisible(element(by.text('Following')), timeouts.TWO_SEC);

        // # Open post options for updated saved message and delete post
        await element(by.id(`saved_messages.post_list.post.${savedPost.id}`)).longPress();
        await PostOptionsScreen.deletePost({confirm: true});

        // * Verify updated saved message is deleted
        await expect(postListPostItem).not.toExist();

        // # Go back to channel list screen
        await ChannelListScreen.open();
    });

});
