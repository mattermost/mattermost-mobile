// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import path from 'path';

import {assertAbacBaseline, getProvisionedDepartmentField, setDepartment} from '@support/abac_test_helper';
import {
    AccessControl,
    Channel,
    Post,
    Setup,
    System,
    Team,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

const FIXTURES_DIR = path.resolve(__dirname, '../../../../support/fixtures');

describe('Messaging - Redacted Files (ABAC)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    let testChannel: any;
    let testTeam: any;
    let deniedUser: any;
    let allowedUser: any;
    let permissionPolicyId: string | null = null;
    let fileId: string;

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);

        // # Require Enterprise license
        await System.apiRequireLicense(siteOneUrl);

        // # ABAC, user-managed attributes and the Department attribute come from provisioning
        await assertAbacBaseline(siteOneUrl);
        const department = await getProvisionedDepartmentField(siteOneUrl);

        const {team} = await Setup.apiInit(siteOneUrl);
        testTeam = team;

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'abac-test',
        });
        testChannel = channel;

        // # Create denied user (Department: "Sales") and add to team + channel
        ({user: deniedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'denied'}));
        await Team.apiAddUserToTeam(siteOneUrl, deniedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, testChannel.id);
        await setDepartment(siteOneUrl, deniedUser.id, department.id, 'Sales');

        // # Create allowed user (Department: "Engineering") and add to team + channel
        ({user: allowedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'allowed'}));
        await Team.apiAddUserToTeam(siteOneUrl, allowedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, allowedUser.id, testChannel.id);
        await setDepartment(siteOneUrl, allowedUser.id, department.id, 'Engineering');

        const upload = await Post.apiUploadFileToChannel(siteOneUrl, testChannel.id, path.join(FIXTURES_DIR, 'sample.txt'));
        if (upload.error) {
            throw new Error(`File upload failed: ${JSON.stringify(upload.error)}`);
        }
        fileId = upload.fileId;

        await Post.apiCreatePost(siteOneUrl, {
            channelId: testChannel.id,
            message: 'Post with attached file',
            fileIds: [fileId],
        });

        // # In this channel only, Engineering can download files and Sales cannot
        const {policy, error: policyError} = await AccessControl.apiCreateChannelPermissionPolicy(
            siteOneUrl,
            testChannel.id,
            [{
                name: 'abac-download',
                role: 'channel_user',
                actions: ['download_file_attachment'],
                expression: `user.attributes.${department.name} == "Engineering"`,
            }],
        );
        if (policyError) {
            throw new Error(`Failed to create permission policy: ${JSON.stringify(policyError)}`);
        }
        permissionPolicyId = policy?.id ?? null;

        const {error: activateError} = await AccessControl.apiSetPolicyActive(siteOneUrl, permissionPolicyId as string);
        if (activateError) {
            throw new Error(`Failed to activate permission policy: ${JSON.stringify(activateError)}`);
        }

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
    });

    afterAll(async () => {
        // # Delete the policy first so a failing UI step cannot leave it active
        if (permissionPolicyId) {
            await AccessControl.apiDeletePermissionPolicy(siteOneUrl, permissionPolicyId);
        }
        if (testTeam?.id) {
            await Team.apiDeleteTeam(siteOneUrl, testTeam.id);
        }
        if (deniedUser?.id) {
            await User.apiDeactivateUser(siteOneUrl, deniedUser.id);
        }
        if (allowedUser?.id) {
            await User.apiDeactivateUser(siteOneUrl, allowedUser.id);
        }

        // # Only after the server is clean: leave the app logged out if a test did not.
        await HomeScreen.logout();
    });

    it('MM-68219_1 - should show redacted files placeholder when user attribute does not satisfy the policy', async () => {
        // # Log in as the denied user (Department: Sales) and open the channel
        await LoginScreen.login(deniedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Sales user does not satisfy the policy — placeholder is shown, the file is not
        await waitFor(element(by.id('redacted-files-placeholder'))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);

        // `-file-container`, not `-file`: the attachment is a .txt, and only image and video files
        // carry the `-file` testID
        await expect(element(by.id(`${fileId}-file-container`))).not.toExist();

        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-68219_2 - should not show redacted placeholder when user attribute satisfies the policy', async () => {
        // # Log in as the allowed user (Department: Engineering) and open the channel
        await LoginScreen.login(allowedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Wait for the attachment itself: absence of the placeholder alone would also hold before
        // the list loads, or while the post is still unverified
        await waitFor(element(by.id(`${fileId}-file-container`))).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id('redacted-files-placeholder'))).not.toExist();
        await expect(element(by.id('unverified-files-placeholder'))).not.toExist();

        await ChannelScreen.back();
        await HomeScreen.logout();
    });
});
