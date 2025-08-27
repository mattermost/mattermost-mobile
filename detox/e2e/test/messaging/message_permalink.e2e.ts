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

    it('the permalink preview should be updated if original message is edited', async () => {
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
        const messageElement = ChannelScreen.permalinkPreviewMessageText;
        const attributes = await messageElement.getAttributes();

        let fulltext = '';

        if (attributes && 'text' in attributes) {
            fulltext = (attributes as { text: string }).text;
        } else if (
            attributes &&
            'elements' in attributes &&
            Array.isArray(attributes.elements) &&
            attributes.elements.length > 0 &&
            attributes.elements[0] !== undefined &&
            'text' in attributes.elements[0]
        ) {
            fulltext = (attributes.elements[0] as { text: string }).text;
        }

        if (!fulltext.includes(updatedMessage)) {
            throw new Error(`Post text: "${fulltext}" does not match the expected text: "${updatedMessage}"`);
        }

        if (!fulltext.includes('Edited')) {
            throw new Error('Edited indicator is not found in the post text');
        }

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
