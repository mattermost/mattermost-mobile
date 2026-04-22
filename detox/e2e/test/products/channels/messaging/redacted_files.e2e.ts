// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    AccessControl,
    Channel,
    File,
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
    AccountScreen,
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {expect} from 'detox';

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

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);

        // # Require Enterprise license
        await System.apiRequireLicense(siteOneUrl);

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

        const {fileId, error: uploadError} = await File.apiUploadFileToChannel(
            siteOneUrl,
            testChannel.id,
            'test_attachment.txt',
            `ABAC redacted files test - ${getRandomId()}`,
        );
        if (uploadError) {
            throw new Error(`File upload failed: ${JSON.stringify(uploadError)}`);
        }

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
        await LoginScreen.login(deniedUser);
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        await HomeScreen.logout();

        // # Clean up: policy, attribute field (if created), team, users, restore config
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
        await AccessControl.apiDisableABAC(siteOneUrl);
        await System.apiUpdateConfig(siteOneUrl, {
            FeatureFlags: {AttributeBasedAccessControl: false, PermissionPolicies: false},
        });
        await System.apiPatchConfig(siteOneUrl, {
            AccessControlSettings: {EnableUserManagedAttributes: false},
            PasswordSettings: {MinimumLength: 14},
            ServiceSettings: {AllowCorsFrom: ''},
        });
    });

    it('MM-68219_1 - should show redacted files placeholder when user attribute does not satisfy the policy', async () => {
        // # Open channel as denied user (Department: Sales)
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Sales user does not satisfy the policy — placeholder is shown
        await waitFor(element(by.id('redacted-files-placeholder'))).
            toBeVisible().
            withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.back();
    });

    it('MM-68219_2 - should not show redacted placeholder when user attribute satisfies the policy', async () => {
        // # Dismiss LogBox if present — covers the tab bar in debug builds with stale Metro cache.
        // No-op in CI where RUNNING_E2E=true is compiled in and LogBox is suppressed.
        try {
            await waitFor(element(by.text('Open debugger to view warnings.'))).toBeVisible().withTimeout(timeouts.ONE_SEC);
            await element(by.text('Open debugger to view warnings.')).tap();
            await waitFor(element(by.text('Dismiss'))).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await element(by.text('Dismiss')).tap();
        } catch {
            // No LogBox present, continue
        }

        // # Switch to allowed user (Department: Engineering)
        await AccountScreen.open();
        await AccountScreen.logout();
        await LoginScreen.login(allowedUser);

        // # Open the same channel
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * Engineering user satisfies the policy — no placeholder
        await expect(element(by.id('redacted-files-placeholder'))).not.toExist();

        await ChannelScreen.back();
    });
});
