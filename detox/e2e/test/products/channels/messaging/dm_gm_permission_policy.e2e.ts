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
import {Alert, ChannelAccessRevoked} from '@support/ui/component';
import {
    BrowseChannelsScreen,
    ChannelListScreen,
    ChannelScreen,
    FindChannelsScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {buildTapPayload, getRandomId, isAndroid, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

const ENGINEERING = 'Engineering';
const SALES = 'Sales';
const CONTRACTOR = 'Contractor';

const setDepartment = async (userId: string, fieldId: string, department: string) => {
    const {error} = await AccessControl.apiSetUserPropertyValues(siteOneUrl, userId, {[fieldId]: department});
    if (error) {
        throw new Error(`Failed to set the Department attribute: ${JSON.stringify(error)}`);
    }
};

const createUser = async (prefix: string, teamId: string, fieldId: string, department: string) => {
    const {user, error} = await User.apiCreateUser(siteOneUrl, {prefix});
    if (error || !user?.id) {
        throw new Error(`Failed to create the ${prefix} user: ${JSON.stringify(error)}`);
    }
    await Team.apiAddUserToTeam(siteOneUrl, user.id, teamId);
    await setDepartment(user.id, fieldId, department);
    return user;
};

// A conversation only shows in the sidebar once it has a post.
const createPost = async (channelId: string, message: string) => {
    const {post, error} = await Post.apiCreatePost(siteOneUrl, {channelId, message});
    if (error || !post?.id) {
        throw new Error(`Failed to create a post: ${JSON.stringify(error)}`);
    }
    return post;
};

describe('Messaging - DM/GM Permission Policy (ABAC)', () => {
    const serverOneDisplayName = 'Server 1';
    const directMessagesCategory = 'direct_messages';
    const dmGmWriteDeniedText = 'You do not have permission to send direct or group messages.';

    let testTeam: any;

    // Engineering: every action allowed. The partner of every conversation, and the poster while
    // the suite runs.
    let partnerUser: any;

    // Engineering, flipped to Contractor (Read denied) and back.
    let readerUser: any;

    // Sales: Read allowed, Write and Start denied.
    let salesUser: any;

    // Contractor: Read denied from login.
    let contractorUser: any;

    let readerDm: any;
    let readerGm: any;
    let salesDm: any;
    let contractorDm: any;
    let contractorDmPost: any;

    let permissionPolicyId: string | null = null;
    let attributeFieldId: string | null = null; // field UUID — used as the property values key
    let attributeFieldName: string | null = null; // field name  — used in CEL expressions
    let attributeFieldCreated = false; // true if this run created the field (must clean up)

    // Server settings this suite changes, restored as they were rather than to assumed defaults.
    let originalSettings: Record<string, any> = {};

    beforeAll(async () => {
        await User.apiAdminLogin(siteOneUrl);

        // # Require an Enterprise Advanced license: below it the server denies every ABAC decision
        await System.apiRequireLicense(siteOneUrl);
        const {license} = await System.apiGetClientLicense(siteOneUrl);
        if (license?.SkuShortName !== 'advanced') {
            throw new Error(`DM/GM permission policy tests need an Enterprise Advanced license, got ${license?.SkuShortName}`);
        }

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

        const {team} = await Setup.apiInit(siteOneUrl);
        testTeam = team;

        const fieldId = attributeFieldId as string;
        partnerUser = await createUser('partner', team.id, fieldId, ENGINEERING);
        readerUser = await createUser('reader', team.id, fieldId, ENGINEERING);
        salesUser = await createUser('sales', team.id, fieldId, SALES);
        contractorUser = await createUser('contractor', team.id, fieldId, CONTRACTOR);

        // # Create the conversations and their first posts while no policy is active: the policy
        // also applies to the admin, who has no Department and so is denied every DM/GM action.
        ({channel: readerDm} = await Channel.apiCreateDirectChannel(siteOneUrl, [readerUser.id, partnerUser.id]));
        ({channel: readerGm} = await Channel.apiCreateGroupChannel(siteOneUrl, [readerUser.id, partnerUser.id, salesUser.id]));
        ({channel: salesDm} = await Channel.apiCreateDirectChannel(siteOneUrl, [salesUser.id, partnerUser.id]));
        ({channel: contractorDm} = await Channel.apiCreateDirectChannel(siteOneUrl, [contractorUser.id, partnerUser.id]));
        if (!readerDm?.id || !readerGm?.id || !salesDm?.id || !contractorDm?.id) {
            throw new Error('Failed to create the direct and group messages');
        }
        await createPost(readerDm.id, `reader dm ${getRandomId()}`);
        await createPost(readerGm.id, `reader gm ${getRandomId()}`);
        await createPost(salesDm.id, `sales dm ${getRandomId()}`);
        contractorDmPost = await createPost(contractorDm.id, `contractor dm ${getRandomId()}`);

        // # Wait for the server-side attribute view to pick up the values (30s refresh gate)
        await wait(timeouts.HALF_MIN + timeouts.ONE_SEC);

        // # Create a permission policy: Engineering can do everything, Sales can only read, and
        // Contractor can do nothing. System permission policies are server-wide, so everyone
        // outside these departments is denied while this suite runs; afterAll deletes the policy
        // first.
        const department = `user.attributes.${attributeFieldName}`;
        const {policy, error: policyError} = await AccessControl.apiCreatePermissionPolicy(
            siteOneUrl,
            `abac-dm-gm-policy-${getRandomId()}`,
            [
                {
                    actions: ['dm_gm_start'],
                    expression: `${department} == "${ENGINEERING}"`,
                },
                {
                    actions: ['dm_gm_read_access'],
                    expression: `${department} == "${ENGINEERING}" || ${department} == "${SALES}"`,
                },
                {
                    actions: ['dm_gm_write_access'],
                    expression: `${department} == "${ENGINEERING}"`,
                },
            ],
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
        // shared server. A test may have left the API session on another user.
        await User.apiAdminLogin(siteOneUrl);
        if (permissionPolicyId) {
            await AccessControl.apiDeletePermissionPolicy(siteOneUrl, permissionPolicyId);
        }
        if (attributeFieldCreated && attributeFieldId) {
            await AccessControl.apiDeleteCustomProfileAttributeField(siteOneUrl, attributeFieldId);
        }
        if (testTeam?.id) {
            await Team.apiDeleteTeam(siteOneUrl, testTeam.id);
        }
        for (const user of [partnerUser, readerUser, salesUser, contractorUser]) {
            if (user?.id) {
                // eslint-disable-next-line no-await-in-loop -- sequential cleanup
                await User.apiDeactivateUser(siteOneUrl, user.id);
            }
        }
        await System.apiPatchConfig(siteOneUrl, originalSettings);
    });

    it('MM-TXXXX_1 - should hide direct and group messages when read is denied and restore them with their unread count', async () => {
        // # Log in as the reader (Engineering) and open the direct message
        await LoginScreen.login(readerUser);
        await ChannelListScreen.toBeVisible();
        await ChannelListScreen.ensureCategoryExpanded(directMessagesCategory);
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, readerDm.name)).toBeVisible().withTimeout(timeouts.HALF_MIN);
        await ChannelScreen.open(directMessagesCategory, readerDm.name);

        // # Change the reader's attribute so the policy denies reading
        await setDepartment(readerUser.id, attributeFieldId as string, CONTRACTOR);

        // * The conversation closes with the "Messages unavailable" sheet. The server's attribute
        // view refreshes on a 30s gate, which the app's delayed re-check is built to outlast.
        await ChannelAccessRevoked.toBeVisible(timeouts.ONE_MIN);
        await expect(ChannelAccessRevoked.title).toHaveText('Messages unavailable');
        await ChannelAccessRevoked.dismiss();

        // * The direct messages category and its conversations are gone
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.getCategoryHeaderDisplayName(directMessagesCategory)).not.toExist();
        await expect(ChannelListScreen.getChannelItem(directMessagesCategory, readerDm.name)).not.toExist();
        await expect(ChannelListScreen.getChannelItem(directMessagesCategory, readerGm.name)).not.toExist();

        // # The partner posts in the direct message while it is hidden
        const {error: loginError} = await User.apiLogin(siteOneUrl, partnerUser);
        if (loginError) {
            throw new Error(`Failed to log in as the partner: ${JSON.stringify(loginError)}`);
        }
        await createPost(readerDm.id, `while hidden ${getRandomId()}`);
        await User.apiAdminLogin(siteOneUrl);

        // # Restore the attribute so the policy allows reading again
        await setDepartment(readerUser.id, attributeFieldId as string, ENGINEERING);

        // * Both conversations return, and the direct message carries the post made while hidden
        await waitFor(ChannelListScreen.getCategoryHeaderDisplayName(directMessagesCategory)).toExist().withTimeout(timeouts.ONE_MIN);
        await ChannelListScreen.ensureCategoryExpanded(directMessagesCategory);
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, readerDm.name)).toBeVisible().withTimeout(timeouts.HALF_MIN);
        await expect(ChannelListScreen.getChannelItem(directMessagesCategory, readerGm.name)).toExist();
        const badge = ChannelListScreen.getChannelItemBadge(directMessagesCategory, readerDm.name);
        await waitFor(badge).toExist().withTimeout(timeouts.TEN_SEC);
        await expect(badge).toHaveText('1');

        await HomeScreen.logout();
    });

    it('MM-TXXXX_2 - should show the read-only composer in direct and group messages when write is denied', async () => {
        // # Log in as the Sales user (Read allowed, Write denied) and open the direct message
        await LoginScreen.login(salesUser);
        await ChannelListScreen.toBeVisible();
        await ChannelListScreen.ensureCategoryExpanded(directMessagesCategory);
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, salesDm.name)).toBeVisible().withTimeout(timeouts.HALF_MIN);
        await ChannelScreen.open(directMessagesCategory, salesDm.name);

        // * The composer is replaced by the read-only notice with the DM/GM text
        await waitFor(ChannelScreen.postDraftReadOnly).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelScreen.postDraftReadOnlyText).toHaveText(dmGmWriteDeniedText);
        await expect(ChannelScreen.postInput).not.toExist();
        await ChannelScreen.back();

        // # Open the group message
        await ChannelScreen.open(directMessagesCategory, readerGm.name);

        // * The group message is read-only too
        await waitFor(ChannelScreen.postDraftReadOnly).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelScreen.postDraftReadOnlyText).toHaveText(dmGmWriteDeniedText);
        await ChannelScreen.back();

        await HomeScreen.logout();
    });

    it('MM-TXXXX_3 - should hide the start affordances when start is denied and still open an existing direct message', async () => {
        // # Log in as the Sales user (Start denied, Read allowed)
        await LoginScreen.login(salesUser);
        await ChannelListScreen.toBeVisible();

        // # Open the plus menu
        await ChannelListScreen.headerPlusButton.tap();
        await waitFor(ChannelListScreen.browseChannelsItem).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * The menu is up, but has no "Open a direct message" item
        await expect(ChannelListScreen.openDirectMessageItem).not.toExist();

        // # Leave the menu through Browse channels
        await ChannelListScreen.browseChannelsItem.tap();
        await BrowseChannelsScreen.toBeVisible();
        await BrowseChannelsScreen.close();

        // # Open Find channels
        await FindChannelsScreen.open();

        // * The quick options are up, but have no "Open a DM" option
        await waitFor(FindChannelsScreen.directoryQuickOption).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(FindChannelsScreen.openDirectMessageQuickOption).not.toExist();
        await FindChannelsScreen.close();

        // # Open the existing direct message
        await ChannelListScreen.ensureCategoryExpanded(directMessagesCategory);
        await waitFor(ChannelListScreen.getChannelItemDisplayName(directMessagesCategory, salesDm.name)).toBeVisible().withTimeout(timeouts.HALF_MIN);
        await ChannelScreen.open(directMessagesCategory, salesDm.name);

        // * Reopening an existing conversation is governed by Read, so it opens
        await expect(ChannelScreen.channelScreen).toBeVisible();
        await ChannelScreen.back();

        await HomeScreen.logout();
    });

    it('MM-TXXXX_4 - should not open a direct message from a push notification when read is denied', async () => {
        // # Log in as the Contractor user (Read denied)
        await LoginScreen.login(contractorUser);
        await ChannelListScreen.toBeVisible();

        // * No direct or group messages are shown
        await expect(ChannelListScreen.getCategoryHeaderDisplayName(directMessagesCategory)).not.toExist();

        // # Send the app to the background and tap a notification for the direct message. A push
        // without a team is a direct or group message.
        if (isAndroid()) {
            await device.sendToHome();
        }
        await device.launchApp({
            newInstance: isAndroid(),
            userNotification: buildTapPayload({
                serverUrl: serverOneUrl,
                channelId: contractorDm.id,
                teamId: '',
                postId: contractorDmPost.id,
                senderName: partnerUser.username,
                message: contractorDmPost.message,
            }),
        });

        // * The no-access alert shows instead of the conversation
        await waitFor(Alert.messageNotFoundTitle).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(Alert.noDmGmAccessMessage).toBeVisible();
        await Alert.okButton.tap();

        // * The app stays on the channel list and the direct message did not open
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.getChannelItem(directMessagesCategory, contractorDm.name)).not.toExist();
        await expect(ChannelScreen.channelScreen).not.toExist();

        await HomeScreen.logout();
    });
});
