// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {ChannelScreen, PermalinkScreen} from '@support/ui/screen';
import {User, Setup, Channel, Post} from '@support/server_api';

describe('Permalink', () => {
    let testUser;
    let testChannel;
    let townSquareChannel;

    beforeAll(async () => {
        const {user, team, channel} = await Setup.apiInit();
        testUser = user;
        testChannel = channel;
        ({channel: townSquareChannel} = await Channel.apiGetChannelByName(team.name, 'town-square'));

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    const expectPermalinkTargetMessage = async (permalinkTargetPost) => {
        // # Post a message in the test channel referencing the given permalink.
        const permalinkMessage = `[permalink](/_redirect/pl/${permalinkTargetPost.id})`;
        await Post.apiCreatePost({
            channelId: testChannel.id,
            message: permalinkMessage,
        });

        // # Go to test channel
        await ChannelScreen.openMainSidebar();
        await MainSidebar.getChannelByDisplayName(testChannel.display_name).tap();
        await ChannelScreen.toBeVisible();

        // # Tap the channel permalink
        element(by.text('permalink')).tap({x: 5, y: 10});

        // * Verify permalink post list has the expected target message
        await PermalinkScreen.toBeVisible();
        const {postListPostItem: permalinkPostItem} = await PermalinkScreen.getPostListPostItem(permalinkTargetPost.id, permalinkTargetPost.message);
        await waitFor(permalinkPostItem).toBeVisible();

        // * Dismiss the permalink screen by jumping to recent messages
        await PermalinkScreen.jumpToRecentMessages();
    };

    it('[tm4j_id]_[step] should support _redirect to public channel post', async () => {
        // # Post a test message in a public channel
        const permalinkTargetMessage = 'post in Town Square';
        const permalinkTargetPost = await Post.apiCreatePost({
            channelId: townSquareChannel.id,
            message: permalinkTargetMessage,
        });

        expectPermalinkTargetMessage(permalinkTargetPost.post);
    });

    it('[tm4j_id]_[step] should support _redirect to DM post', async () => {
        // # Post a test message in a DM
        const {user: dmOtherUser} = await User.apiCreateUser({prefix: 'testchannel-1'});
        const {channel: directMessageChannel} = await Channel.apiCreateDirectChannel([testUser.id, dmOtherUser.id]);
        const permalinkTargetMessage = 'post in DM';
        const permalinkTargetPost = await Post.apiCreatePost({
            channelId: directMessageChannel.id,
            message: permalinkTargetMessage,
        });

        expectPermalinkTargetMessage(permalinkTargetPost.post);
    });
});
