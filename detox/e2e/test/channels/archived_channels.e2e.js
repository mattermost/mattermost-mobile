// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MainSidebar} from '@support/ui/component';
import {
    ChannelScreen,
    ChannelInfoScreen,
    MoreChannelsScreen,
} from '@support/ui/screen';
import {
    Channel,
    Setup,
    System,
} from '@support/server_api';

describe('Archived Channels', () => {
    let archivedChannel;
    let nonArchivedChannel;

    beforeAll(async () => {
        // # Enable experimental view archived channels
        await System.apiUpdateConfig({TeamSettings: {ExperimentalViewArchivedChannels: true}});

        const {channel, team, user} = await Setup.apiInit();
        archivedChannel = channel;

        ({channel: nonArchivedChannel} = await Channel.apiCreateChannel({type: 'O', prefix: 'non-archived-channel', teamId: team.id}));

        // # Open channel screen
        await ChannelScreen.open(user);
    });

    afterAll(async () => {
        await ChannelScreen.logout();
    });

    it('MM-T3618 should display archived channels list', async () => {
        const {openMainSidebar} = ChannelScreen;
        const {
            getChannelByDisplayName,
            hasChannelDisplayNameAtIndex,
            searchInput,
            showArchivedChannels,
            showPublicChannels,
        } = MoreChannelsScreen;

        // # Archive channel
        await openMainSidebar();
        await MainSidebar.getChannelByDisplayName(archivedChannel.display_name).tap();
        await ChannelInfoScreen.open();
        await ChannelInfoScreen.archiveChannel();

        // # Open more channels screen
        await openMainSidebar();
        await MoreChannelsScreen.open();

        // * Verify only non archived channels are displayed in public channels list
        await showPublicChannels();
        await hasChannelDisplayNameAtIndex(0, nonArchivedChannel.display_name);
        await expect(getChannelByDisplayName(archivedChannel.display_name)).not.toBeVisible();
        await searchInput.typeText(nonArchivedChannel.display_name);
        await hasChannelDisplayNameAtIndex(0, nonArchivedChannel.display_name);
        await expect(getChannelByDisplayName(archivedChannel.display_name)).not.toBeVisible();

        // * Verify only archived channels are displayed in archived channels list
        await searchInput.clearText();
        await showArchivedChannels();
        await hasChannelDisplayNameAtIndex(0, archivedChannel.display_name);
        await expect(getChannelByDisplayName(nonArchivedChannel.display_name)).not.toBeVisible();
        await searchInput.typeText(archivedChannel.display_name);
        await hasChannelDisplayNameAtIndex(0, archivedChannel.display_name);
        await expect(getChannelByDisplayName(nonArchivedChannel.display_name)).not.toBeVisible();

        // # Close more channels screen
        await MoreChannelsScreen.close();
    });
});
