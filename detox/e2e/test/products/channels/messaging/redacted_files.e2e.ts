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
    let testTeam: any;
    let deniedUser: any;
    let allowedUser: any;
    let permissionPolicyId: string | null = null;
    let attributeFieldId: string | null = null; // field UUID — used as the property values key
    let attributeFieldName: string | null = null; // field name  — used in CEL expressions
    let attributeFieldCreated = false; // true if this run created the field (must clean up)
    let fileId: string;

    // Server settings this suite changes, restored as they were rather than to assumed defaults.
    let originalSettings: Record<string, any> = {};

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);

        // # Require Enterprise license
        await System.apiRequireLicense(siteOneUrl);

        const {config: originalConfig} = await System.apiGetConfig(siteOneUrl);
        originalSettings = {
            FeatureFlags: {
                AttributeBasedAccessControl: originalConfig?.FeatureFlags?.AttributeBasedAccessControl,
                PermissionPolicies: originalConfig?.FeatureFlags?.PermissionPolicies,
            },
            AccessControlSettings: {
                EnableAttributeBasedAccessControl: originalConfig?.AccessControlSettings?.EnableAttributeBasedAccessControl,
                EnableUserManagedAttributes: originalConfig?.AccessControlSettings?.EnableUserManagedAttributes,
            },
            PasswordSettings: {MinimumLength: originalConfig?.PasswordSettings?.MinimumLength},
            ServiceSettings: {AllowCorsFrom: originalConfig?.ServiceSettings?.AllowCorsFrom},
        };

        // # Relax password policy for test users
        await System.apiPatchConfig(siteOneUrl, {
            PasswordSettings: {MinimumLength: 8},
        });

        // # Enable ABAC and PermissionPolicies feature flags
        await System.apiUpdateConfig(siteOneUrl, {
            FeatureFlags: {AttributeBasedAccessControl: true, PermissionPolicies: true},
        });
        const {error: abacError} = await AccessControl.apiEnableABAC(siteOneUrl);
        if (abacError) {
            throw new Error(`Failed to enable ABAC: ${JSON.stringify(abacError)}`);
        }

        // # Enable user-managed attributes so CEL expressions can reference user.attributes.*
        await System.apiPatchConfig(siteOneUrl, {
            AccessControlSettings: {EnableUserManagedAttributes: true},
        });

        // # Reuse existing "Department" attribute field or create it if absent
        const {field, created, error: fieldError} = await AccessControl.apiGetOrCreateCustomProfileAttributeField(
            siteOneUrl,
            'Department',
        );
        if (fieldError) {
            throw new Error(`Failed to get/create attribute field: ${JSON.stringify(fieldError)}`);
        }
        attributeFieldId = field.id;
        attributeFieldName = field.name;
        attributeFieldCreated = created;

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

        // # Create denied user (Department: "Sales") and add to team + channel
        ({user: deniedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'denied'}));
        await Team.apiAddUserToTeam(siteOneUrl, deniedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, testChannel.id);
        await AccessControl.apiSetUserPropertyValues(siteOneUrl, deniedUser.id, {
            [attributeFieldId as string]: 'Sales',
        });

        // # Create allowed user (Department: "Engineering") and add to team + channel
        ({user: allowedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'allowed'}));
        await Team.apiAddUserToTeam(siteOneUrl, allowedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, allowedUser.id, testChannel.id);
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

        // # Create a permission policy: Engineering can download files, Sales cannot
        const policyName = `abac-test-policy-${getRandomId()}`;
        const {policy, error: policyError} = await AccessControl.apiCreatePermissionPolicy(
            siteOneUrl,
            policyName,
            [{
                actions: ['download_file_attachment'],
                expression: `user.attributes.${attributeFieldName} == "Engineering"`,
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

        // # Allow cross-origin WebSocket connections for the Android emulator
        await System.apiPatchConfig(siteOneUrl, {
            ServiceSettings: {AllowCorsFrom: '*'},
        });

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
    });

    afterAll(async () => {
        // # Clean up the server first: a failing UI step must not leave the deny policy active on a
        // shared server. Then policy, attribute field (if created), team, users, and config.
        if (permissionPolicyId) {
            await AccessControl.apiDeletePermissionPolicy(siteOneUrl, permissionPolicyId);
        }
        if (attributeFieldCreated && attributeFieldId) {
            await AccessControl.apiDeleteCustomProfileAttributeField(siteOneUrl, attributeFieldId);
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
        await expect(element(by.id(`${fileId}-file`))).not.toExist();

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
        await waitFor(element(by.id(`${fileId}-file`))).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id('redacted-files-placeholder'))).not.toExist();
        await expect(element(by.id('unverified-files-placeholder'))).not.toExist();

        await ChannelScreen.back();
        await HomeScreen.logout();
    });
});
