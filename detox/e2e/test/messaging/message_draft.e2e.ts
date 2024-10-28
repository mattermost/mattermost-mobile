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
import {Alert} from '@support/ui/component';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ThreadScreen,
} from '@support/ui/screen';
import {getRandomId, isIos} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Message Draft', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const offTopicChannelName = 'off-topic';
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

    it('MM-T4781_1 - should be able to create a message draft', async () => {
        // # Open a channel screen and create a message draft
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(message);

        // * Verify message exists in post draft and is not yet added to post list
        if (isIos()) {
            await expect(ChannelScreen.postInput).toHaveValue(message);
        } else {
            await expect(ChannelScreen.postInput).toHaveText(message);
        }
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).not.toExist();

        // # Switch to another channel and go back to original channel
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, offTopicChannelName);
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify message draft still exists in post draft
        if (isIos()) {
            await expect(ChannelScreen.postInput).toHaveValue(message);
        } else {
            await expect(ChannelScreen.postInput).toHaveText(message);
        }

        // # Clear post draft and go back to channel list screen
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.back();
    });

    it('MM-T4781_2 - should save message draft when app is closed then re-opened', async () => {
        // # Open a channel screen and create a message draft
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.postInput.replaceText(message);

        // * Verify message draft exists in post draft
        if (isIos()) {
            await expect(ChannelScreen.postInput).toHaveValue(message);
        } else {
            await expect(ChannelScreen.postInput).toHaveText(message);
        }

        // # Send app to home and re-open
        await device.sendToHome();
        await device.launchApp({newInstance: false});

        // * Verify message draft still exists in post draft
        if (isIos()) {
            await expect(ChannelScreen.postInput).toHaveValue(message);
        } else {
            await expect(ChannelScreen.postInput).toHaveText(message);
        }

        // # Clear post draft and go back to channel list screen
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.back();
    });

    it('MM-T4781_3 - should show character count warning when message exceeds character limit', async () => {
        // # Open a channel screen and create a message draft that exceeds character limit (> 16383)
        let message = '1234567890'.repeat(1638) + '1234';
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.postInput.replaceText(message);

        // * Verify warning message is displayed and send button is disabled
        await expect(Alert.messageLengthTitle).toBeVisible();
        await expect(element(by.text('Your current message is too long. Current character count: 16384/16383'))).toBeVisible();
        await Alert.okButton.tap();
        await expect(ChannelScreen.sendButtonDisabled).toBeVisible();

        // # Replace message draft with length less than the character limit (16383)
        message = '1234567890'.repeat(1638) + '123';
        await ChannelScreen.postInput.replaceText(message);

        // * Verify warning message is not displayed and send button is enabled
        await expect(Alert.messageLengthTitle).not.toBeVisible();
        await expect(element(by.text('Your current message is too long. Current character count: 16383/16383'))).not.toBeVisible();
        await expect(ChannelScreen.sendButton).toBeVisible();

        // # Clear post draft and go back to channel list screen
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.back();
    });

    it('MM-T4781_4 - should be able to create a message draft from reply thread', async () => {
        // # Open a channel screen, post a message, and tap on the post to open reply thread
        const message = `Message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);
        const {post: parentPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: parentPostListPostItem} = ChannelScreen.getPostListPostItem(parentPost.id, message);
        await parentPostListPostItem.tap();

        // * Verify on thread screen
        await ThreadScreen.toBeVisible();

        // # Create a reply message draft
        const replyMessage = `${message} reply`;
        await ThreadScreen.postInput.tap();
        await ThreadScreen.postInput.replaceText(replyMessage);

        // * Verify reply message exists in post draft and is not yet added to post list
        if (isIos()) {
            await expect(ThreadScreen.postInput).toHaveValue(replyMessage);
        } else {
            await expect(ThreadScreen.postInput).toHaveText(replyMessage);
        }
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem: replyPostListPostItem} = ThreadScreen.getPostListPostItem(post.id, replyMessage);
        await expect(replyPostListPostItem).not.toExist();

        // # Go back to channel screen and tap on parent post again
        await ThreadScreen.back();
        await parentPostListPostItem.tap();

        // * Verify reply message draft still exists in post draft
        if (isIos()) {
            await expect(ThreadScreen.postInput).toHaveValue(replyMessage);
        } else {
            await expect(ThreadScreen.postInput).toHaveText(replyMessage);
        }

        // # Clear reply post draft and go back to channel list screen
        await ThreadScreen.postInput.clearText();
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
