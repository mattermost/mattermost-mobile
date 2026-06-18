// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup, Team} from '@support/server_api';
import {serverTwoUrl, siteTwoUrl} from '@support/test_config';
import {Alert} from '@support/ui/component';
import {
    ChannelScreen,
    ChannelListScreen,
    CreateOrEditChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ChannelInfoScreen,
    ChannelSettingsScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';

describe('Channels - Unarchive Channel', () => {
    const serverOneDisplayName = 'Server 1';

    beforeAll(async () => {
        // ExperimentalViewArchivedChannels is set by detox/provision at
        // server startup — no runtime admin login or config API call needed.
        const {user, team} = await Setup.apiInit(siteTwoUrl);

        // Unarchive requires MANAGE_TEAM; channel creators can archive but not unarchive.
        await Team.apiUpdateTeamMemberSchemeRoles(siteTwoUrl, team.id, user.id, true);

        await ServerScreen.connectToServer(serverTwoUrl, serverOneDisplayName);
        await LoginScreen.login(user);
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        await Alert.dismissChannelRemoveOrArchiveAlert();
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T4944_1 - should be able to unarchive a public channel and confirm', async () => {
        const channelDisplayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.FOUR_SEC);

        await ChannelScreen.dismissScheduledPostTooltip();

        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePublicChannel({confirm: true});

        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.unarchivePublicChannel({confirm: true});
        await wait(timeouts.FOUR_SEC);

        // Use waitFor (polling) instead of expect (one-shot) — the UI may need
        // extra time to reflect the unarchived state after the API call completes.
        await waitFor(ChannelScreen.postDraft).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.back();
    });

    it('MM-T4944_2 - should be able to unarchive a private channel and confirm', async () => {
        // The "Removed from channel" alert from the prior test's archive/unarchive
        // cycle can appear with a delay (after beforeEach already ran) because the
        // WebSocket "user_removed" event arrives async. Dismiss any lingering alert
        // here so it does not cover the channel-list plus button on iOS.
        await Alert.dismissChannelRemoveOrArchiveAlert();
        const channelDisplayName = `Channel ${getRandomId()}`;
        await CreateOrEditChannelScreen.openCreateChannel();
        await CreateOrEditChannelScreen.toggleMakePrivateOn();
        await CreateOrEditChannelScreen.displayNameInput.replaceText(channelDisplayName);
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.FOUR_SEC);

        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.archivePrivateChannel({confirm: true});

        await ChannelInfoScreen.open();
        await ChannelInfoScreen.openChannelSettings();
        await ChannelSettingsScreen.toBeVisible();
        await ChannelSettingsScreen.unarchivePrivateChannel({confirm: true});
        await wait(timeouts.FOUR_SEC);

        // Use waitFor (polling) instead of expect (one-shot) — the UI may need
        // extra time to reflect the unarchived state after the API call completes.
        await waitFor(ChannelScreen.channelScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelScreen.postDraft).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.back();
    });
});
