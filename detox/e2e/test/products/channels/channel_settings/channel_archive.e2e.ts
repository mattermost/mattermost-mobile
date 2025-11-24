// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

/**
 * Test Cases Included:
 * - MM-T3197: RN apps Archive public or private channel
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

    it('MM-T3197 - RN apps Archive public or private channel', async () => {
        // Expected Results (for all steps):
        // * After #2,
        // * A message is displayed on screen asking whether or not you want to archive the channel.
        // * After #3,
        // * The channel is archived and you are redirected to the last channel you were viewing
        // * If you had tapped on "no", the confirmation should just close and your view remains in channel info
        // * Note: If "Allow users to view archived channels" is set to "True" - view will remain in archived channel view of the channel you've just archived

        // # Setup: Create a test public channel
        const channelName = `archive-test-${getRandomId()}`;
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            name: channelName,
            displayName: channelName,
            type: 'O',
        });

        // Navigate to the channel
        await ChannelScreen.open('public', channel.display_name);

        // # Step 1: Tap the channel header
        await ChannelInfoScreen.open();
        await wait(timeouts.ONE_SEC);

        // # Step 2: Tap on 'archive channel'
        // * A message is displayed on screen asking whether or not you want to archive the channel.
        await ChannelInfoScreen.scrollView.scrollTo('bottom');
        await wait(timeouts.ONE_SEC);

        // # Step 3: Tap on "yes"
        await ChannelInfoScreen.archivePublicChannel({confirm: true});

        // * The channel is archived and you are redirected to the last channel you were viewing
        await wait(timeouts.TWO_SEC);
        await expect(ChannelInfoScreen.channelInfoScreen).not.toBeVisible();

        // Verify we're on the channel list or another channel
        await ChannelListScreen.toBeVisible();
    });
});
