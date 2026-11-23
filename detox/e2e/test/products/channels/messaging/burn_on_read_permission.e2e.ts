// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    assertAbacBaseline,
    convergeDepartment,
    createAbacChannel,
    createChannelMember,
    getProvisionedDepartmentField,
    setDepartment,
} from '@support/abac_test_helper';
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
import {allOrFirstError} from '@support/utils/converge';
import {expect} from 'detox';

// Skipped on servers without burn-on-read permission policies.
const describeOrSkip = serverSupportsPolicyAction('create_burn_on_read_post') ? describe : describe.skip;

const BOR_ACTION = 'create_burn_on_read_post';

describeOrSkip('Messaging - Burn-on-Read Permission (ABAC)', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';

    let testChannel: any;
    let controlChannel: any;
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

        testChannel = await createAbacChannel(siteOneUrl, team.id, 'abac-bor');
        controlChannel = await createAbacChannel(siteOneUrl, team.id, 'abac-bor-control');

        // # Create the denied and allowed users and add them to team + channel
        deniedUser = await createChannelMember(siteOneUrl, team.id, testChannel.id, 'denied');
        const controlMembership = await Channel.apiAddUserToChannel(siteOneUrl, deniedUser.id, controlChannel.id);
        if (controlMembership.error) {
            throw new Error(`Failed to add the denied user to the control channel: ${JSON.stringify(controlMembership.error)}`);
        }
        allowedUser = await createChannelMember(siteOneUrl, team.id, testChannel.id, 'allowed');

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

        // # Set each user's Department and wait until the server itself decides as the policy says
        await allOrFirstError([
            convergeDepartment(siteOneUrl, deniedUser, departmentFieldId, 'Sales', testChannel.id, BOR_ACTION, false, timeouts.TWO_MIN),
            convergeDepartment(siteOneUrl, allowedUser, departmentFieldId, 'Engineering', testChannel.id, BOR_ACTION, true, timeouts.TWO_MIN),
        ]);

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

        // * The burn-on-read control appears once the allow decision lands. Same decision fetch
        // as MM-70693_2's grant wait, so use its ONE_MIN budget: on a loaded shard the decision
        // took longer than TEN_SEC in run 41768017254 and this test timed out waiting for it.
        await waitFor(ChannelScreen.borAction).
            toExist().
            withTimeout(timeouts.ONE_MIN);
    });

    it('MM-70693_2 - should scope the denied control to the policy channel and show it there after a live attribute change', async () => {
        // # Start from a server-side deny. A first attempt has it from beforeAll; an in-place retry
        // follows an attempt that granted the user and only restored the attribute at the end.
        await convergeDepartment(siteOneUrl, deniedUser, departmentFieldId, 'Sales', testChannel.id, BOR_ACTION, false);

        // # Log in as the denied user
        await LoginScreen.login(deniedUser);
        await ChannelListScreen.toBeVisible();

        // * The control remains available in a channel without the policy
        await ChannelScreen.open(channelsCategory, controlChannel.name);
        await waitFor(ChannelScreen.borAction).
            toExist().
            withTimeout(timeouts.ONE_MIN);
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

        let grantError: unknown;
        try {
            // # Change the user's attribute so the policy grants burn-on-read, and wait until the
            // server itself grants it: until then no client can show the control.
            await convergeDepartment(siteOneUrl, deniedUser, departmentFieldId, 'Engineering', testChannel.id, BOR_ACTION, true);

            // # Save the value once more. Its attribute event is what the app re-checks on, and the
            // server now answers it from the new value; the first event may have been answered from
            // a stale cached subject (server defect, see convergeDepartment).
            // TODO: drop this save with convergeDepartment's reassert once the server is fixed.
            await setDepartment(siteOneUrl, deniedUser.id, departmentFieldId, 'Engineering');

            // * The control appears without reopening the channel
            await waitFor(ChannelScreen.borAction).
                toExist().
                withTimeout(timeouts.ONE_MIN);
        } catch (error) {
            grantError = error;
        }

        // # Restore the attribute so the suite leaves the user as it found it. Do not wait for the
        // deny to land: it can take minutes, which this test's 300s budget does not have after
        // login and the grant wait. A retry waits for it at the start instead. A cleanup failure
        // must not replace an error from the grant wait above.
        try {
            await setDepartment(siteOneUrl, deniedUser.id, departmentFieldId, 'Sales');
        } catch (cleanupError) {
            if (grantError) {
                console.warn('[burn_on_read_permission] restore cleanup failed:', cleanupError); // eslint-disable-line no-console
            } else {
                throw cleanupError;
            }
        } finally {
            // # Return to the channel list, then log out so no cached grant decision survives into the next test or retry
            try {
                await ChannelScreen.back();
            } catch {
                // Best effort: the logout below is the cleanup that must run.
            }
            await HomeScreen.logout();
        }

        if (grantError) {
            throw grantError;
        }
    });
});
