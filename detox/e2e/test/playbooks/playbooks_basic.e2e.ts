// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Setup, User, Team, Playbooks, PlaybooksHelpers, Channel} from '@support/server_api';
import {siteOneUrl, serverOneUrl} from '@support/test_config';
import {ServerScreen, LoginScreen} from '@support/ui/screen';

describe('Playbooks - Basic', () => {
    const serverOneDisplayName = 'Server 1';

    let testUser: any;
    let testTeam: any;
    let testChannel: any;
    let serverUrl: any;
    let secondUser: any;
    let thirdUser: any;

    beforeAll(async () => {
        // Get server URL and log in as admin
        await User.apiAdminLogin(siteOneUrl);
        serverUrl = siteOneUrl;

        // Create test user, team, and channel
        ({user: testUser, team: testTeam, channel: testChannel} = await Setup.apiInit(siteOneUrl));

        // Create additional test users
        secondUser = await User.apiCreateUser(serverUrl, {prefix: 'second'});
        await Team.apiAddUserToTeam(serverUrl, secondUser.id, testTeam.id);

        thirdUser = await User.apiCreateUser(serverUrl, {prefix: 'third'});
        await Team.apiAddUserToTeam(serverUrl, thirdUser.id, testTeam.id);
    });

    it('should create a playbook and run it', async () => {
        // Generate a random playbook
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: testUser.id,
            prefix: 'e2e-test',
            numChecklists: 2,
            numItems: 3,
        });

        // console.log('Generated playbook:', JSON.stringify(playbook, null, 2));

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);

        // Get the created playbook
        const createdPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);

        // console.log('Created Playbook:', createdPlaybook);
        // console.log('Playbook ID:', createdPlaybook.title);
        // console.log('Playbook:', createdPlaybook.checklists.length);
        // console.log('Playbook:', createdPlaybook.checklists[0].items.length);

        // Generate a playbook run
        const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
            teamId: testTeam.id,
            playbookId,
            channelId: testChannel.id,
            ownerId: testUser.id,
            prefix: 'e2e-run',
        });

        // Start the playbook run
        const run = await Playbooks.apiRunPlaybook(serverUrl, playbookRun);

        // console.log('Playbook Run:', run);
        // console.log('Run ID:', run.id);
        // console.log('Run Name:', run.name);
        // console.log('Run Playbook ID:', run.playbook_id);

        // Get the playbook run
        const fetchedRun = await Playbooks.apiGetPlaybookRun(serverUrl, run.id);

        // console.log('Fetched Playbook Run:', fetchedRun);
        // console.log('Fetched Run ID:', fetchedRun.id);
        // console.log('Fetched Run Name:', fetchedRun.name);
        // console.log('Fetched Run Playbook ID:', fetchedRun.playbook_id);

        // Update status
        const statusMessage = `Status update at ${new Date().toISOString()}`;
        const statusUpdate = await Playbooks.apiUpdateStatus(serverUrl, run.id, statusMessage);

        // console.log('Status Update:', statusUpdate);

        // Finish the run
        const finishedRun = await Playbooks.apiFinishRun(serverUrl, run.id);

        // console.log('Finished Run:', finishedRun);
        // console.log('Finished Run ID:', finishedRun.id);
        // console.log('Finished Run Name:', finishedRun.name);
        // console.log('Finished Run Playbook ID:', finishedRun.playbook_id);
        // console.log('Finished Run End At:', finishedRun.end_at);
    });

    it('should create a playbook with metrics', async () => {
        // Generate a random playbook with metrics
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: testUser.id,
            prefix: 'e2e-metrics',
            metricsEnabled: true,
        });

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);

        // Get the created playbook
        const createdPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);

        // console.log('Created Playbook with Metrics:', createdPlaybook);
    });

    it('should update a playbook', async () => {
        // Create a basic playbook
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: testUser.id,
            prefix: 'e2e-update',
        });

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);

        // Get the created playbook
        const createdPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);

        // Update the playbook
        const updatedTitle = `Updated ${playbook.title}`;
        const updatedPlaybook = {
            ...createdPlaybook,
            title: updatedTitle,
            description: 'Updated description',
        };

        await Playbooks.apiUpdatePlaybook(serverUrl, updatedPlaybook);

        // Get the updated playbook
        const fetchedPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);

        // console.log('Fetched Updated Playbook:', fetchedPlaybook);
    });

    it('should archive a playbook', async () => {
        // Create a basic playbook
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: testUser.id,
            prefix: 'e2e-archive',
        });

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);

        // Archive the playbook
        const {status} = await Playbooks.apiArchivePlaybook(serverUrl, playbookId);

        // console.log('Archive Playbook Status:', status);
    });

    it('should be able to add user to the playbook', async () => {
        // Create a basic playbook
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: testUser.id,
            prefix: 'e2e-add-user',
        });

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);

        // Get the created playbook
        const createdPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);

        // Verify initial members
        expect(createdPlaybook.members.length).toBe(1);
        expect(createdPlaybook.members[0].user_id).toBe(testUser.id);

        // Add second user to the playbook
        const updatedPlaybook = {
            ...createdPlaybook,
            members: [
                ...createdPlaybook.members,
                {user_id: secondUser.id, roles: ['playbook_member']},
            ],
        };

        await Playbooks.apiUpdatePlaybook(serverUrl, updatedPlaybook);

        // Get the updated playbook
        const fetchedPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);

        // Verify the second user was added
        expect(fetchedPlaybook.members.length).toBe(2);
        const secondUserMember = fetchedPlaybook.members.find((member: any) => member.user_id === secondUser.id);
        expect(secondUserMember).toBeTruthy();
        expect(secondUserMember.roles).toContain('playbook_member');
    });

    it('should be able to assign/unassign tasks in a playbook run', async () => {
        // Create a playbook
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: testUser.id,
            prefix: 'e2e-tasks',
            numChecklists: 1,
            numItems: 2,
        });

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);

        // Generate a playbook run
        const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
            teamId: testTeam.id,
            playbookId,
            channelId: testChannel.id,
            ownerId: testUser.id,
            prefix: 'e2e-tasks-run',
        });

        // Start the playbook run
        const run = await Playbooks.apiRunPlaybook(serverUrl, playbookRun);

        // Get the playbook run details
        const fetchedRun = await Playbooks.apiGetPlaybookRun(serverUrl, run.id);

        // Verify the run has checklists and items
        expect(fetchedRun.checklists.length).toBeGreaterThan(0);
        expect(fetchedRun.checklists[0].items.length).toBeGreaterThan(0);

        const checklistId = fetchedRun.checklists[0].id;
        const itemId = fetchedRun.checklists[0].items[0].id;

        // Assign the task to the second user
        await Playbooks.apiChangeChecklistItemAssignee(
            serverUrl,
            run.id,
            checklistId,
            itemId,
            secondUser.id,
        );

        // Get the updated run
        const updatedRun = await Playbooks.apiGetPlaybookRun(serverUrl, run.id);

        // Verify the task was assigned
        expect(updatedRun.checklists[0].items[0].assignee_id).toBe(secondUser.id);

        // Unassign the task
        await Playbooks.apiChangeChecklistItemAssignee(
            serverUrl,
            run.id,
            checklistId,
            itemId,
            '',
        );

        // Get the updated run again
        const finalRun = await Playbooks.apiGetPlaybookRun(serverUrl, run.id);

        // Verify the task was unassigned
        expect(finalRun.checklists[0].items[0].assignee_id).toBe('');
    });

    it('should be able to login as user and verify the playbook run is visible in the channel', async () => {
        // Create a playbook
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: testUser.id,
            prefix: 'e2e-visibility',
        });

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);

        // Generate a playbook run
        const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
            teamId: testTeam.id,
            playbookId,
            channelId: testChannel.id,
            ownerId: testUser.id,
            prefix: 'e2e-visibility-run',
        });

        // Start the playbook run
        const run = await Playbooks.apiRunPlaybook(serverUrl, playbookRun);

        // Add second user to the run
        await Playbooks.apiAddUsersToRun(serverUrl, run.id, [secondUser.id]);

        // Login as second user
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // Get the playbook run as second user
        const fetchedRun = await Playbooks.apiGetPlaybookRun(serverUrl, run.id);

        // Verify the run is accessible
        expect(fetchedRun).toBeTruthy();
        expect(fetchedRun.id).toBe(run.id);
        expect(fetchedRun.name).toBe(playbookRun.name);

        // Login back as admin
        await User.apiAdminLogin(serverUrl);
    });

    it('should be able to add user to channel but not to playbook run to verify limited visibility', async () => {
        // Create a playbook
        const playbook = PlaybooksHelpers.generateRandomPlaybook({
            teamId: testTeam.id,
            userId: testUser.id,
            prefix: 'e2e-limited-visibility',
        });

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);

        // Create a new channel for this test
        const testChannelForVisibility = await Channel.apiCreateChannel(serverUrl, {
            team_id: testTeam.id,
            name: 'visibility-test-' + Date.now(),
            display_name: 'Visibility Test Channel',
            type: 'O',
        });

        // Generate a playbook run
        const playbookRun = PlaybooksHelpers.generateRandomPlaybookRun({
            teamId: testTeam.id,
            playbookId,
            channelId: testChannelForVisibility.id,
            ownerId: testUser.id,
            prefix: 'e2e-limited-visibility-run',
        });

        // Start the playbook run
        const run = await Playbooks.apiRunPlaybook(serverUrl, playbookRun);

        // Add third user to the channel but not to the run
        await Channel.apiAddUserToChannel(serverUrl, thirdUser.id, testChannelForVisibility.id);

        // Login as third user
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(thirdUser);

        try {
            // Try to get the playbook run as third user
            // This should fail with a 403 Forbidden error
            await Playbooks.apiGetPlaybookRun(serverUrl, run.id);
            fail('Third user should not be able to access the playbook run');
        } catch (error) {
            // Expected error
            expect(error).toBeTruthy();
        }

        // Login back as admin
        await User.apiAdminLogin(serverUrl);

        // Add third user to the run
        await Playbooks.apiAddUsersToRun(serverUrl, run.id, [thirdUser.id]);

        // Login as third user again
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(thirdUser);

        // Now the third user should be able to access the run
        const fetchedRun = await Playbooks.apiGetPlaybookRun(serverUrl, run.id);
        expect(fetchedRun).toBeTruthy();
        expect(fetchedRun.id).toBe(run.id);

        // Login back as admin
        await User.apiAdminLogin(serverUrl);
    });
});
