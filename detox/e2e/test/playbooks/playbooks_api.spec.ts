// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Playbooks, Team, User, Channel} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import * as jestExpect from 'expect';

describe('Playbooks API', () => {
    let testTeam: any;
    let testUser: any;
    let testChannel: any;

    beforeAll(async () => {
        // Login as admin
        await User.apiAdminLogin(siteOneUrl);

        // Create test data
        const {team} = await Team.apiCreateTeam(siteOneUrl);
        testTeam = team;

        const {user} = await User.apiCreateUser(siteOneUrl);
        testUser = user;

        // Add user to team
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeam.id);

        // Create a channel
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'O',
            prefix: 'playbook-test',
        });
        testChannel = channel;
    });

    afterAll(async () => {
        // Clean up
        if (testChannel?.id) {
            await Channel.apiDeleteChannel(siteOneUrl, testChannel.id);
        }
        if (testTeam?.id) {
            await Team.apiDeleteTeam(siteOneUrl, testTeam.id);
        }
        if (testUser?.id) {
            await User.apiDeactivateUser(siteOneUrl, testUser.id);
        }
    });

    it('should create and get a playbook', async () => {
        // Create a test playbook
        const playbookTitle = 'Test Playbook ' + Date.now();
        const playbook = await Playbooks.apiCreateTestPlaybook(siteOneUrl, {
            teamId: testTeam.id,
            title: playbookTitle,
            userId: testUser.id,
        });

        jestExpect.default(playbook).toBeTruthy();
        jestExpect.default(playbook.id).toBeTruthy();
        jestExpect.default(playbook.title).toBe(playbookTitle);

        // Get the playbook by ID
        const fetchedPlaybook = await Playbooks.apiGetPlaybook(siteOneUrl, playbook.id);
        jestExpect.default(fetchedPlaybook).toBeTruthy();
        jestExpect.default(fetchedPlaybook.id).toBe(playbook.id);
        jestExpect.default(fetchedPlaybook.title).toBe(playbookTitle);

        // Clean up
        await Playbooks.apiArchivePlaybook(siteOneUrl, playbook.id);
    });

    it('should create, update, and finish a playbook run', async () => {
        // Create a test playbook
        const playbookTitle = 'Run Test Playbook ' + Date.now();
        const playbook = await Playbooks.apiCreateTestPlaybook(siteOneUrl, {
            teamId: testTeam.id,
            title: playbookTitle,
            userId: testUser.id,
        });

        // Start a playbook run
        const runName = 'Test Run ' + Date.now();
        const playbookRun = await Playbooks.apiRunPlaybook(siteOneUrl, {
            name: runName,
            owner_user_id: testUser.id,
            team_id: testTeam.id,
            playbook_id: playbook.id,
            channel_id: testChannel.id,
        });

        jestExpect.default(playbookRun).toBeTruthy();
        jestExpect.default(playbookRun.id).toBeTruthy();
        jestExpect.default(playbookRun.name).toBe(runName);

        // Get the playbook run
        const fetchedRun = await Playbooks.apiGetPlaybookRun(siteOneUrl, playbookRun.id);
        jestExpect.default(fetchedRun).toBeTruthy();
        jestExpect.default(fetchedRun.id).toBe(playbookRun.id);
        jestExpect.default(fetchedRun.name).toBe(runName);

        // Update status
        const statusMessage = 'Status update test';
        const statusUpdate = await Playbooks.apiUpdateStatus(siteOneUrl, playbookRun.id, statusMessage);
        jestExpect.default(statusUpdate).toBeTruthy();
        jestExpect.default(statusUpdate.status_posts).toBeTruthy();

        // Finish the run
        const finishedRun = await Playbooks.apiFinishRun(siteOneUrl, playbookRun.id);
        jestExpect.default(finishedRun).toBeTruthy();
        jestExpect.default(finishedRun.id).toBe(playbookRun.id);
        jestExpect.default(finishedRun.end_at).toBeGreaterThan(0);

        // Clean up
        await Playbooks.apiArchivePlaybook(siteOneUrl, playbook.id);
    });

    it('should follow and unfollow a playbook run', async () => {
        // Create a test playbook
        const playbookTitle = 'Follow Test Playbook ' + Date.now();
        const playbook = await Playbooks.apiCreateTestPlaybook(siteOneUrl, {
            teamId: testTeam.id,
            title: playbookTitle,
            userId: testUser.id,
        });

        // Start a playbook run
        const runName = 'Follow Test Run ' + Date.now();
        const playbookRun = await Playbooks.apiRunPlaybook(siteOneUrl, {
            name: runName,
            owner_user_id: testUser.id,
            team_id: testTeam.id,
            playbook_id: playbook.id,
            channel_id: testChannel.id,
        });

        // Follow the run
        const followResult = await Playbooks.apiFollowPlaybookRun(siteOneUrl, playbookRun.id);
        jestExpect.default(followResult).toBeTruthy();

        // Unfollow the run
        const unfollowResult = await Playbooks.apiUnfollowPlaybookRun(siteOneUrl, playbookRun.id);
        jestExpect.default(unfollowResult).toBeTruthy();

        // Clean up
        await Playbooks.apiFinishRun(siteOneUrl, playbookRun.id);
        await Playbooks.apiArchivePlaybook(siteOneUrl, playbook.id);
    });

    it('should update a playbook', async () => {
        // Create a test playbook
        const playbookTitle = 'Update Test Playbook ' + Date.now();
        const playbook = await Playbooks.apiCreateTestPlaybook(siteOneUrl, {
            teamId: testTeam.id,
            title: playbookTitle,
            userId: testUser.id,
        });

        // Update the playbook
        const updatedTitle = 'Updated Playbook ' + Date.now();
        const updatedPlaybook = {
            ...playbook,
            title: updatedTitle,
        };

        const updateResult = await Playbooks.apiUpdatePlaybook(siteOneUrl, updatedPlaybook);
        jestExpect.default(updateResult).toBeTruthy();
        jestExpect.default(updateResult.title).toBe(updatedTitle);

        // Clean up
        await Playbooks.apiArchivePlaybook(siteOneUrl, playbook.id);
    });
});
