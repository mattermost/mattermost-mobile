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
    PostOptionsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    EditPostScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Permalink', () => {
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

    it('MM-T5848 should update the permalink preview if original message is edited', async () => {
        // # Post a target message in a target public channel
        const initialMessage = 'This is the original message';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(initialMessage);

        // * Verify message is added to post list
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: originalPostListPostItem} = ChannelScreen.getPostListPostItem(post.id, initialMessage);
        await expect(originalPostListPostItem).toBeVisible();

        const postLink = `This is the permalink message of previous post ${siteOneUrl}/${testTeam.id}/pl/${post.id}`;
        await ChannelScreen.postMessage(postLink);

        // * Verify permalink preview is shown with correct information
        await ChannelScreen.verifyPermalinkPreview();

        await expect(ChannelScreen.permalinkPreviewAuthorName).toHaveText(testUser.username);
        await expect(ChannelScreen.permalinkPreviewMessageText).toHaveText(initialMessage);
        await expect(ChannelScreen.permalinkPreviewEditedIndicatorText).not.toExist();
        await expect(ChannelScreen.permalinkPreviewChannelName).toHaveText(`Originally posted in ~${testChannel.display_name}`);

        // # Open post options for the message that was just posted and tap edit option
        await ChannelScreen.openPostOptionsFor(post.id, initialMessage);
        await PostOptionsScreen.editPostOption.tap();

        // * Verify on edit post screen
        await EditPostScreen.toBeVisible();

        // # Edit post message and tap save button
        const updatedMessage = `${initialMessage} updated`;
        await EditPostScreen.messageInput.replaceText(updatedMessage);
        await EditPostScreen.saveButton.tap();
        await waitFor(ChannelScreen.permalinkPreviewContainer).toBeVisible().withTimeout(timeouts.FOUR_SEC);

        // * Verify permalink preview is updated

        await ChannelScreen.verifyPermalinkPreviewTextIsUpdated(updatedMessage);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T5852 should show preview with Urgent Priority Tag', async () => {  });
    it('MM-T5853 should show preview with Important Priority Tag', async () => {  });
    it('MM-T5854 should not show the preview of the a message from DM chat that user have no access to', async () => {  });
    it('MM-T5855 should not show the preview of the a message from Private Channel where user is not a member', async () => {  });
    it('MM-T5857 should not show the preview of the a message if the original post is deleted', async () => {  });
    it('MM-T5863 should show the preview of the a message from a Public channel where user is not a member', async () => {  });
    it('MM-T5864 should show the preview of the a message from Private Channel where user is a member', async () => {  });

});
