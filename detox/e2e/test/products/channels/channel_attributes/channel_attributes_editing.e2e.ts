// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {setChannelAttributesRequired} from '@support/channel_attributes_test_helper';
import {Channel, Properties, Team, User} from '@support/server_api';
import {assertServerBaseline} from '@support/server_baseline';
import {canMutateServer, requireMutationServer} from '@support/server_role';
import {hasChannelAttributes, serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelAttributeLabels, ChannelInfoAttributes} from '@support/ui/component';
import {ChannelInfoScreen, ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {device, expect, waitFor} from 'detox';

jest.setTimeout(timeouts.ONE_MIN * 30);

// Server model.IsValidId requires exactly 26 alphanumeric characters.
const OPTION_IDS = {
    low: 'editlow00000000000000000000'.slice(0, 26),
    medium: 'editmedium000000000000000000'.slice(0, 26),
    high: 'edithigh0000000000000000000'.slice(0, 26),
} as const;

// Rank ascends with sensitivity: raise_only allows low -> high, refuses high -> low.
const FIELD_OPTIONS = [
    {id: OPTION_IDS.low, name: 'LOW', color: '#00AA00', rank: 1},
    {id: OPTION_IDS.medium, name: 'MEDIUM', color: '#FFA500', rank: 2},
    {id: OPTION_IDS.high, name: 'HIGH', color: '#FF0000', rank: 3},
];

// Shared servers only allow optional fields named <name>_<6 hex> (see server_api/pool_guard.ts).
const FIELD_SUFFIX = getRandomId(6);
const FIELD_NAME = `editable_${FIELD_SUFFIX}`;

// The app only explains a permission lock when another row is editable (shouldShowLockReason),
// so MM-T6322_* add this always-editable sibling.
const SIBLING_FIELD_NAME = `sibling_${FIELD_SUFFIX}`;
const ALL_FIELD_NAMES = [FIELD_NAME, SIBLING_FIELD_NAME];

const DISPLAY_ACTIONS = ['display_label_info', 'display_label_header'];

// Detox's expect only takes elements, so plain values are checked by hand.
function assertStoredValue(stored: unknown, expected: string) {
    if (stored !== expected) {
        throw new Error(`Expected the server to hold "${expected}" for ${FIELD_NAME}, got ${JSON.stringify(stored)}`);
    }
}

function assertStoredValueUnset(stored: unknown) {
    if (stored !== null && stored !== '' && stored !== undefined) {
        throw new Error(`Expected the server to hold no value for ${FIELD_NAME}, got ${JSON.stringify(stored)}`);
    }
}

async function openChannel(channelName: string) {
    await waitFor(ChannelListScreen.headerTeamDisplayName).toExist().withTimeout(timeouts.TEN_SEC * 3);
    await wait(timeouts.TWO_SEC);
    await ChannelScreen.open('channels', channelName);
}

// Required attributes are server-wide, so this spec runs alone on the mutation server.
// Skipped below v12.0, where FeatureFlagChannelAttributes does not exist.
(hasChannelAttributes ? describe : describe.skip)('Channel Attributes - Setting values from Channel Info', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;
    let testChannel: any = null;

    beforeAll(async () => {
        requireMutationServer('channel_attributes_editing');

        // An interrupted run may have left a required field that blocks channel creation.
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, ALL_FIELD_NAMES);
        await assertServerBaseline(siteOneUrl, ['FeatureFlags.ChannelAttributes']);
        await setChannelAttributesRequired(siteOneUrl, true);

        const {team} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'team'});
        testTeam = team;
        const {user} = await User.apiCreateUser(siteOneUrl, {prefix: 'user'});
        testUser = user;
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeam.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        let cleanupError: unknown;
        try {
            await Properties.apiCleanupChannelAttributeFields(siteOneUrl, ALL_FIELD_NAMES);
        } catch (error) {
            cleanupError ??= error;
        }

        if (canMutateServer) {
            try {
                await setChannelAttributesRequired(siteOneUrl, false);
            } catch (error) {
                cleanupError ??= error;
            }
        }

        try {
            await HomeScreen.logout();
        } catch (error) {
            cleanupError ??= error;
        }

        if (cleanupError) {
            throw cleanupError;
        }
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        let cleanupError: unknown;
        if (testChannel) {
            const result = await Channel.apiDeleteChannel(siteOneUrl, testChannel.id);
            if (result.error) {
                cleanupError = new Error(`Failed to delete test channel: ${JSON.stringify(result.error)}`);
            }
            testChannel = null;
        }
        try {
            await Properties.apiCleanupChannelAttributeFields(siteOneUrl, ALL_FIELD_NAMES);
        } catch (error) {
            cleanupError ??= error;
        }

        if (cleanupError) {
            throw cleanupError;
        }
    });

    // permissionValues defaults to 'member' so a plain channel member can edit; the production
    // 'admin' tier is covered as a denial.
    async function setupChannelWithAttribute(opts: {
        changePolicy?: 'any' | 'raise_only' | 'lower_only' | 'never';
        permissionValues?: 'none' | 'sysadmin' | 'admin' | 'member';
        value?: string;
        required?: boolean;
        withEditableSibling?: boolean;
    } = {}) {
        // Created optional: a required field would block apiCreateChannel below. It is made
        // required once the channel exists.
        const {channelFieldId} = await Properties.apiSetupChannelAttributeField(siteOneUrl, {
            fieldName: FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            changePolicy: opts.changePolicy,
            permissionValues: opts.permissionValues ?? 'member',
            required: false,
        });

        let siblingFieldId: string | undefined;
        if (opts.withEditableSibling) {
            // Optional at creation for the same reason as above.
            ({channelFieldId: siblingFieldId} = await Properties.apiSetupChannelAttributeField(siteOneUrl, {
                fieldName: SIBLING_FIELD_NAME,
                options: FIELD_OPTIONS,
                actions: DISPLAY_ACTIONS,
                permissionValues: 'member',
                required: false,
            }));
        }

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
        if (!channel) {
            throw new Error('setupChannelWithAttribute failed to create its channel');
        }
        testChannel = channel;
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

        // testUser joins as a plain member; promote to channel admin.
        await Channel.apiUpdateChannelMemberSchemeRoles(siteOneUrl, testUser.id, channel.id, true);

        if (opts.value) {
            await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, opts.value);
        }

        if (opts.required) {
            await Properties.apiSetChannelAttributeFieldRequired(siteOneUrl, channelFieldId, true);
        }

        if (siblingFieldId) {
            await Properties.apiSetChannelAttributeFieldRequired(siteOneUrl, siblingFieldId, true);
        }

        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await openChannel(channel.name);
        await ChannelInfoScreen.open();
        await ChannelInfoAttributes.toBeVisible();

        return {channelFieldId, channel};
    }

    it('MM-T6320_1 - should set a value from the Set attribute sheet and persist it to the server', async () => {
        const {channelFieldId, channel} = await setupChannelWithAttribute({changePolicy: 'any', required: true});

        // * The attribute starts unset.
        await waitFor(ChannelInfoAttributes.getNotSet(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Open the sheet and pick a value.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);
        await ChannelInfoAttributes.selectOption(FIELD_NAME, OPTION_IDS.medium);

        // * The row now shows the chosen value.
        await waitFor(ChannelInfoAttributes.getChip(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);

        // * The value reached the server, not just the row.
        assertStoredValue(await Properties.apiGetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId), OPTION_IDS.medium);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6320_2 - should show the new value on the channel header chip as well as the Channel Info row', async () => {
        // Required so the unset row shows; optional unset attributes are hidden.
        await setupChannelWithAttribute({changePolicy: 'any', required: true});

        // # Set a value.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);
        await ChannelInfoAttributes.selectOption(FIELD_NAME, OPTION_IDS.high);
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        // # Return to the channel.
        await ChannelInfoScreen.close();

        // * The header chip reflects the same value: both surfaces read one query.
        await waitFor(ChannelAttributeLabels.getChip(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelAttributeLabels.getChipValue(FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.back();
    });

    it('MM-T6320_3 - should keep the value across a restart, having written it to the database', async () => {
        // required: true — same reason as MM-T6320_2.
        const {channel} = await setupChannelWithAttribute({changePolicy: 'any', required: true});

        // # Set a value.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);
        await ChannelInfoAttributes.selectOption(FIELD_NAME, OPTION_IDS.medium);
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);
        await ChannelInfoScreen.close();
        await ChannelScreen.back();

        // # Restart the app.
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await openChannel(channel.name);
        await ChannelInfoScreen.open();

        // * The value survived: it was persisted, not held in component state.
        await ChannelInfoAttributes.toBeVisible();
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6320_4 - should clear a value under an any policy', async () => {
        // Optional: the server rejects clearing a required field under any change_policy.
        const {channelFieldId, channel} = await setupChannelWithAttribute({changePolicy: 'any', value: OPTION_IDS.medium});

        // # Clear the value.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);
        await waitFor(ChannelInfoAttributes.getEditorClear(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelInfoAttributes.getEditorClear(FIELD_NAME).tap();

        // * Optional unset attributes are hidden, so the whole section goes away.
        await ChannelInfoAttributes.toNotBeVisible();

        // * The server holds nothing for the field.
        assertStoredValueUnset(await Properties.apiGetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId));

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6320_5 - should not offer clearing for a required attribute', async () => {
        const {channelFieldId, channel} = await setupChannelWithAttribute({changePolicy: 'any', value: OPTION_IDS.medium, required: true});

        // # Open the required attribute's editor.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);

        // * Invalid clearing is unavailable rather than deferred to a server error.
        await expect(ChannelInfoAttributes.getEditorClear(FIELD_NAME)).not.toExist();

        // * The server still holds the value.
        assertStoredValue(await Properties.apiGetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId), OPTION_IDS.medium);

        await ChannelInfoAttributes.closeEditor(FIELD_NAME);
        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6321_1 - should offer only the higher options, and no clear, under a raise_only policy', async () => {
        await setupChannelWithAttribute({changePolicy: 'raise_only', value: OPTION_IDS.medium});

        // # Open the sheet.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);

        // * Only the higher option is offered; the current and lower ones are not choices.
        await waitFor(ChannelInfoAttributes.getEditorOption(FIELD_NAME, OPTION_IDS.high)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getEditorOption(FIELD_NAME, OPTION_IDS.low)).not.toBeVisible();
        await expect(ChannelInfoAttributes.getEditorOption(FIELD_NAME, OPTION_IDS.medium)).not.toBeVisible();

        // * The server refuses a clear under a directional policy.
        await expect(ChannelInfoAttributes.getEditorClear(FIELD_NAME)).not.toBeVisible();

        // # Raise the value.
        await ChannelInfoAttributes.selectOption(FIELD_NAME, OPTION_IDS.high);
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6321_2 - should render read-only with a reason once a raise_only policy is exhausted', async () => {
        await setupChannelWithAttribute({changePolicy: 'raise_only', value: OPTION_IDS.high});

        // * The row is not editable — there is nowhere left to raise to.
        await waitFor(ChannelInfoAttributes.getRow(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getEditableRow(FIELD_NAME)).not.toExist();

        // * Shown with a reason, not hidden, so the channel does not look unmarked.
        await waitFor(ChannelInfoAttributes.getLockReason(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('HIGH');

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6321_3 - should lock a set value under a never policy but allow the first write', async () => {
        // # A never policy with nothing set: the server exempts the first write.
        await setupChannelWithAttribute({changePolicy: 'never', required: true});

        await waitFor(ChannelInfoAttributes.getNotSet(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // # Set the value.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);
        await ChannelInfoAttributes.selectOption(FIELD_NAME, OPTION_IDS.medium);
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);

        // * Now that it is set, the row is locked with a reason.
        await waitFor(ChannelInfoAttributes.getLockReason(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getEditableRow(FIELD_NAME)).not.toExist();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6322_1 - should not offer editing for a field whose permission tier the user cannot satisfy', async () => {
        await setupChannelWithAttribute({permissionValues: 'sysadmin', value: OPTION_IDS.medium, withEditableSibling: true});

        // * The value is shown, the row is not editable, and the reason is visible.
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getEditableRow(FIELD_NAME)).not.toExist();
        await waitFor(ChannelInfoAttributes.getLockReason(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6322_2 - should never offer editing for a none-tier field', async () => {
        // No one can set a none-tier field, and required-unset rows only show to users who can
        // fill them, so the row is hidden while the sibling stays editable.
        await setupChannelWithAttribute({permissionValues: 'none', required: true, withEditableSibling: true});

        await expect(ChannelInfoAttributes.getRow(FIELD_NAME)).not.toExist();
        await waitFor(ChannelInfoAttributes.getEditableRow(SIBLING_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6323_1 - should reflect a value changed on the server while the app is on the screen', async () => {
        const {channelFieldId, channel} = await setupChannelWithAttribute({changePolicy: 'any', value: OPTION_IDS.low});

        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('LOW').withTimeout(timeouts.TEN_SEC);

        // # Change the value out of band, as another client would.
        await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, OPTION_IDS.high);

        // * The row updates over the websocket, without a navigation or a restart.
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.HALF_MIN);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6325_1 - should show a valued attribute in Channel Info even when it has no display_label_info action', async () => {
        // Channel Info lists attributes by role, not display_label_info, so the value stays editable.
        const {channelFieldId} = await Properties.apiSetupChannelAttributeField(siteOneUrl, {
            fieldName: FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: ['display_label_header'],
            permissionValues: 'member',
            required: false,
        });

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
        if (!channel) {
            throw new Error('MM-T6325_1 failed to create its channel');
        }
        testChannel = channel;
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await Channel.apiUpdateChannelMemberSchemeRoles(siteOneUrl, testUser.id, channel.id, true);

        await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, OPTION_IDS.medium);

        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await openChannel(channel.name);
        await ChannelInfoScreen.open();

        // * The row appears in Channel Info despite having no display_label_info action.
        await ChannelInfoAttributes.toBeVisible();
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelInfoAttributes.getEditableRow(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});

(hasChannelAttributes ? describe : describe.skip)('Channel Attributes - Member view (read-only)', () => {
    const serverOneDisplayName = 'Server 1';
    let adminUser: any;
    let memberUser: any;
    let testTeam: any;
    let testChannel: any = null;

    const MEMBER_FIELD_NAME = `memberfield_${FIELD_SUFFIX}`;

    beforeAll(async () => {
        requireMutationServer('channel_attributes_editing');

        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [MEMBER_FIELD_NAME]);
        await assertServerBaseline(siteOneUrl, ['FeatureFlags.ChannelAttributes']);
        await setChannelAttributesRequired(siteOneUrl, true);

        const {team} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'mteam'});
        testTeam = team;

        const {user: admin} = await User.apiCreateUser(siteOneUrl, {prefix: 'admin'});
        adminUser = admin;
        const {user: member} = await User.apiCreateUser(siteOneUrl, {prefix: 'member'});
        memberUser = member;

        await Team.apiAddUserToTeam(siteOneUrl, adminUser.id, testTeam.id);
        await Team.apiAddUserToTeam(siteOneUrl, memberUser.id, testTeam.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(memberUser);
    });

    afterAll(async () => {
        let cleanupError: unknown;
        try {
            await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [MEMBER_FIELD_NAME]);
        } catch (error) {
            cleanupError ??= error;
        }

        if (canMutateServer) {
            try {
                await setChannelAttributesRequired(siteOneUrl, false);
            } catch (error) {
                cleanupError ??= error;
            }
        }

        try {
            await HomeScreen.logout();
        } catch (error) {
            cleanupError ??= error;
        }

        if (cleanupError) {
            throw cleanupError;
        }
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        let cleanupError: unknown;
        if (testChannel) {
            const result = await Channel.apiDeleteChannel(siteOneUrl, testChannel.id);
            if (result.error) {
                cleanupError = new Error(`Failed to delete test channel: ${JSON.stringify(result.error)}`);
            }
            testChannel = null;
        }
        try {
            await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [MEMBER_FIELD_NAME]);
        } catch (error) {
            cleanupError ??= error;
        }

        if (cleanupError) {
            throw cleanupError;
        }
    });

    it('MM-T6326_1 - should show a valued attribute to a regular member but without an edit affordance', async () => {
        const {channelFieldId} = await Properties.apiSetupChannelAttributeField(siteOneUrl, {
            fieldName: MEMBER_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'admin',
            required: false,
        });

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
        if (!channel) {
            throw new Error('MM-T6326_1 failed to create its channel');
        }
        testChannel = channel;

        await Channel.apiAddUserToChannel(siteOneUrl, adminUser.id, channel.id);
        await Channel.apiUpdateChannelMemberSchemeRoles(siteOneUrl, adminUser.id, channel.id, true);
        await Channel.apiAddUserToChannel(siteOneUrl, memberUser.id, channel.id);

        await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, OPTION_IDS.medium);

        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await openChannel(channel.name);
        await ChannelInfoScreen.open();

        // * The row is visible — members see valued attributes.
        await ChannelInfoAttributes.toBeVisible();
        await waitFor(ChannelInfoAttributes.getChipValue(MEMBER_FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);

        // * No edit affordance — this admin-tier field excludes regular members.
        await expect(ChannelInfoAttributes.getEditableRow(MEMBER_FIELD_NAME)).not.toExist();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6326_2 - should hide an admin-tier required-unset attribute from a regular member', async () => {
        const {channelFieldId} = await Properties.apiSetupChannelAttributeField(siteOneUrl, {
            fieldName: MEMBER_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'admin',
            required: false,
        });

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
        if (!channel) {
            throw new Error('MM-T6326_2 failed to create its channel');
        }
        testChannel = channel;
        await Channel.apiAddUserToChannel(siteOneUrl, memberUser.id, channel.id);
        await Properties.apiSetChannelAttributeFieldRequired(siteOneUrl, channelFieldId, true);

        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        await openChannel(channel.name);
        await ChannelInfoScreen.open();

        // * The whole section is absent for a member who cannot fill the attribute.
        await ChannelInfoAttributes.toNotBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
