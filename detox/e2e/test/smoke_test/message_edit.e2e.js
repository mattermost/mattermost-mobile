// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    ChannelScreen,
    EditPostScreen,
} from '@support/ui/screen';
import {
    Channel,
    Post,
    Setup,
} from '@support/server_api';

describe('Message Edit', () => {
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

    it('MM-T3228 should be able to edit a message and save', async () => {
        const {
            getPostListPostItem,
            openPostOptionsFor,
            postMessage,
        } = ChannelScreen;
        const {
            messageInput,
            saveButton,
        } = EditPostScreen;

        // # Post a message
        const testMessage = Date.now().toString();
        await postMessage(testMessage);

        // # Open edit post screen
        const {post} = await Post.apiGetLastPostInChannel(testChannel.id);
        await openPostOptionsFor(post.id, testMessage);
        await EditPostScreen.open();

        // # Edit post and save
        const additionalText = ' additional text';
        await messageInput.typeText(additionalText);
        await saveButton.tap();

        // * Verify post is edited
        await ChannelScreen.toBeVisible();
        const {postListPostItem} = await getPostListPostItem(post.id, `${testMessage}${additionalText} (edited)`);
        await expect(postListPostItem).toBeVisible();
    });
});
