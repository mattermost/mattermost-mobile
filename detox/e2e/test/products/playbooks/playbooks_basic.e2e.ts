// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Setup, User, Team, Playbooks, PlaybooksHelpers, Channel} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {ServerScreen, LoginScreen, ChannelScreen} from '@support/ui/screen';

describe('Playbooks - Basic', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    let testUser: any;
    let testTeam: any;
    let testChannel: any;
    let secondUser: any;
    let thirdUser: any;

    beforeAll(async () => {
        // Create test user, team, and channel
        ({user: testUser, team: testTeam, channel: testChannel} = await Setup.apiInit(siteOneUrl));
        await Playbooks.apiEnablePlugin(siteOneUrl, 'playbooks');

        // Create additional test users
        ({user: secondUser} = await User.apiCreateUser(siteOneUrl));
        ({user: thirdUser} = await User.apiCreateUser(siteOneUrl));

        await Team.apiAddUserToTeam(siteOneUrl, secondUser.id, testTeam.id);
        await Team.apiAddUserToTeam(siteOneUrl, thirdUser.id, testTeam.id);

        await Channel.apiAddUserToChannel(siteOneUrl, secondUser.id, testChannel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, thirdUser.id, testChannel.id);

        // # Log in to server
        await ServerScreen.connectToServer(siteOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    it('should verify in-progress playbook information in Channel Header and Channel Info ', async () => {
        // Generate a random playbook
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: secondUser.id,
            prefix: 'e2e-test',
            numChecklists: 2,
            numItems: 3,
            channel_id: testChannel.id,
        });

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(siteOneUrl, playbook);

        // Get the created playbook
        await Playbooks.apiGetPlaybook(siteOneUrl, playbookId);

        // Generate a playbook run
        const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
            teamId: testTeam.id,
            playbookId,
            channelId: testChannel.id,
            ownerId: secondUser.id,
            prefix: 'e2e-run',
        });

        // Start the playbook run
        await Playbooks.apiRunPlaybook(siteOneUrl, playbookRun);
        await ChannelScreen.open(channelsCategory, testChannel.name);

        await pilot.perform(
            'Verify the Playbook icon and count "1" are visible in the Channel Header',
            'Tap the "Quick Actions" icon in the Channel Header',
            'Verify a bottom sheet with the "Playbook runs" option is displayed',
            'Verify that "Playbook runs" is listed in the bottom sheet and "1" count is visible',
            'Tap the "Playbook runs" option in the bottom sheet',
            'Verify the "Playbook Runs" screen opens',
            'Verify the "In Progress" tab is selected',
            'Verify a Playbook whose name starts with "e2e-run" is visible',
        );
    });
});
