// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    ChannelScreen,
    LoginScreen,
    SelectTeamScreen,
} from '@support/ui/screen';
import {
    Channel,
    Team,
    User,
} from '@support/server_api';

describe('Select Team', () => {
    let testTeam;

    beforeAll(async () => {
        await Team.apiPatchTeams({allow_open_invite: false});
        const {user} = await User.apiCreateUser();
        const {team} = await Team.apiCreateTeam();
        testTeam = team;
        await Team.apiPatchTeam(testTeam.id, {allow_open_invite: true});

        // # Open select team screen
        await LoginScreen.open();
        await LoginScreen.login(user);
        await SelectTeamScreen.toBeVisible();
    });

    afterAll(async () => {
        await ChannelScreen.logout();
        await Team.apiPatchTeams({allow_open_invite: true});
    });

    it('MM-T3619 should be able to select a team', async () => {
        // # Tap on team to join
        const team = await SelectTeamScreen.getTeamByDisplayName(testTeam.display_name);
        await team.tap();

        // * Verify redirect to default channel of joined team
        const {channel} = await Channel.apiGetChannelByName(testTeam.name, 'town-square');
        const {channelNavBarTitle} = ChannelScreen;
        await ChannelScreen.toBeVisible();
        await expect(channelNavBarTitle).toHaveText(channel.display_name);
    });
});
