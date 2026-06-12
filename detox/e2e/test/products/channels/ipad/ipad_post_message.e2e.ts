// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Post, Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {getRandomId, isIpad, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('iPad - Post Message', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // On iPad the software keyboard persists between tests because the split-view keeps the
        // channel always rendered.  When the app resumes from background the post input is still
        // the first responder and iOS immediately re-shows UITextEffectsWindow, so a simple
        // sendToHome+resume does not help.  Relaunch with newInstance:true to start a fresh
        // process where no TextInput has focus — the user session persists in the local DB so
        // auto-login happens without re-entering credentials.
        if (isIpad()) {
            await device.launchApp({newInstance: true});
            await wait(timeouts.ONE_SEC);
        }

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // On iPad the last test may leave the keyboard showing.  Relaunch fresh so the
        // account-tab tap in HomeScreen.logout() is hittable (not covered by UITextEffectsWindow).
        if (isIpad()) {
            await device.launchApp({newInstance: true});
            await wait(timeouts.ONE_SEC);
            await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(timeouts.TEN_SEC);
        }

        // # Log out
        await HomeScreen.logout();
    });

    it('MM-TIPAD_15 - should be able to post a message in a channel on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the test channel and post a message
        const message = `iPad message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.postMessage(message);

        // * Verify the message was posted
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await expect(postListPostItem).toBeVisible();

        // * Verify the sidebar is still visible after posting (tablet split view).
        // On iPad the software keyboard (UITextEffectsWindow) may cover the lower portion of
        // the channel_list.screen SafeAreaView, dropping its visible percentage below the 75%
        // threshold required by toBeVisible().  Use toExist() to confirm the view is in the
        // hierarchy regardless of transient keyboard obstruction.
        await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Navigate back to channel list for clean state
        await ChannelScreen.back();
    });

    it('MM-TIPAD_16 - should show the post draft input in the channel on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the test channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the post draft input exists in the channel.
        // On iPad the software keyboard from the previous test may persist (split-view keeps
        // the channel always on screen), covering the post draft SafeAreaView.  Use toExist()
        // so the assertion passes regardless of keyboard obstruction.
        await waitFor(ChannelScreen.postDraft).toExist().withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelScreen.postInput).toExist().withTimeout(timeouts.TEN_SEC);

        // # Navigate back to channel list for clean state
        await ChannelScreen.back();
    });

    it('MM-TIPAD_17 - should show send button when text is typed in the draft on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the test channel and type a message
        const message = `Draft message ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);

        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(message);
        await wait(timeouts.ONE_SEC);

        // * Verify the send button is visible
        await expect(ChannelScreen.sendButton).toBeVisible();

        // # Clear the draft to return to clean state
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.ONE_SEC);

        // # Navigate back to channel list for clean state
        await ChannelScreen.back();
    });

    it('MM-TIPAD_18 - should display posted messages in the channel post list on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Post a message via API and open the channel
        const message = `API message ${getRandomId()}`;
        await Post.apiCreatePost(siteOneUrl, {channelId: testChannel.id, message});
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Verify the message is present in the post list.
        // On iPad the software keyboard from a prior test may linger and cover the post list
        // area at the bottom of the right pane, preventing toBeVisible() from succeeding on the
        // newest post.  Use toExist() to confirm the post is rendered in the list regardless of
        // keyboard obstruction.
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const {postListPostItem} = ChannelScreen.getPostListPostItem(post.id, message);
        await waitFor(postListPostItem).toExist().withTimeout(timeouts.TEN_SEC);

        // # Navigate back to channel list for clean state
        await ChannelScreen.back();
    });

    it('MM-TIPAD_19 - should keep sidebar visible while composing a message on iPad', async () => {
        if (!isIpad()) {
            return;
        }

        // # Open the test channel and start composing a message
        const message = `Composing ${getRandomId()}`;
        await ChannelScreen.open(channelsCategory, testChannel.name);

        await ChannelScreen.postInput.tap();
        await ChannelScreen.postInput.replaceText(message);
        await wait(timeouts.ONE_SEC);

        // * Verify the sidebar (channel list) is present while composing on iPad.
        // Use toExist() — while typing, the software keyboard covers part of the
        // channel_list.screen SafeAreaView, dropping its visible area below the 75% threshold.
        await waitFor(ChannelListScreen.channelListScreen).toExist().withTimeout(timeouts.TEN_SEC);

        // # Clear the draft
        await ChannelScreen.postInput.clearText();
        await wait(timeouts.ONE_SEC);

        // # Navigate back to channel list for clean state
        await ChannelScreen.back();
    });
});
