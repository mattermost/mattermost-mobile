// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import path from 'path';

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
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

const FIXTURES_DIR = path.resolve(__dirname, '../../../../support/fixtures');

describe('Messaging - Redacted Files (ABAC)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    let testChannel: any;
    let controlChannel: any;
    let testTeam: any;
    let deniedUser: any;
    let allowedUser: any;
    let attributeFieldId: string | null = null; // field UUID — used as the property values key
    let attributeFieldName: string | null = null; // field name  — used in CEL expressions
    let fileId: string;
    let controlFileId: string;

    // Non-ABAC server settings this suite changes, restored as they were rather than to assumed defaults.
    let originalSettings: Record<string, any> = {};

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);

        // # Require Enterprise license
        await System.apiRequireLicense(siteOneUrl);

        const {config: originalConfig} = await System.apiGetConfig(siteOneUrl);
        originalSettings = {
            PasswordSettings: {MinimumLength: originalConfig?.PasswordSettings?.MinimumLength},
            ServiceSettings: {AllowCorsFrom: originalConfig?.ServiceSettings?.AllowCorsFrom},
        };

        // # Relax password policy for test users
        await System.apiPatchConfig(siteOneUrl, {
            PasswordSettings: {MinimumLength: 8},
        });

        // # Make sure the feature flags are on. Only flags that are off get written, and the others
        // are left as they are, so suites sharing this server keep their flags. They are not turned
        // back off afterwards: PermissionPolicies is on by default, the ABAC flag only exists on
        // servers older than 11.10, and the other ABAC suite may still be running.
        const {error: flagsError} = await System.apiEnableFeatureFlags(siteOneUrl, [
            'AttributeBasedAccessControl',
            'PermissionPolicies',
            'ChannelPermissionPolicies',
        ]);
        if (flagsError) {
            throw new Error(`Failed to enable the feature flags: ${JSON.stringify(flagsError)}`);
        }
        const {error: abacError} = await AccessControl.apiEnableABAC(siteOneUrl);
        if (abacError) {
            throw new Error(`Failed to enable ABAC: ${JSON.stringify(abacError)}`);
        }

        // # Enable user-managed attributes so CEL expressions can reference user.attributes.*
        await System.apiPatchConfig(siteOneUrl, {
            AccessControlSettings: {EnableUserManagedAttributes: true},
        });

        // # Create a suite-specific field so another ABAC suite cannot delete it while this suite runs
        attributeFieldName = `Department_${getRandomId()}`;
        const {field, error: fieldError} = await AccessControl.apiCreateCustomProfileAttributeField(
            siteOneUrl,
            attributeFieldName,
        );
        if (fieldError) {
            throw new Error(`Failed to create attribute field: ${JSON.stringify(fieldError)}`);
        }
        attributeFieldId = field.id;

        // # Wait for the server-side attribute view cache to expire (30s refresh gate)
        await wait(timeouts.HALF_MIN + timeouts.ONE_SEC);

        const {team} = await Setup.apiInit(siteOneUrl);
        testTeam = team;

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'abac-test',
        });
        testChannel = channel;
        ({channel: controlChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'abac-test-control',
        }));

        // # Create denied user (Department: "Sales") and add to the policy and control channels
        ({user: deniedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'denied'}));
        await Team.apiAddUserToTeam(siteOneUrl, deniedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, testChannel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, controlChannel.id);
        await AccessControl.apiSetUserPropertyValues(siteOneUrl, deniedUser.id, {
            [attributeFieldId as string]: 'Sales',
        });

        // # Create allowed user (Department: "Engineering") and add to the policy and control channels
        ({user: allowedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'allowed'}));
        await Team.apiAddUserToTeam(siteOneUrl, allowedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, allowedUser.id, testChannel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, allowedUser.id, controlChannel.id);
        await AccessControl.apiSetUserPropertyValues(siteOneUrl, allowedUser.id, {
            [attributeFieldId as string]: 'Engineering',
        });

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

        const controlUpload = await Post.apiUploadFileToChannel(siteOneUrl, controlChannel.id, path.join(FIXTURES_DIR, 'sample.txt'));
        if (controlUpload.error) {
            throw new Error(`Control file upload failed: ${JSON.stringify(controlUpload.error)}`);
        }
        controlFileId = controlUpload.fileId;

        await Post.apiCreatePost(siteOneUrl, {
            channelId: controlChannel.id,
            message: 'Post with attached file outside the policy channel',
            fileIds: [controlFileId],
        });

        // # Scope the download policy to this suite's channel
        const {error: policyError} = await AccessControl.apiCreateChannelPermissionPolicy(
            siteOneUrl,
            testChannel.id,
            [{
                actions: ['download_file_attachment'],
                expression: `user.attributes.${attributeFieldName} == "Engineering"`,
            }],
        );
        if (policyError) {
            throw new Error(`Failed to create permission policy: ${JSON.stringify(policyError)}`);
        }

        // # Allow cross-origin WebSocket connections for the Android emulator
        await System.apiPatchConfig(siteOneUrl, {
            ServiceSettings: {AllowCorsFrom: '*'},
        });

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
    });

    afterAll(async () => {
        // # Clean up the server first: a failing UI step must not leave the deny policy active on a
        // shared server. Then policy, this suite's attribute field, team, users, and config.
        if (testChannel?.id) {
            await AccessControl.apiDeletePermissionPolicy(siteOneUrl, testChannel.id);
        }
        if (attributeFieldName) {
            await AccessControl.apiDeleteCustomProfileAttributeFieldByName(siteOneUrl, attributeFieldName);
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
        await System.apiPatchConfig(siteOneUrl, originalSettings);

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

        // * The same user's file remains available in a channel without the policy
        await ChannelScreen.back();
        await ChannelScreen.open(channelsCategory, controlChannel.name);
        await waitFor(element(by.id(`${controlFileId}-file-container`))).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id('redacted-files-placeholder'))).not.toExist();

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
