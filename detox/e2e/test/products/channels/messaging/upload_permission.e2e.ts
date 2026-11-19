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
import {timeouts, wait} from '@support/utils';
import {allOrFirstError} from '@support/utils/converge';
import {expect} from 'detox';

const UPLOAD_ACTION = 'upload_file_attachment';

describe('Messaging - Upload Permission (ABAC)', () => {
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

        // # Require an Enterprise Advanced license: below it the server denies every ABAC decision
        await System.apiRequireLicense(siteOneUrl);
        const {license} = await System.apiGetClientLicense(siteOneUrl);
        if (license?.SkuShortName !== 'advanced') {
            throw new Error(`Upload permission tests need an Enterprise Advanced license, got ${license?.SkuShortName}`);
        }

        // # ABAC, user-managed attributes and the Department attribute come from provisioning
        await assertAbacBaseline(siteOneUrl);
        const department = await getProvisionedDepartmentField(siteOneUrl);
        departmentFieldId = department.id;

        const {team} = await Setup.apiInit(siteOneUrl);
        testTeam = team;

        testChannel = await createAbacChannel(siteOneUrl, team.id, 'abac-upload');

        // # Create the denied and allowed users and add them to team + channel
        deniedUser = await createChannelMember(siteOneUrl, team.id, testChannel.id, 'denied');
        allowedUser = await createChannelMember(siteOneUrl, team.id, testChannel.id, 'allowed');

        // # In this channel only, Engineering can upload files and Sales cannot
        const {policy, error: policyError} = await AccessControl.apiCreateChannelPermissionPolicy(
            siteOneUrl,
            testChannel.id,
            [{
                name: 'abac-upload',
                role: 'channel_user',
                actions: ['upload_file_attachment'],
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
            convergeDepartment(siteOneUrl, deniedUser, departmentFieldId, 'Sales', testChannel.id, UPLOAD_ACTION, false, timeouts.TWO_MIN),
            convergeDepartment(siteOneUrl, allowedUser, departmentFieldId, 'Engineering', testChannel.id, UPLOAD_ACTION, true, timeouts.TWO_MIN),
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

    it('MM-68219_3 - should disable the attachment button when the policy denies uploads in the channel', async () => {
        // # Log in as the denied user (Department: Sales) and open the channel
        await LoginScreen.login(deniedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * The attachment button is present but disabled
        await waitFor(ChannelScreen.attachmentActionDisabled).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await expect(ChannelScreen.attachmentAction).not.toExist();

        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-68219_4 - should keep the attachment button enabled when the policy allows uploads', async () => {
        // # Log in as the allowed user (Department: Engineering) and open the channel
        await LoginScreen.login(allowedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        // * The decision is fetched on open; the button must stay usable once it lands
        await waitFor(ChannelScreen.attachmentAction).
            toExist().
            withTimeout(timeouts.TEN_SEC);
        await wait(timeouts.FIVE_SEC);
        await expect(ChannelScreen.attachmentAction).toExist();
        await expect(ChannelScreen.attachmentActionDisabled).not.toExist();

        await ChannelScreen.back();
        await HomeScreen.logout();
    });

    it('MM-68219_5 - should enable the attachment button without reopening the channel once the user attribute satisfies the policy', async () => {
        // # Start from a server-side deny. A first attempt has it from beforeAll; an in-place retry
        // follows an attempt that granted the user and only restored the attribute at the end.
        await convergeDepartment(siteOneUrl, deniedUser, departmentFieldId, 'Sales', testChannel.id, UPLOAD_ACTION, false);

        // # Log in as the denied user and open the channel
        await LoginScreen.login(deniedUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);
        await waitFor(ChannelScreen.attachmentActionDisabled).
            toExist().
            withTimeout(timeouts.TEN_SEC);

        let grantError: unknown;
        try {
            // # Change the user's attribute so the policy grants uploads, and wait until the server
            // itself grants them: until then no client can enable the button.
            await convergeDepartment(siteOneUrl, deniedUser, departmentFieldId, 'Engineering', testChannel.id, UPLOAD_ACTION, true);

            // # Save the value once more. Its attribute event is what the app re-checks on, and the
            // server now answers it from the new value; the first event may have been answered from
            // a stale cached subject (server defect, see convergeDepartment).
            // TODO: drop this save with convergeDepartment's reassert once the server is fixed.
            await setDepartment(siteOneUrl, deniedUser.id, departmentFieldId, 'Engineering');

            // * The button re-enables without reopening the channel
            await waitFor(ChannelScreen.attachmentAction).
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
                console.warn('[upload_permission] restore cleanup failed:', cleanupError); // eslint-disable-line no-console
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
