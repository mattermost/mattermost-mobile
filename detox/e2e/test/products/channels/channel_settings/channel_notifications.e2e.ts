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
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channel Settings - Channel Notifications', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let testChannel: any;

    beforeAll(async () => {
        const {user, channel} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testChannel = channel;

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3119 - should be able to set channel-specific mobile push notification preferences', async () => {
        // # Open a channel screen and open channel info screen
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // * Verify notification preference option is visible
        await expect(ChannelInfoScreen.notificationPreferenceOption).toBeVisible();

        // # Tap on notification preference option
        await ChannelInfoScreen.notificationPreferenceOption.tap();
        await wait(timeouts.TWO_SEC);

        // * Verify push notification settings screen is displayed
        const notificationSettingsScreen = element(by.id('push_notification_settings.screen'));
        await expect(notificationSettingsScreen).toBeVisible();

        // # Navigate back to channel info screen and close
        const backButton = element(by.id('screen.back.button'));
        await backButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelInfoScreen.close();

        // # Go back to channel list screen
        await ChannelScreen.back();
    });
});
