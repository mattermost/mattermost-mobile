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
    ChannelScreen,
    LoginScreen,
    ServerScreen,
    HomeScreen,
} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
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

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3198 - Channel notifications Mobile Push', async () => {
        await ChannelScreen.open(channelsCategory, testChannel.name);

        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        await expect(ChannelInfoScreen.notificationPreferenceOption).toBeVisible();
        await ChannelInfoScreen.notificationPreferenceOption.tap();
        await wait(timeouts.TWO_SEC);

        const notificationSettingsScreen = element(by.id('push_notification_settings.screen'));
        await expect(notificationSettingsScreen).toBeVisible();

        const backButton = element(by.id('screen.back.button'));
        await backButton.tap();
        await wait(timeouts.ONE_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
