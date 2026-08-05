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

    it('MM-T3203 - RN apps Create private channel', async () => {
        const privateChannelName = `private-channel-${getRandomId()}`;
        const privateChannelDisplayName = privateChannelName.replace(/-/g, ' ');
        const channelPurpose = 'This is a private test channel purpose';
        const channelHeader = 'Private channel header';

        await CreateOrEditChannelScreen.openCreateChannel();
        await expect(CreateOrEditChannelScreen.displayNameInput).toBeVisible();

        await CreateOrEditChannelScreen.toggleMakePrivateOn();
        await expect(CreateOrEditChannelScreen.makePrivateToggledOn).toBeVisible();

        await CreateOrEditChannelScreen.displayNameInput.replaceText(privateChannelDisplayName);

        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.replaceText(channelPurpose);

        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.replaceText(channelHeader);

        await CreateOrEditChannelScreen.createButton.tap();

        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(privateChannelDisplayName);

        await ChannelInfoScreen.open();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(privateChannelDisplayName);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(channelPurpose);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
