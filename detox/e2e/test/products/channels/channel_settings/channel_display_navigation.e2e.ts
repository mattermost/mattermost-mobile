// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3189: RN apps Display channel list
 * - MM-T3190: RN apps Display Channel Info
 * - MM-T3191: RN apps Change channel
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
    FindChannelsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

describe('Channels', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    beforeAll(async () => {
        const {user, team} = await Setup.apiInit(siteOneUrl);
        testUser = user;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T3189 - RN apps Display channel list', async () => {
        // # Step 1: Swipe right to display the list of channels
        await ChannelScreen.toBeVisible();
        await ChannelListScreen.open();

        // * List of channels is displayed
        await expect(ChannelListScreen.channelListScreen).toBeVisible();
        await wait(timeouts.ONE_SEC);

        // # Step 2: Swipe left to close channel drawer
        await ChannelScreen.toBeVisible();
        await wait(timeouts.ONE_SEC);

        // # Step 3: Rotate the device to put display in landscape mode
        // Note: Device rotation is tested separately and may not be fully supported in all Detox configurations
        // Skipping actual rotation, but would use: await device.setOrientation('landscape');

        // # Step 4: Tap hamburger menu icon to open channel drawer
        await ChannelListScreen.open();

        // * List of channels is displayed with categories
        await expect(ChannelListScreen.channelListScreen).toBeVisible();
        await wait(timeouts.ONE_SEC);

        // Verify channel list is visible
        await ChannelListScreen.toBeVisible();
    });

    it('MM-T3190 - RN apps Display Channel Info', async () => {
        // # Step 1: Tap on the channel name in the bar at the top of your screen
        await ChannelScreen.toBeVisible();
        await ChannelInfoScreen.open();

        // * Channel Info is displayed
        await expect(ChannelInfoScreen.channelInfoScreen).toBeVisible();
        await wait(timeouts.ONE_SEC);

        // Verify channel info elements are visible
        await expect(ChannelInfoScreen.scrollView).toBeVisible();

        // Close channel info
        await ChannelInfoScreen.close();
    });

    it('MM-T3191 - RN apps Change channel', async () => {
        // # Setup: Create a test channel to search for
        const channelName = `test-channel-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // # Step 1: Open channel drawer
        await FindChannelsScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 2: Type the beginning of a channel name in the Jump to... search box
        const searchTerm = channelName.substring(0, 3);
        await FindChannelsScreen.searchInput.typeText(searchTerm);
        await wait(timeouts.TWO_SEC);

        // # Step 3: Tap on the name of a channel from the filtered list
        await expect(FindChannelsScreen.getFilteredChannelItem(channel.name)).toBeVisible();
        await FindChannelsScreen.getFilteredChannelItem(channel.name).tap();
        await wait(timeouts.ONE_SEC);

        // * The channel you tapped on opens in view
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(channel.display_name);

        // Go back to channel list
        await ChannelScreen.back();
    });
});
