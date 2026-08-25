// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Channel,
    Setup,
} from '@support/server_api';
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
import {getRandomId} from '@support/utils';
import {by, element, expect, waitFor} from 'detox';

describe('Channels - Channel Purpose Markdown', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    let testUser: any;
    let purposeChannel: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testUser = user;

        // # Pre-create the channel BEFORE login so it lands in the initial sidebar sync
        // (WebSocket-driven post-login creation is unreliable for sidebar lookups).
        const randomId = getRandomId();
        const markdownPurpose = `**bold** purpose ${randomId}`;
        const {channel: pChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'purpose',
            channel: {
                team_id: team.id,
                name: `purpose-channel-${randomId}`,
                display_name: `Purpose Channel ${randomId}`,
                type: 'O',
                purpose: markdownPurpose,
                header: '',
            },
        });
        if (!pChannel?.id) {
            throw new Error('[beforeAll] Failed to create purpose channel');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, user.id, pChannel.id);
        purposeChannel = {...pChannel, markdownPurpose};

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();
    });

    it('MM-T1733_1 - should not render markdown in channel purpose on info screen', async () => {
        // # Scroll sidebar to find purposeChannel (may be off-screen)
        const purposeChannelDisplayNameEl = ChannelListScreen.getChannelItemDisplayName(channelsCategory, purposeChannel.name);
        await element(by.id('channel_list.flat_list')).scrollTo('top');
        await waitFor(purposeChannelDisplayNameEl).toBeVisible().
            whileElement(by.id('channel_list.flat_list')).scroll(100, 'down');
        await purposeChannelDisplayNameEl.tap();
        await ChannelScreen.dismissScheduledPostTooltip();
        await ChannelScreen.toBeVisible();

        // # Open channel info screen
        await ChannelInfoScreen.open();

        // * Verify the purpose text shows as plain text (not rendered markdown)
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toBeVisible();
        await expect(ChannelInfoScreen.publicPrivateTitlePurpose).toHaveText(purposeChannel.markdownPurpose);

        // # Close channel info and go back
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
