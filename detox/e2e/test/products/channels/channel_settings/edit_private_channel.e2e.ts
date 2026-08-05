// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Channel, Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelInfoScreen,
    ChannelListScreen,
    ChannelScreen,
    ChannelSettingsScreen,
    CreateOrEditChannelScreen,
    LoginScreen,
    HomeScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;
    let privateChannelName: string;
    let privateChannelDisplayName: string;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        privateChannelName = `channel-${getRandomId()}`;
        privateChannelDisplayName = privateChannelName.replace(/-/g, ' ');
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: privateChannelName,
            displayName: privateChannelDisplayName,
            type: 'P',
        });
        if (!channel?.id) {
            throw new Error('[beforeAll] Failed to create private channel for edit test');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        // Private channels are not always in the public sidebar matcher; still wait for WS sync.
        await wait(timeouts.FIVE_SEC);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3206 - RN apps Edit private channel', async () => {
        // Find Channels is reliable for API-created private channels (sidebar public matcher is not).
        await ChannelScreen.openViaFindChannels(privateChannelName);
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannel();
        await expect(CreateOrEditChannelScreen.saveButton).toBeVisible();

        const updatedDisplayName = privateChannelDisplayName + ' edited';
        await CreateOrEditChannelScreen.displayNameInput.clearText();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(updatedDisplayName);

        const purposeText = 'Updated purpose for private channel';
        await CreateOrEditChannelScreen.purposeInput.tap();
        await CreateOrEditChannelScreen.purposeInput.clearText();
        await CreateOrEditChannelScreen.purposeInput.replaceText(purposeText);

        const headerLine1 = 'First line of header';
        await CreateOrEditChannelScreen.headerInput.tap();
        await CreateOrEditChannelScreen.headerInput.clearText();
        await CreateOrEditChannelScreen.headerInput.replaceText(headerLine1 + '\n');

        const headerLine2 = 'Second line of header';
        await CreateOrEditChannelScreen.headerInput.replaceText(headerLine2);

        await CreateOrEditChannelScreen.saveButton.tap();

        await waitFor(CreateOrEditChannelScreen.createOrEditChannelScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.close();

        await ChannelInfoScreen.toBeVisible();
        await expect(ChannelInfoScreen.publicPrivateTitleDisplayName).toHaveText(updatedDisplayName);
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(purposeText);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
