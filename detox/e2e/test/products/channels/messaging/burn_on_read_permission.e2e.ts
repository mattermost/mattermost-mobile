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

const setDepartment = async (userId: string, fieldId: string, department: string) => {
    const {error} = await AccessControl.apiSetUserPropertyValues(siteOneUrl, userId, {[fieldId]: department});
    if (error) {
        throw new Error(`Failed to set the Department attribute: ${JSON.stringify(error)}`);
    }
};

describe('Messaging - Burn-on-Read Permission (ABAC)', () => {
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

    // Server settings this suite changes, restored as they were rather than to assumed defaults.
    let originalSettings: Record<string, any> = {};

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);

        // # Require an Enterprise Advanced license: it gates both burn-on-read and ABAC
        await System.apiRequireLicense(siteOneUrl);
        const {license} = await System.apiGetClientLicense(siteOneUrl);
        if (license?.SkuShortName !== 'advanced') {
            throw new Error(`Burn-on-read permission tests need an Enterprise Advanced license, got ${license?.SkuShortName}`);
        }

        const {config: originalConfig} = await System.apiGetConfig(siteOneUrl);
        originalSettings = {
            FeatureFlags: {
                AttributeBasedAccessControl: originalConfig?.FeatureFlags?.AttributeBasedAccessControl,
                PermissionPolicies: originalConfig?.FeatureFlags?.PermissionPolicies,
                BurnOnRead: originalConfig?.FeatureFlags?.BurnOnRead,
            },
            AccessControlSettings: {
                EnableAttributeBasedAccessControl: originalConfig?.AccessControlSettings?.EnableAttributeBasedAccessControl,
                EnableUserManagedAttributes: originalConfig?.AccessControlSettings?.EnableUserManagedAttributes,
            },
            ServiceSettings: {
                EnableBurnOnRead: originalConfig?.ServiceSettings?.EnableBurnOnRead,
                AllowCorsFrom: originalConfig?.ServiceSettings?.AllowCorsFrom,
            },
            PasswordSettings: {MinimumLength: originalConfig?.PasswordSettings?.MinimumLength},
        };

        // # Relax password policy for test users
        await System.apiPatchConfig(siteOneUrl, {
            PasswordSettings: {MinimumLength: 8},
        });

        // # Enable ABAC, PermissionPolicies and burn-on-read
        await System.apiUpdateConfig(siteOneUrl, {
            FeatureFlags: {AttributeBasedAccessControl: true, PermissionPolicies: true, BurnOnRead: true},
        });
        const {error: abacError} = await AccessControl.apiEnableABAC(siteOneUrl);
        if (abacError) {
            throw new Error(`Failed to enable ABAC: ${JSON.stringify(abacError)}`);
        }
        await System.apiPatchConfig(siteOneUrl, {
            ServiceSettings: {EnableBurnOnRead: true},
        });

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

        const {team} = await Setup.apiInit(siteOneUrl);
        testTeam = team;

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'abac-bor',
        });
        testChannel = channel;

        // # Create denied user (Department: "Sales") and add to team + channel
        ({user: deniedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'denied'}));
        await Team.apiAddUserToTeam(siteOneUrl, deniedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, testChannel.id);
        await setDepartment(deniedUser.id, attributeFieldId as string, 'Sales');

        // # Create allowed user (Department: "Engineering") and add to team + channel
        ({user: allowedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'allowed'}));
        await Team.apiAddUserToTeam(siteOneUrl, allowedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, allowedUser.id, testChannel.id);
        await setDepartment(allowedUser.id, attributeFieldId as string, 'Engineering');

        // # Wait for the server-side attribute view to pick up the values (30s refresh gate)
        await wait(timeouts.HALF_MIN + timeouts.ONE_SEC);

        // # Create a permission policy: Engineering may compose burn-on-read posts, Sales may not.
        // System permission policies are server-wide, so burn-on-read is restricted for users outside
        // Engineering while this suite runs; afterAll deletes the policy first.
        const {policy, error: policyError} = await AccessControl.apiCreatePermissionPolicy(
            siteOneUrl,
            `abac-bor-policy-${getRandomId()}`,
            [{
                actions: ['create_burn_on_read_post'],
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
    });

    it('MM-70693_1 - should show the burn-on-read control when the policy allows it', async () => {
        // # Log in as the allowed user (Department: Engineering) and open the channel
        await LoginScreen.login(allowedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * The control is withheld until a decision lands, so its appearance is itself proof the
        // allow arrived — unlike the upload tests, there is no pre-decision state to wait past.
        await waitFor(ChannelScreen.borAction).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-70693_2 - should withhold the control for a denied user and show it without reopening the channel once their attribute satisfies the policy', async () => {
        // # Log in as the denied user and open the channel
        await LoginScreen.login(deniedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await waitFor(ChannelScreen.attachmentAction).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(ChannelScreen.borAction).not.toExist();

        // # Change the user's attribute so the policy now grants burn-on-read
        await setDepartment(deniedUser.id, attributeFieldId as string, 'Engineering');

        // * The control appears on its own. The server's attribute view refreshes on a 30s gate,
        // which the app's delayed re-check is built to outlast.
        await waitFor(ChannelScreen.borAction).
            toExist().
            withTimeout(timeouts.ONE_MIN);

        // # Restore the attribute so the suite leaves the user as it found it
        await setDepartment(deniedUser.id, attributeFieldId as string, 'Sales');

        await ChannelScreen.back();
        await HomeScreen.logout();
    });
});
