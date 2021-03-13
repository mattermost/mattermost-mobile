// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {ChannelScreen} from '@support/ui/screen';
import {
    Channel,
    Post,
    Setup,
} from '@support/server_api';

describe('Message Posting', () => {
    const {
        getPostListPostItem,
        postMessage,
    } = ChannelScreen;
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

    it('MM-T3217 should be able to post a long message', async () => {
        // # Post a long message
        const message = 'The quick brown fox jumps over the lazy dog.'.repeat(30);
        await postMessage(message, {quickReplace: true});

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(testChannel.id);
        const {
            postListPostItem,
            postListPostItemShowMoreButton,
        } = await getPostListPostItem(post.id, message);
        await expect(postListPostItem).toExist();
        await expect(postListPostItemShowMoreButton).toExist();
    });

    it('MM-T3269 should be able to post a markdown image', async () => {
        // # Post a markdown image
        const message = '![alt text that displays if loading fails](https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png)';
        await postMessage(message, {quickReplace: true});

        // * Verify message is posted
        const {post} = await Post.apiGetLastPostInChannel(testChannel.id);
        const {postListPostItemImage} = await getPostListPostItem(post.id);
        await expect(postListPostItemImage).toBeVisible();
    });
});
