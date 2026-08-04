// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    Setup,
    Team,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

describe('Channels - Team Switching', () => {
    const serverOneDisplayName = 'Server 1';
    let testTeam: any;
    let testTeamTwo: any;
    let testUser: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        // # Create a second team and add the test user
        const {team: createdTeamTwo} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'a'});
        testTeamTwo = createdTeamTwo;
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeamTwo.id);

        // # Log in to server and reload so the second team appears in the sidebar
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Delete the second team and log out
        await Team.apiDeleteTeam(siteOneUrl, testTeamTwo.id);
        await HomeScreen.logout();
    });

    it('MM-T3249 - should switch between teams via the sidebar', async () => {
        // Prior tests may leave the second team selected — normalize before asserting.
        try {
            await waitFor(ChannelListScreen.headerTeamDisplayName).
                toHaveText(testTeam.display_name).
                withTimeout(timeouts.TWO_SEC);
        } catch {
            await ChannelListScreen.getTeamItemNotSelected(testTeam.id).tap();
            await waitFor(ChannelListScreen.headerTeamDisplayName).
                toHaveText(testTeam.display_name).
                withTimeout(timeouts.TEN_SEC);
        }

        // * Verify on first team with correct channel list header and sidebar selection
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);
        await expect(ChannelListScreen.getTeamItemSelected(testTeam.id)).toBeVisible();
        await expect(ChannelListScreen.getTeamItemDisplayNameAbbreviation(testTeam.id)).toHaveText(testTeam.display_name.substring(0, 2).toUpperCase());

        // # Tap on second team item from team sidebar
        await ChannelListScreen.getTeamItemNotSelected(testTeamTwo.id).tap();

        // * Verify on second team with updated channel list and sidebar selection
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeamTwo.display_name);
        await expect(ChannelListScreen.getTeamItemSelected(testTeamTwo.id)).toBeVisible();
        await expect(ChannelListScreen.getTeamItemDisplayNameAbbreviation(testTeamTwo.id)).toHaveText(testTeamTwo.display_name.substring(0, 2).toUpperCase());
        await expect(ChannelListScreen.getCategoryHeaderDisplayName('channels')).toBeVisible();

        // # Tap back on first team item from team sidebar
        await ChannelListScreen.getTeamItemNotSelected(testTeam.id).tap();

        // * Verify switched back to first team
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);
        await expect(ChannelListScreen.getTeamItemSelected(testTeam.id)).toBeVisible();
    });
});
