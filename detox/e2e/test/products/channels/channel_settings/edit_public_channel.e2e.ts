// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3201: RN apps Create public channel
 * - MM-T3203: RN apps Create private channel
 * - MM-T3199: RN apps Edit public channel
 * - MM-T3206: RN apps Edit private channel
 * - MM-T854: RN apps Channel can be created using 2 non-latin characters
 * - MM-T867: RN apps Copying channel header text
 * - MM-T865: RN apps Copying channel purpose text
 */

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
    const channelsCategory = 'channels';
    let testUser: any;
    let testTeam: any;
    let publicChannelName: string;
    let publicChannelDisplayName: string;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        publicChannelName = `channel-${getRandomId()}`;
        publicChannelDisplayName = publicChannelName.replace(/-/g, ' ');
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: publicChannelName,
            displayName: publicChannelDisplayName,
            type: 'O',
        });
        if (!channel?.id) {
            throw new Error('[beforeAll] Failed to create public channel for edit test');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

        await wait(timeouts.THREE_SEC);
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // Recovery anchor for every test: ensures the previous test's modal/stack state
        // is dismissed and we are back on the channel list before proceeding.
        // ChannelListScreen.toBeVisible() internally dismisses any open modals and pops
        // back navigation until the channel list is visible (see channel_list.ts).
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T3199 - RN apps Edit public channel', async () => {
        await ChannelScreen.open(channelsCategory, publicChannelName);
        await ChannelInfoScreen.open();
        await CreateOrEditChannelScreen.openEditChannel();
        await expect(CreateOrEditChannelScreen.saveButton).toBeVisible();

        const updatedDisplayName = publicChannelDisplayName + ' edited';
        await CreateOrEditChannelScreen.displayNameInput.clearText();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(updatedDisplayName);

        const purposeText = 'Updated purpose for this channel';
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

        // After saving, app pops back to ChannelSettings (not ChannelInfo directly).
        // Anchor on the Edit Channel screen dismissing — a fixed 2s sleep is fragile when
        // the save round-trip or pop animation is slower on CI. Waiting on the screen
        // transition is deterministic and bounded by the same TEN_SEC envelope.
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
