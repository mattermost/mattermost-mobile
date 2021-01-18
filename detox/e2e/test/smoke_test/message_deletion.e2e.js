// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    ChannelScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {
    Channel,
    Post,
    Setup,
} from '@support/server_api';

describe('Message Deletion', () => {
    let testChannel;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit();

        const {channel} = await Channel.apiGetChannelByName(team.name, 'town-square');
        testChannel = channel;

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3232 should remove message from channel when deleted', async () => {
        const {
            channelScreen,
            deletePost,
            postMessage,
        } = ChannelScreen;

        // # Post a message
        const message = Date.now().toString();
        await postMessage(message);

        // # Delete post
        const {post} = await Post.apiGetLastPostInChannel(testChannel.id);
        await deletePost(post.id, message);

        // * Verify post is deleted
        await expect(channelScreen).toBeVisible();
        await expect(element(by.text(message))).not.toBeVisible();
    });

    it('MM-T3234 should be able to delete parent post from reply thread view', async () => {
        const {
            channelScreen,
            openReplyThreadFor,
            postMessage,
        } = ChannelScreen;
        const {
            deletePost,
        } = ThreadScreen;

        // # Post a message
        const message = Date.now().toString();
        await postMessage(message);

        // # Open reply thread for post
        const {post} = await Post.apiGetLastPostInChannel(testChannel.id);
        await openReplyThreadFor(post.id, message);

        // # Delete parent post from reply thread
        await deletePost(post.id, message);

        // * Verify post is deleted
        await expect(channelScreen).toBeVisible();
        await expect(element(by.text(message))).not.toBeVisible();
    });
});
