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
    ChannelListScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isIos} from '@support/utils';
import {expect} from 'detox';

function systemDialog(label: string) {
    if (device.getPlatform() === 'ios') {
        return element(by.label(label)).atIndex(0);
    }
    return element(by.text(label));
}

describe('Teams - Invite people', () => {
    const serverOneDisplayName = 'Server 1';

    let testTeam: any;
    let testUser: any;

    beforeAll(async () => {
        const {team, user} = await Setup.apiInit(siteOneUrl);

        testTeam = team;
        testUser = user;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Close share dialog
        await ChannelListScreen.headerTeamDisplayName.tap();

        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T5221 - should be able to share a URL invite to the team', async () => {
        // # Open plus menu
        await ChannelListScreen.headerPlusButton.tap();

        // * Verify invite people to team item is available
        await expect(ChannelListScreen.invitePeopleToTeamItem).toExist();

        // # Tap on invite people to team item
        await ChannelListScreen.invitePeopleToTeamItem.tap();

        if (isIos()) {
            // * Verify share dialog is open
            await expect(systemDialog(`Join the ${testTeam.display_name} team`)).toExist();
        }
    });
});
