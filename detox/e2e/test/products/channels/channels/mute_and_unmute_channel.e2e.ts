// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelScreen,
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Mute and Unmute Channel', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
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

    it('MM-T4930_1 - should be able to mute/unmute a channel from channel quick actions', async () => {
        // # Open a channel screen, tap on channel quick actions button, and tap on mute quick action to mute the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelScreen.channelQuickActionsButton.tap();

        // Gate on the row itself rather than sleeping a fixed second: the quick actions bar
        // animates in, and a tap dispatched mid-animation is swallowed, which surfaces much
        // later as the toast below never appearing rather than as a failed tap.
        await waitFor(ChannelScreen.muteQuickAction).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.muteQuickAction.tap();

        // * Verify muted toast message appears. Use waitFor instead of immediate
        // expect — the toast renders via Animated.View which on iOS 26 triggers
        // the "Main Run Loop is awake" sync blocker, delaying element availability.
        await waitFor(ChannelScreen.toastMessage).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelScreen.toastMessage).toHaveText('This channel was muted');
        await waitFor(ChannelScreen.toastMessage).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap on channel quick actions button and tap on muted quick action to unmute the channel
        await ChannelScreen.channelQuickActionsButton.tap();
        await waitFor(ChannelScreen.unmuteQuickAction).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.unmuteQuickAction.tap();

        // * Verify unmuted toast message appears
        await waitFor(ChannelScreen.toastMessage).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelScreen.toastMessage).toHaveText('This channel was unmuted');
        await waitFor(ChannelScreen.toastMessage).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4930_2 - should be able to mute/unmute a channel from channel info screen', async () => {
        // # Open a channel screen, open channel info screen, and tap on mute action to mute the channel
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.muteAction.tap();

        // * Verify channel is muted.
        await waitFor(ChannelInfoScreen.unmuteAction).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await wait(timeouts.FOUR_SEC);

        // # Tap on muted action to unmute the channel
        await ChannelInfoScreen.unmuteAction.tap();

        // * Verify channel is unmuted (same swap in the other direction)
        await waitFor(ChannelInfoScreen.muteAction).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
