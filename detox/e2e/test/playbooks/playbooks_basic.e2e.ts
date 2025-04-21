// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Setup, User, Playbooks, PlaybooksHelpers} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

describe('Playbooks - Basic', () => {
    let testUser: any;
    let testTeam: any;
    let testChannel: any;
    let serverUrl: any;

    beforeAll(async () => {
        // Get server URL and log in as admin
        await User.apiAdminLogin(siteOneUrl);
        serverUrl = siteOneUrl;
        console.log('Server URL:', serverUrl);

        // Create test user, team, and channel
        ({user: testUser, team: testTeam, channel: testChannel} = await Setup.apiInit(siteOneUrl));

        console.log('Test User:', testUser);
        console.log('Test User:', testUser.newUser.password);
        console.log('Test User:', testUser.newUser.username);

    });

    it.only('should create a playbook and run it', async () => {
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

        // Get the created playbook
        const createdPlaybook = await Playbooks.apiGetPlaybook(serverUrl, playbookId);
        console.log('Created Playbook:', createdPlaybook);
        console.log('Playbook ID:', createdPlaybook.title);
        console.log('Playbook:', createdPlaybook.checklists.length);
        console.log('Playbook:', createdPlaybook.checklists[0].items.length);

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

        console.log('Playbook Run:', run);
        console.log('Run ID:', run.id);
        console.log('Run Name:', run.name);
        console.log('Run Playbook ID:', run.playbook_id);

        // Get the playbook run
        const fetchedRun = await Playbooks.apiGetPlaybookRun(serverUrl, run.id);

        console.log('Fetched Playbook Run:', fetchedRun);
        console.log('Fetched Run ID:', fetchedRun.id);
        console.log('Fetched Run Name:', fetchedRun.name);
        console.log('Fetched Run Playbook ID:', fetchedRun.playbook_id);

        // Update status
        const statusMessage = `Status update at ${new Date().toISOString()}`;
        const statusUpdate = await Playbooks.apiUpdateStatus(serverUrl, run.id, statusMessage);

        console.log('Status Update:', statusUpdate);

        // Finish the run
        const finishedRun = await Playbooks.apiFinishRun(serverUrl, run.id);
        console.log('Finished Run:', finishedRun);
        console.log('Finished Run ID:', finishedRun.id);
        console.log('Finished Run Name:', finishedRun.name);
        console.log('Finished Run Playbook ID:', finishedRun.playbook_id);
        console.log('Finished Run End At:', finishedRun.end_at);
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
