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
    CreateOrEditChannelScreen,
    LoginScreen,
    HomeScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;

    beforeAll(async () => {
        const {user} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3201 - RN apps Create public channel', async () => {
        const publicChannelName = `channel-${getRandomId()}`;
        const publicChannelDisplayName = publicChannelName.replace(/-/g, ' ');
        const channelPurpose = 'This is a test purpose for the channel';
        const channelHeader = ':taco:';

        await CreateOrEditChannelScreen.openCreateChannel();
        await expect(CreateOrEditChannelScreen.displayNameInput).toBeVisible();
        await expect(CreateOrEditChannelScreen.createButton).toBeVisible();

        await CreateOrEditChannelScreen.displayNameInput.replaceText(publicChannelDisplayName);

        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.replaceText(channelPurpose);

        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.replaceText(channelHeader);

        await CreateOrEditChannelScreen.createButton.tap();
        await ChannelScreen.dismissScheduledPostTooltip();

        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(publicChannelDisplayName);

        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(publicChannelDisplayName);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(channelPurpose);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
