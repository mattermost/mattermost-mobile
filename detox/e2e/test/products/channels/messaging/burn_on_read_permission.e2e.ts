// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {assertAbacBaseline, getProvisionedDepartmentField, setDepartment} from '@support/abac_test_helper';
import {
    AccessControl,
    Channel,
    Setup,
    System,
    Team,
    User,
} from '@support/server_api';
import {assertServerBaseline} from '@support/server_baseline';
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
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

// Skipped on servers without burn-on-read permission policies.
const describeOrSkip = serverSupportsPolicyAction('create_burn_on_read_post') ? describe : describe.skip;

describeOrSkip('Messaging - Burn-on-Read Permission (ABAC)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    let testChannel: any;
    let testTeam: any;
    let deniedUser: any;
    let allowedUser: any;
    let permissionPolicyId: string | null = null;
    let departmentFieldId = '';

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);

        // # Require an Enterprise Advanced license: it gates both burn-on-read and ABAC
        await System.apiRequireLicense(siteOneUrl);
        const {license} = await System.apiGetClientLicense(siteOneUrl);
        if (license?.SkuShortName !== 'advanced') {
            throw new Error(`Burn-on-read permission tests need an Enterprise Advanced license, got ${license?.SkuShortName}`);
        }

        // # ABAC, burn-on-read and the Department attribute come from provisioning
        await assertAbacBaseline(siteOneUrl);
        await assertServerBaseline(siteOneUrl, ['FeatureFlags.BurnOnRead', 'ServiceSettings.EnableBurnOnRead']);
        const department = await getProvisionedDepartmentField(siteOneUrl);
        departmentFieldId = department.id;

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
        await setDepartment(siteOneUrl, deniedUser.id, department.id, 'Sales');

        // # Create allowed user (Department: "Engineering") and add to team + channel
        ({user: allowedUser} = await User.apiCreateUser(siteOneUrl, {prefix: 'allowed'}));
        await Team.apiAddUserToTeam(siteOneUrl, allowedUser.id, team.id);
        await Channel.apiAddUserToChannel(siteOneUrl, allowedUser.id, testChannel.id);
        await setDepartment(siteOneUrl, allowedUser.id, department.id, 'Engineering');

        // # Wait for the server-side attribute view to pick up the values (30s refresh gate)
        await wait(timeouts.HALF_MIN + timeouts.ONE_SEC);

        // # In this channel only, Engineering may compose burn-on-read posts and Sales may not
        const {policy, error: policyError} = await AccessControl.apiCreateChannelPermissionPolicy(
            siteOneUrl,
            testChannel.id,
            [{
                name: 'abac-bor',
                role: 'channel_user',
                actions: ['create_burn_on_read_post'],
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

    it('MM-70693_2 - should withhold the control for a denied user and show it without reopening the channel once their attribute satisfies the policy', async () => {
        // # Log in as the denied user and open the channel
        await LoginScreen.login(deniedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await waitFor(ChannelScreen.attachmentAction).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        // * The control stays hidden once the deny decision lands. It is also hidden while the
        // decision is pending, so give the request time to return before checking.
        await wait(timeouts.FIVE_SEC);
        await expect(ChannelScreen.borAction).not.toExist();

        // # Change the user's attribute so the policy now grants burn-on-read
        await setDepartment(siteOneUrl, deniedUser.id, departmentFieldId, 'Engineering');

        // * The control appears on its own. The server's attribute view refreshes on a 30s gate,
        // which the app's delayed re-check is built to outlast.
        await waitFor(ChannelScreen.borAction).
            toExist().
            withTimeout(timeouts.ONE_MIN);

        // # Restore the attribute so the suite leaves the user as it found it
        await setDepartment(siteOneUrl, deniedUser.id, departmentFieldId, 'Sales');
    });
});
