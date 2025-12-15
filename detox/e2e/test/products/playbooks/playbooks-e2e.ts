// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Setup, User, Team, Playbooks, PlaybooksHelpers, Channel} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {ServerScreen, LoginScreen, ChannelScreen, ChannelListScreen, ThreadScreen} from '@support/ui/screen';

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

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
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
            'Verify that "Playbook runs" option is listed in the bottom sheet',
            'Tap the "Playbook runs" option in the bottom sheet',
            'Verify the "Playbook runs" screen opens',
            'Verify the "In Progress" tab is selected',
        );

        await Playbooks.apiDeletePlaybook(siteOneUrl, playbookId);
        await ThreadScreen.back();
        await ChannelScreen.back();
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
            'Verify multiple finished playbook runs are listed',
        );

        await Playbooks.apiDeletePlaybook(siteOneUrl, playbookId);
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('should verify scrolling of playbooks in the In Progress tab', async () => {
        const playbookRunsToDelete: string[] = [];

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
            // eslint-disable-next-line no-await-in-loop
            const activeRun = await Playbooks.apiRunPlaybook(siteOneUrl, playbookRun);
            playbookRunsToDelete.push(activeRun.id);
        }
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await pilot.perform(
            'Tap the "Quick Actions" icon in the Channel Header',
            'Tap the "Playbook runs" option in the bottom sheet',
            'Verify the "Playbook runs" screen opens',
        );
        await pilot.autopilot('Scroll through the list of playbooks in the In Progress tab and verify that the list scrolls smoothly and all playbooks are visible');

        await Promise.all(playbookRunsToDelete.map((runId) => Playbooks.apiDeletePlaybook(siteOneUrl, runId)));
        await ThreadScreen.back();
        await ChannelScreen.back();
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
        await Playbooks.apiAddUsersToRun(siteOneUrl, activeRun.id, [testUser.id, secondUser.id, thirdUser.id]);
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await pilot.perform(
            'Tap the "Quick Actions" icon in the Channel Header',
            'Tap the "Playbook runs" option in the bottom sheet',
            'Tap on the Playbook run to open it',
            'Verify Owner and Participants are displayed',
            'Tap on the "Checklist 1" tab to collapse the checklist section',
            'Tap on the "Checklist 1" tab to expand the checklist section',
        );
        await pilot.autopilot('Verify Interacting with checklist items and updating progress');

        await Playbooks.apiDeletePlaybook(siteOneUrl, playbookId);
        await ThreadScreen.back();
        await ThreadScreen.back();
        await ChannelScreen.back();
    });

    it('should verify the participants list in the playbook', async () => {
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
        const activeRun = await Playbooks.apiRunPlaybook(siteOneUrl, playbookRun);
        await Playbooks.apiAddUsersToRun(siteOneUrl, activeRun.id, [testUser.id, secondUser.id, thirdUser.id]);
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await pilot.perform(
            'Tap the "Quick Actions" icon in the Channel Header',
            'Tap the "Playbook runs" option in the bottom sheet',
            'Tap on the Playbook run to open it',
            'Tap on the icons section below "Participants" label',
            'Verify bottom sheet with title "Run Participants" is displayed',
            'Verify the participants list contains list of 3 users',
        );

        await Playbooks.apiDeletePlaybook(siteOneUrl, playbookId);
        await ThreadScreen.back();
        await ThreadScreen.back();
        await ChannelScreen.back();
    });
});
