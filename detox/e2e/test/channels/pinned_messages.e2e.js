// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {PostOptions} from '@support/ui/component';
import {
    ChannelInfoScreen,
    ChannelScreen,
    EditPostScreen,
    PermalinkScreen,
    PinnedMessagesScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {
    Channel,
    Post,
    Setup,
} from '@support/server_api';

describe('Pinned Messages', () => {
    const {
        getPostListPostItem,
        openPostOptionsFor,
        openReplyThreadFor,
        postMessage,
    } = ChannelScreen;
    const {pinAction} = PostOptions;
    let townSquareChannel;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit();

        const {channel} = await Channel.apiGetChannelByName(team.id, 'town-square');
        townSquareChannel = channel;

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T851_1 should be able pin a message from channel post list', async () => {
        // # Post a message
        const testMessage = Date.now().toString();
        await postMessage(testMessage);

        // # Pin message from channel post list
        const {post} = await Post.apiGetLastPostInChannel(townSquareChannel.id);
        await openPostOptionsFor(post.id, testMessage);
        await pinAction.tap();

        // * Verify message appears in pinned messages
        const {postListPostItemPreHeaderText} = await getPostListPostItem(post.id, testMessage);
        await expect(postListPostItemPreHeaderText).toHaveText('Pinned');
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();
        const {searchResultPostItem} = await PinnedMessagesScreen.getSearchResultPostItem(post.id, testMessage);
        await expect(searchResultPostItem).toBeVisible();

        // # Go back to channel
        await PinnedMessagesScreen.back();
        await ChannelInfoScreen.close();
    });

    it('MM-T851_2 should be able to jump to recent messages from pinned post', async () => {
        // # Post a message
        const testMessage = Date.now().toString();
        await postMessage(testMessage);

        // # Pin message from channel post list
        const {post} = await Post.apiGetLastPostInChannel(townSquareChannel.id);
        await openPostOptionsFor(post.id, testMessage);
        await pinAction.tap();

        // # Jump to recent messages from pinned post
        await ChannelInfoScreen.open();
        await PinnedMessagesScreen.open();
        const {searchResultPostItem} = await PinnedMessagesScreen.getSearchResultPostItem(post.id, testMessage);
        await searchResultPostItem.tap();
        await PermalinkScreen.jumpToRecentMessages();

        // * Verify user is on channel where message is posted
        await expect(ChannelScreen.channelNavBarTitle).toHaveText(townSquareChannel.display_name);
        const {postListPostItem: channelPostItem} = await ChannelScreen.getPostListPostItem(post.id, testMessage);
        await expect(channelPostItem).toBeVisible();
    });

    it('MM-T851_3 should be able to open reply thread for pinned message', async () => {
        // # Post a message
        const testMessage = Date.now().toString();
        await postMessage(testMessage);

        // # Pin message from channel post list
        const {post} = await Post.apiGetLastPostInChannel(townSquareChannel.id);
        await openPostOptionsFor(post.id, testMessage);
        await pinAction.tap();

        // # Open reply thread for pinned message
        await openReplyThreadFor(post.id, testMessage);

        // * Verify reply thread for pinned message is displayed
        const {postListPostItem} = await ThreadScreen.getPostListPostItem(post.id, testMessage);
        await expect(postListPostItem).toBeVisible();

        // # Go back to channel
        await ThreadScreen.back();
    });

    it('MM-T851_4 should be able to edit pinned message', async () => {
        const {
            messageInput,
            saveButton,
        } = EditPostScreen;

        // # Post a message
        const testMessage = Date.now().toString();
        await postMessage(testMessage);

        // # Pin message from channel post list
        const {post} = await Post.apiGetLastPostInChannel(townSquareChannel.id);
        await openPostOptionsFor(post.id, testMessage);
        await pinAction.tap();

        // # Edit pinned message
        const additionalText = ' additional text';
        await openPostOptionsFor(post.id, testMessage);
        await EditPostScreen.open();
        await messageInput.tap();
        await messageInput.typeText(additionalText);
        await saveButton.tap();

        // * Verify pinned message is edited
        await ChannelScreen.toBeVisible();
        const {postListPostItem} = await getPostListPostItem(post.id, `${testMessage}${additionalText} (edited)`);
        await expect(postListPostItem).toBeVisible();
    });
});
