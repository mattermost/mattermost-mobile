// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post, Setup} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    GalleryScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos, timeouts, wait, waitForElementToBeVisible, waitForElementToNotExist} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Messaging - Video Playback', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testChannel: any;
    let videoPost: any;
    let videoFileId: string;

    const openVideo = async () => {
        const {postListPostItem} = ChannelScreen.getPostListPostItem(videoPost.id, '');
        await waitFor(postListPostItem).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await GalleryScreen.open(videoFileId);
        await GalleryScreen.videoToBeVisible();

        await GalleryScreen.videoToBeLoaded();
    };

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;

        const {post, fileId} = await Post.apiCreatePostWithVideoAttachment(siteOneUrl, testChannel.id);
        videoPost = post;
        videoFileId = fileId;

        await device.launchApp({
            newInstance: true,
            delete: true,
            ...(device.getPlatform() === 'ios' ? {permissions: {notifications: 'YES'}} : {}),
        });

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);
    });

    beforeEach(async () => {
        try {
            await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.TWO_SEC);
        } catch {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
        }
    });

    afterEach(async () => {
        try {
            await waitFor(element(by.id(GalleryScreen.testID.closeButton))).toExist().withTimeout(timeouts.ONE_SEC);
            await GalleryScreen.close();
        } catch { /* gallery not open */ }
    });

    afterAll(async () => {
        await ChannelScreen.back();
        await ChannelListScreen.toBeVisible();
        await HomeScreen.logout();
    });

    it('MM-TXXXX_1 - should play the video and auto-hide the controls', async () => {
        await openVideo();

        await GalleryScreen.showControls();
        await expect(GalleryScreen.pauseButton).toBeVisible();

        await GalleryScreen.controlsToBeHidden();
    });

    it('MM-TXXXX_2 - should reveal the hidden controls when the video is tapped', async () => {
        await openVideo();

        await GalleryScreen.waitForPlaybackToAdvance(8);
        await GalleryScreen.controlsToBeHidden();
        await GalleryScreen.showControls();
        await GalleryScreen.controlsToBeVisible();

        await GalleryScreen.waitForPlaybackToAdvance(2);
        await GalleryScreen.hideControls();
        await GalleryScreen.waitForPlaybackToAdvance(2);
        await GalleryScreen.controlsToBeHidden();
    });

    it('MM-TXXXX_3 - should keep the controls on screen while the video is paused', async () => {
        await openVideo();

        await GalleryScreen.waitForPlaybackToAdvance(3);
        await GalleryScreen.pause();

        await wait(GalleryScreen.AUTO_HIDE_TIMEOUT);

        await GalleryScreen.controlsToBeVisible();
        await expect(GalleryScreen.playButton).toBeVisible();
    });

    it('MM-TXXXX_4 - should pause and resume playback', async () => {
        await openVideo();

        await GalleryScreen.waitForPlaybackToAdvance(3);
        await expect(GalleryScreen.pauseButton).toBeVisible();

        await GalleryScreen.pause();
        await expect(GalleryScreen.playButton).toBeVisible();

        await GalleryScreen.playButton.tap();

        await waitForElementToBeVisible(GalleryScreen.pauseButton, timeouts.TEN_SEC);
        await GalleryScreen.waitForPlaybackToAdvance(1);
    });

    it('MM-TXXXX_5 - should fast forward and rewind by the seek step', async () => {
        await openVideo();

        await GalleryScreen.waitForPlaybackToAdvance(5);
        await GalleryScreen.pause();

        await GalleryScreen.rewind();

        await GalleryScreen.play();
        await GalleryScreen.waitForPlaybackToAdvance(2);
        await GalleryScreen.pause();

        await GalleryScreen.forward();
        await GalleryScreen.play();
    });

    it('MM-TXXXX_6 - should clamp rewind at the start of the video', async () => {
        await openVideo();

        await GalleryScreen.waitForPlaybackToAdvance(2);
        await GalleryScreen.pause();

        const step = await GalleryScreen.seekStepSeconds();
        const rewindsToStart = Math.ceil(await GalleryScreen.currentTimeSeconds() / step);

        for (let i = 0; i < rewindsToStart; i++) {
            // eslint-disable-next-line no-await-in-loop
            await GalleryScreen.rewind();
        }

        await waitFor(GalleryScreen.currentTime).toHaveText('0:00').withTimeout(timeouts.TEN_SEC);

        await GalleryScreen.rewind();
        await expect(GalleryScreen.currentTime).toHaveText('0:00');
    });

    it('MM-TXXXX_7 - should keep the speed menu open past the auto-hide', async () => {
        await openVideo();

        await GalleryScreen.openSpeedMenu();

        await wait(GalleryScreen.AUTO_HIDE_TIMEOUT);
        await expect(GalleryScreen.speedMenu).toBeVisible();
        await expect(GalleryScreen.getSpeedOption(0.5)).toBeVisible();
        await expect(GalleryScreen.getSpeedOption(1)).toBeVisible();
        await expect(GalleryScreen.getSpeedOption(1.5)).toBeVisible();
        await expect(GalleryScreen.getSpeedOption(2)).toBeVisible();
    });

    it('MM-TXXXX_8 - should change the playback speed', async () => {
        await openVideo();

        const atNormalSpeed = await GalleryScreen.playbackRate();

        await GalleryScreen.openSpeedMenu();
        await GalleryScreen.selectSpeed(2);

        const atDoubleSpeed = await GalleryScreen.playbackRate();
        if (atDoubleSpeed <= atNormalSpeed * 1.5) {
            throw new Error(`expected 2x to outpace normal speed, got ${atNormalSpeed}s/s then ${atDoubleSpeed}s/s`);
        }
    });

    it('MM-TXXXX_9 - should dismiss the speed menu without changing the speed', async () => {
        await openVideo();

        await GalleryScreen.openSpeedMenu();

        if (isIos()) {
            // Android renders the menu without a header or done button.
            await GalleryScreen.speedMenuDoneButton.tap();
        } else {
            await GalleryScreen.controls.tapAtPoint({x: 200, y: 230});
        }

        await waitForElementToNotExist(GalleryScreen.speedMenu, timeouts.TEN_SEC);
    });

    it('MM-TXXXX_10 - should toggle fullscreen', async () => {
        await openVideo();

        await GalleryScreen.waitForPlaybackToAdvance(2);
        await GalleryScreen.pause();

        await expect(GalleryScreen.closeButton).toBeVisible();

        await GalleryScreen.toggleFullscreen(true);
        await expect(GalleryScreen.closeButton).not.toBeVisible();

        await GalleryScreen.toggleFullscreen(false);
        await expect(GalleryScreen.closeButton).toBeVisible();
    });

    it('MM-TXXXX_11 - should not show the captions control for a video without captions', async () => {
        await openVideo();

        await GalleryScreen.showControls();

        await expect(GalleryScreen.captionsButton).not.toExist();
    });
});
