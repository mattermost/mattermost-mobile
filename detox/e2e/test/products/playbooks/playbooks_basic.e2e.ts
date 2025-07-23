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
        const activeRun = await Playbooks.apiRunPlaybook(siteOneUrl, playbookRun);
        await Playbooks.apiAddUsersToRun(siteOneUrl, activeRun.id, [secondUser.id, thirdUser.id]);
        await ChannelScreen.open(channelsCategory, testChannel.name);

        await pilot.perform(
            'Verify the Playbook icon and count "1" are visible in the Channel Header',
            'Tap the "Quick Actions" icon in the Channel Header',
            'Verify a bottom sheet with the "Playbook runs" option is displayed',
            'Verify that "Playbook runs" is listed in the bottom sheet and "1" count is visible',
            'Tap the "Playbook runs" option in the bottom sheet',
            'Verify the "Playbook runs" screen opens',
            'Verify the "In Progress" tab is selected',
        );
    });

    it('should verify finished playbooks are listed in the Finished tab', async () => {
        // Create and finish a playbook run
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: secondUser.id,
            prefix: 'finished-test',
            channel_id: testChannel.id,
        });
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(siteOneUrl, playbook);
        const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
            teamId: testTeam.id,
            playbookId,
            channelId: testChannel.id,
            ownerId: secondUser.id,
            prefix: 'finished-run',
        });
        const activeRun = await Playbooks.apiRunPlaybook(siteOneUrl, playbookRun);
        await Playbooks.apiFinishRun(siteOneUrl, activeRun.id);
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await pilot.perform(
            'Tap the "Quick Actions" icon in the Channel Header',
            'Tap the "Playbook runs" option in the bottom sheet',
            'Switch to the "Finished" tab',
            'Verify the finished playbook run is listed',
        );
    });

    it('should verify scrolling of playbooks in the In Progress tab', async () => {
        // Create multiple in-progress playbook runs
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: secondUser.id,
            prefix: 'scroll-inprogress',
            channel_id: testChannel.id,
        });
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(siteOneUrl, playbook);
        for (let i = 0; i < 10; i++) {
            const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
                teamId: testTeam.id,
                playbookId,
                channelId: testChannel.id,
                ownerId: secondUser.id,
                prefix: `scroll-inprogress-${i}`,
            });
            Playbooks.apiRunPlaybook(siteOneUrl, playbookRun);
        }
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await pilot.perform(
            'Tap the button with testID "quickActions"',
            'Tap the option with text containing "Playbook runs"',
            'Verify multiple "In Progress" playbook runs are listed',
            'Scroll down to load more playbook runs',
            'Verify additional "In Progress" playbook runs are loaded',
        );
    });

    it('should verify details of a checklist in a particular playbook', async () => {
        // Create a playbook with a checklist
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: secondUser.id,
            prefix: 'checklist-details',
            numChecklists: 2,
            numItems: 2,
            channel_id: testChannel.id,
        });
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(siteOneUrl, playbook);
        const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
            teamId: testTeam.id,
            playbookId,
            channelId: testChannel.id,
            ownerId: secondUser.id,
            prefix: 'checklist-details-run',
        });
        const activeRun = await Playbooks.apiRunPlaybook(siteOneUrl, playbookRun);
        await Playbooks.apiAddUsersToRun(siteOneUrl, activeRun.id, [secondUser.id, thirdUser.id]);
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await pilot.perform(
            'Tap on the Playbooks icon in the Channel Header',
            'Verify the playbook name is displayed',
            'Verify the checklist and its items are displayed',
        );
    });

    it('should verify ticking a checklist item and seeing progress', async () => {
        // Create a playbook with a checklist
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: secondUser.id,
            prefix: 'checklist-progress',
            numChecklists: 1,
            numItems: 2,
            channel_id: testChannel.id,
        });
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(siteOneUrl, playbook);
        const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
            teamId: testTeam.id,
            playbookId,
            channelId: testChannel.id,
            ownerId: secondUser.id,
            prefix: 'checklist-progress-run',
        });
        await Playbooks.apiRunPlaybook(siteOneUrl, playbookRun);
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await pilot.perform(
            'Tap the "Quick Actions" icon in the Channel Header',
            'Tap the "Playbook runs" option in the bottom sheet',
            'Open a playbook run',
            'Tick a checklist item',
            'Verify the progress indicator updates accordingly',
        );
    });
});
