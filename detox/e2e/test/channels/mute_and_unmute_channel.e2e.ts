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
import {expect} from 'detox';

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
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.muteQuickAction.tap();

        // * Verify muted toast message appears
        await wait(timeouts.ONE_SEC);
        await expect(ChannelScreen.toastMessage).toHaveText('This channel was muted');
        await waitFor(ChannelScreen.toastMessage).not.toExist().withTimeout(timeouts.TEN_SEC);

        // # Tap on channel quick actions button and tap on muted quick action to unmute the channel
        await ChannelScreen.channelQuickActionsButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelScreen.unmuteQuickAction.tap();

        // * Verify unmuted toast message appears
        await wait(timeouts.ONE_SEC);
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

        // * Verify channel is muted
        await expect(ChannelInfoScreen.unmuteAction).toBeVisible();
        await wait(timeouts.FOUR_SEC);

        // # Tap on muted action to unmute the channel
        await ChannelInfoScreen.unmuteAction.longPress();

        // * Verify channel is unmuted
        await expect(ChannelInfoScreen.muteAction).toBeVisible();

        // # Go back to channel list screen
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
