// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Setup, User, Playbooks, PlaybooksHelpers} from '@support/server_api';

describe('Playbooks - Basic', () => {
    let testUser;
    let testTeam;
    let testChannel;
    let serverUrl;

    beforeAll(async () => {
        // Get server URL and log in as admin
        ({serverUrl} = await User.apiAdminLogin());

        // Create test user, team, and channel
        ({user: testUser, team: testTeam, channel: testChannel} = await Setup.apiInit(serverUrl));
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

        // Create the playbook
        const {id: playbookId} = await Playbooks.apiCreatePlaybook(serverUrl, playbook);
        expect(playbookId).toBeTruthy();

        // Get the created playbook
        const createdPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);
        expect(createdPlaybook).toBeTruthy();
        expect(createdPlaybook.title).toBe(playbook.title);
        expect(createdPlaybook.checklists.length).toBe(2);
        expect(createdPlaybook.checklists[0].items.length).toBe(3);

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
        expect(run).toBeTruthy();
        expect(run.name).toBe(playbookRun.name);
        expect(run.playbook_id).toBe(playbookId);

        // Get the playbook run
        const fetchedRun = await Playbooks.apiGetPlaybookRun(serverUrl, run.id);
        expect(fetchedRun).toBeTruthy();
        expect(fetchedRun.name).toBe(playbookRun.name);

        // Update status
        const statusMessage = `Status update at ${new Date().toISOString()}`;
        const statusUpdate = await Playbooks.apiUpdateStatus(serverUrl, run.id, statusMessage);
        expect(statusUpdate).toBeTruthy();

        // Finish the run
        const finishedRun = await Playbooks.apiFinishRun(serverUrl, run.id);
        expect(finishedRun).toBeTruthy();
        expect(finishedRun.end_at).toBeGreaterThan(0);
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
        expect(playbookId).toBeTruthy();

        // Get the created playbook
        const createdPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);
        expect(createdPlaybook).toBeTruthy();
        expect(createdPlaybook.metrics.length).toBe(2);
        expect(createdPlaybook.metrics[0].title).toBe('Time to resolution');
        expect(createdPlaybook.metrics[1].title).toBe('Customer impact');
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
        expect(playbookId).toBeTruthy();

        // Get the created playbook
        const createdPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);
        expect(createdPlaybook).toBeTruthy();

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
        expect(fetchedPlaybook).toBeTruthy();
        expect(fetchedPlaybook.title).toBe(updatedTitle);
        expect(fetchedPlaybook.description).toBe('Updated description');
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
        expect(playbookId).toBeTruthy();

        // Archive the playbook
        const {status} = await Playbooks.apiArchivePlaybook(serverUrl, playbookId);
        expect(status).toBe(200);
    });
});
