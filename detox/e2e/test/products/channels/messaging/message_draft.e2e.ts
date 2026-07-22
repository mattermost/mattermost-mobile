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
import Alert from '@support/ui/component/alert';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, isIos, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Messaging - Message Draft', () => {
    const serverOneDisplayName = 'Server 1';
    const offTopicChannelName = 'off-topic';
    const channelsCategory = 'channels';
    let testChannel: any;
    let maxPostSize = 4000;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        const {config} = await System.apiGetConfig(siteOneUrl);
        maxPostSize = Number(config?.ServiceSettings?.MaxPostSize) || 16383;

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

        // # Go back to channel list, then fully close and re-open the app.
        // Note: device.sendToHome() + launchApp({newInstance:false}) is unreliable on iOS 26 —
        // Detox's waitForBackground handshake does not complete, so the test hangs for 240s.
        // launchApp({newInstance:true}) starts a fresh process; the user session and the
        // saved draft both persist in the local DB, which is what this test verifies.
        await ChannelScreen.back();
        await device.launchApp({newInstance: true});
        await wait(timeouts.ONE_SEC);

        // # Re-open the channel after relaunch
        await ChannelListScreen.toBeVisible();
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

    // Skip: failed CI run 29954156963 (ios) — character limit alert flake
    (isIos() ? it.skip : it)('MM-T107 - should show alert when message exceeds character limit', async () => {
        // Use server MaxPostSize (+1). Hardcoded 4001 never alerts when CI MaxPostSize is
        // the Mattermost default (16383). replaceText alone may not fire onChangeText on
        // all platforms — type one extra char after filling to max to trigger the alert.
        const atLimitMessage = 'a'.repeat(maxPostSize);

        // # Open a channel and type a message over the character limit
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(atLimitMessage);
        await ChannelScreen.postInput.typeText('a');

        // * Verify message length alert is shown
        await expect(Alert.messageLengthTitle).toBeVisible();
        await Alert.okButton.tap();

        // # Clear post draft and go back to channel list screen
        await ChannelScreen.postInput.clearText();
        await ChannelScreen.back();
    });

});
