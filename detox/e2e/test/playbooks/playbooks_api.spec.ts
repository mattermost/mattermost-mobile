// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Playbooks, Team, User, Channel} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';

// Simple utility to log results
const logResult = (operation: string, result: unknown): unknown => {
    console.log(`\n=== ${operation} ===`);
    console.log(JSON.stringify(result, null, 2));
    console.log('===================\n');
    return result;
};

// Main function to run all API operations
async function runPlaybooksApi() {
    try {
        console.log('Starting Playbooks API operations...');
        
        // Login as admin
        await User.apiAdminLogin(siteOneUrl);
        console.log('Logged in as admin');
        
        // Create test data
        const {team} = await Team.apiCreateTeam(siteOneUrl);
        const testTeam = team;
        logResult('Created team', testTeam);

        const {user} = await User.apiCreateUser(siteOneUrl);
        const testUser = user;
        logResult('Created user', testUser);

        // Add user to team
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeam.id);
        console.log(`Added user ${testUser.id} to team ${testTeam.id}`);

        // Create a channel
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: testTeam.id,
            type: 'O',
            prefix: 'playbook-test',
        });
        const testChannel = channel;
        logResult('Created channel', testChannel);

        // 1. Create a playbook
        const playbookTitle = 'Test Playbook ' + Date.now();
        const playbook = await Playbooks.apiCreateTestPlaybook(siteOneUrl, {
            teamId: testTeam.id,
            title: playbookTitle,
            userId: testUser.id,
        });
        logResult('Created playbook', playbook);

        // 2. Get the playbook by ID
        const fetchedPlaybook = await Playbooks.apiGetPlaybook(siteOneUrl, playbook.id);
        logResult('Fetched playbook', fetchedPlaybook);

        // 3. Start a playbook run
        const runName = 'Test Run ' + Date.now();
        const playbookRun = await Playbooks.apiRunPlaybook(siteOneUrl, {
            name: runName,
            owner_user_id: testUser.id,
            team_id: testTeam.id,
            playbook_id: playbook.id,
            channel_id: testChannel.id,
        });
        logResult('Started playbook run', playbookRun);

        // 4. Get the playbook run
        const fetchedRun = await Playbooks.apiGetPlaybookRun(siteOneUrl, playbookRun.id);
        logResult('Fetched playbook run', fetchedRun);

        // 5. Update status
        const statusMessage = 'Status update test';
        const statusUpdate = await Playbooks.apiUpdateStatus(siteOneUrl, playbookRun.id, statusMessage);
        logResult('Updated status', statusUpdate);

        // 6. Follow the run
        const followResult = await Playbooks.apiFollowPlaybookRun(siteOneUrl, playbookRun.id);
        logResult('Followed run', followResult);

        // 7. Unfollow the run
        const unfollowResult = await Playbooks.apiUnfollowPlaybookRun(siteOneUrl, playbookRun.id);
        logResult('Unfollowed run', unfollowResult);

        // 8. Update the playbook
        const updatedTitle = 'Updated Playbook ' + Date.now();
        const updatedPlaybook = {
            ...playbook,
            title: updatedTitle,
        };
        const updateResult = await Playbooks.apiUpdatePlaybook(siteOneUrl, updatedPlaybook);
        logResult('Updated playbook', updateResult);

        // 9. Finish the run
        const finishedRun = await Playbooks.apiFinishRun(siteOneUrl, playbookRun.id);
        logResult('Finished run', finishedRun);

        // 10. Create another playbook that won't be cleaned up (for UI verification)
        const permanentPlaybookTitle = 'PERMANENT Playbook ' + Date.now();
        const permanentPlaybook = await Playbooks.apiCreateTestPlaybook(siteOneUrl, {
            teamId: testTeam.id,
            title: permanentPlaybookTitle,
            userId: testUser.id,
        });
        logResult('Created permanent playbook for UI verification', permanentPlaybook);
        
        console.log('\n=== SUMMARY ===');
        console.log(`Created team: ${testTeam.name} (${testTeam.id})`);
        console.log(`Created user: ${testUser.username} (${testUser.id})`);
        console.log(`Created channel: ${testChannel.name} (${testChannel.id})`);
        console.log(`Created playbook: ${playbook.title} (${playbook.id})`);
        console.log(`Created permanent playbook: ${permanentPlaybook.title} (${permanentPlaybook.id})`);
        console.log(`Created run: ${playbookRun.name} (${playbookRun.id})`);
        console.log('All operations completed successfully!');
        
        // Optional: Clean up (comment out if you want to keep the data for UI verification)
        /*
        await Playbooks.apiArchivePlaybook(siteOneUrl, playbook.id);
        await Channel.apiDeleteChannel(siteOneUrl, testChannel.id);
        await Team.apiDeleteTeam(siteOneUrl, testTeam.id);
        await User.apiDeactivateUser(siteOneUrl, testUser.id);
        console.log('Cleanup completed');
        */
        
    } catch (error) {
        console.error('Error running Playbooks API operations:', error);
    }
}

// Run the function
runPlaybooksApi();
