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
    serverSupportsPolicyAction,
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

// Skipped on servers without burn-on-read permission policies.
const describeOrSkip = serverSupportsPolicyAction('create_burn_on_read_post') ? describe : describe.skip;

describeOrSkip('Messaging - Burn-on-Read Permission (ABAC)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    let testChannel: any;
    let controlChannel: any;
    let testTeam: any;
    let deniedUser: any;
    let allowedUser: any;
    let attributeFieldId: string | null = null; // field UUID — used as the property values key
    let attributeFieldName: string | null = null; // field name  — used in CEL expressions

    // Non-ABAC server settings this suite changes, restored as they were rather than to assumed defaults.
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

        // # Enable ABAC, channel permission policies and burn-on-read without resetting other flags
        const {error: flagsError} = await System.apiEnableFeatureFlags(siteOneUrl, [
            'AttributeBasedAccessControl',
            'PermissionPolicies',
            'ChannelPermissionPolicies',
            'BurnOnRead',
        ]);
        if (flagsError) {
            throw new Error(`Failed to enable the feature flags: ${JSON.stringify(flagsError)}`);
        }
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

        const {team} = await Setup.apiInit(siteOneUrl);
        testTeam = team;

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'abac-bor',
        });
        testChannel = channel;
        ({channel: controlChannel} = await Channel.apiCreateChannel(siteOneUrl, {
            teamId: team.id,
            type: 'O',
            prefix: 'abac-bor-control',
        }));

        // # Create denied user (Department: "Sales") and add to the policy and control channels
        ({user: deniedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'denied'}));
        await Team.apiAddUserToTeam(siteOneUrl, deniedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, testChannel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, controlChannel.id);
        await setDepartment(deniedUser.id, attributeFieldId as string, 'Sales');

        // # Create allowed user (Department: "Engineering") and add to the policy and control channels
        ({user: allowedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'allowed'}));
        await Team.apiAddUserToTeam(siteOneUrl, allowedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, allowedUser.id, testChannel.id);
        await Channel.apiAddUserToChannel(siteOneUrl, allowedUser.id, controlChannel.id);
        await setDepartment(allowedUser.id, attributeFieldId as string, 'Engineering');

        // # Wait for the server-side attribute view to pick up the values (30s refresh gate)
        await wait(timeouts.HALF_MIN + timeouts.ONE_SEC);

        // # Scope the burn-on-read policy to this suite's channel
        const {error: policyError} = await AccessControl.apiCreateChannelPermissionPolicy(
            siteOneUrl,
            testChannel.id,
            [{
                actions: ['create_burn_on_read_post'],
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
    });

    afterEach(async () => {
        // A failed assertion skips the in-test cleanup; leave the next test at the login screen.
        try {
            await expect(ChannelScreen.channelScreen).toBeVisible();
            await ChannelScreen.back();
        } catch {
            // Not in a channel
        }
        await HomeScreen.logout();
    });

    it('MM-70693_1 - should show the burn-on-read control when the policy allows it', async () => {
        // # Log in as the allowed user (Department: Engineering) and open the channel
        await LoginScreen.login(allowedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * The burn-on-read control appears once the allow decision lands
        await waitFor(ChannelScreen.borAction).
            toExist().
            withTimeout(timeouts.TEN_SEC);
    });

    it('MM-70693_2 - should scope the denied control to the policy channel and show it there after a live attribute change', async () => {
        // # Log in as the denied user
        await LoginScreen.login(deniedUser);
        await ChannelListScreen.toBeVisible();

        // * The control remains available in a channel without the policy
        await ChannelScreen.open(channelsCategory, controlChannel.name);
        await waitFor(ChannelScreen.borAction).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await ChannelScreen.back();

        // # Open the channel governed by the policy
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await waitFor(ChannelScreen.attachmentAction).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        // * The control stays hidden once the deny decision lands. It is also hidden while the
        // decision is pending, so give the request time to return before checking.
        await wait(timeouts.FIVE_SEC);
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
    });
});
