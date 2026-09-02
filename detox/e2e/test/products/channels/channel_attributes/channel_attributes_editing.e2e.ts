// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {acquireChannelAttributesLock, createChannelAttributesLockOwner, releaseChannelAttributesLock} from '@support/channel_attributes_lock';
import {disableChannelAttributes, enableChannelAttributes} from '@support/channel_attributes_test_helper';
import {Channel, Properties, System, Team, User} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelAttributeLabels, ChannelInfoAttributes} from '@support/ui/component';
import {ChannelInfoScreen, ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

jest.setTimeout(timeouts.ONE_MIN * 30);

// Server model.IsValidId requires exactly 26 alphanumeric characters.
const OPTION_IDS = {
    low: 'editlow00000000000000000000'.slice(0, 26),
    medium: 'editmedium000000000000000000'.slice(0, 26),
    high: 'edithigh0000000000000000000'.slice(0, 26),
} as const;

// Ranks ascend with sensitivity, matching the server: a higher rank is higher, so
// raise_only permits low -> high and refuses high -> low.
const FIELD_OPTIONS = [
    {id: OPTION_IDS.low, name: 'LOW', color: '#00AA00', rank: 1},
    {id: OPTION_IDS.medium, name: 'MEDIUM', color: '#FFA500', rank: 2},
    {id: OPTION_IDS.high, name: 'HIGH', color: '#FF0000', rank: 3},
];

const FIELD_NAME = 'editable';
const ALL_FIELD_NAMES = [FIELD_NAME];

// Both display surfaces, so one edit can be asserted in Channel Info and in the header.
const DISPLAY_ACTIONS = ['display_label_info', 'display_label_header'];

// Detox re-exports its own `expect`, which only takes an element, so a plain value
// is asserted with an explicit throw rather than silently passing.
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
    await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
    await wait(timeouts.TWO_SEC);
    await ChannelScreen.open('channels', channelName);
}

describe('Channel Attributes - Setting values from Channel Info', () => {
    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let lockAcquired = false;
    let canControlFlag = false;
    let testUser: any;
    let testTeam: any;
    let testChannel: any = null;

    beforeAll(async () => {
        lockOwner = createChannelAttributesLockOwner();
        await acquireChannelAttributesLock(siteOneUrl, lockOwner);
        lockAcquired = true;

        // A prior interrupted run may have left a required field behind, which would
        // block channel creation before any of these tests got started.
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, ALL_FIELD_NAMES);
        canControlFlag = await disableChannelAttributes(siteOneUrl);

        const {team} = await Team.apiCreateTeam(siteOneUrl, {prefix: 'team'});
        testTeam = team;
        const {user} = await User.apiCreateUser(siteOneUrl, {prefix: 'user'});
        testUser = user;
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeam.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        if (!lockAcquired) {
            return;
        }

        try {
            await Properties.apiCleanupChannelAttributeFields(siteOneUrl, ALL_FIELD_NAMES);
            if (canControlFlag) {
                await disableChannelAttributes(siteOneUrl);
            }
            await System.apiPatchConfig(siteOneUrl, {FeatureFlags: {ClassificationMarkings: false}});
            await HomeScreen.logout();
        } finally {
            await releaseChannelAttributesLock(siteOneUrl, lockOwner);
        }
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        if (!lockAcquired) {
            return;
        }

        if (testChannel) {
            await Channel.apiDeleteChannel(siteOneUrl, testChannel.id);
            testChannel = null;
        }
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, ALL_FIELD_NAMES);
        if (canControlFlag) {
            await disableChannelAttributes(siteOneUrl);
        }
    });

    /**
     * Sets up one attribute field, a channel carrying the given value, and leaves the
     * app on that channel.
     *
     * permissionValues defaults to 'member' — the tier that needs only the
     * channel-level manage_*_channel_properties permission, which an ordinary channel
     * member holds. The System Console pins 'admin' in production; that case is
     * covered separately as a denial.
     */
    async function setupChannelWithAttribute(opts: {
        changePolicy?: 'any' | 'raise_only' | 'lower_only' | 'never';
        permissionValues?: 'none' | 'sysadmin' | 'admin' | 'member';
        value?: string;
        required?: boolean;
    } = {}) {
        await enableChannelAttributes(siteOneUrl);

        const {channelFieldId} = await Properties.apiSetupChannelAttributeField(siteOneUrl, {
            fieldName: FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            changePolicy: opts.changePolicy,
            permissionValues: opts.permissionValues ?? 'member',
            required: opts.required ?? false,
        });

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
        testChannel = channel;
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

        if (opts.value) {
            await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, opts.value);
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
    });

    it('MM-T6320_2 - should show the new value on the channel header chip as well as the Channel Info row', async () => {
        await setupChannelWithAttribute({changePolicy: 'any'});

        // # Set a value.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);
        await ChannelInfoAttributes.selectOption(FIELD_NAME, OPTION_IDS.high);
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        // # Return to the channel.
        await ChannelInfoScreen.close();

        // * The header chip reflects the same value: both surfaces read one query.
        await ChannelAttributeLabels.toBeVisible();
        await waitFor(ChannelAttributeLabels.getChipValue(FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.back();
    });

    it('MM-T6320_3 - should keep the value across a restart, having written it to the database', async () => {
        const {channel} = await setupChannelWithAttribute({changePolicy: 'any'});

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
    });

    it('MM-T6320_4 - should clear a value under an any policy', async () => {
        const {channelFieldId, channel} = await setupChannelWithAttribute({changePolicy: 'any', value: OPTION_IDS.medium, required: true});

        // # Clear the value.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);
        await waitFor(ChannelInfoAttributes.getEditorClear(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelInfoAttributes.getEditorClear(FIELD_NAME).tap();

        // * The required row falls back to Not set rather than disappearing.
        await waitFor(ChannelInfoAttributes.getNotSet(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * The server holds nothing for the field.
        assertStoredValueUnset(await Properties.apiGetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId));

        await ChannelInfoScreen.close();
    });

    it('MM-T6321_1 - should offer only the higher options, and no clear, under a raise_only policy', async () => {
        await setupChannelWithAttribute({changePolicy: 'raise_only', value: OPTION_IDS.medium});

        // # Open the sheet.
        await ChannelInfoAttributes.openEditor(FIELD_NAME);

        // * Only the higher option is offered; the current and lower ones are not choices.
        await waitFor(ChannelInfoAttributes.getEditorOption(FIELD_NAME, OPTION_IDS.high)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getEditorOption(FIELD_NAME, OPTION_IDS.low)).not.toBeVisible();
        await expect(ChannelInfoAttributes.getEditorOption(FIELD_NAME, OPTION_IDS.medium)).not.toBeVisible();

        // * Clearing is not offered: the server refuses a clear under a directional policy.
        await expect(ChannelInfoAttributes.getEditorClear(FIELD_NAME)).not.toBeVisible();

        // # Raise the value.
        await ChannelInfoAttributes.selectOption(FIELD_NAME, OPTION_IDS.high);
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
    });

    it('MM-T6321_2 - should render read-only with a reason once a raise_only policy is exhausted', async () => {
        await setupChannelWithAttribute({changePolicy: 'raise_only', value: OPTION_IDS.high});

        // * The row is not editable — there is nowhere left to raise to.
        await waitFor(ChannelInfoAttributes.getRow(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getEditableRow(FIELD_NAME)).not.toExist();

        // * The reason is shown rather than the row being hidden: a correctly marked
        // * channel must not look like one missing a marking.
        await waitFor(ChannelInfoAttributes.getLockReason(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('HIGH');

        await ChannelInfoScreen.close();
    });

    it('MM-T6321_3 - should lock a set value under a never policy but allow the first write', async () => {
        // # A never policy with nothing set: the server exempts the first write, so a
        // # required attribute is not stranded as Not set forever.
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
    });

    it('MM-T6322_1 - should not offer editing for a field whose permission tier the user cannot satisfy', async () => {
        await setupChannelWithAttribute({permissionValues: 'sysadmin', value: OPTION_IDS.medium});

        // * The value is shown, the row is not editable, and the reason is visible —
        // * the user can edit other attributes on this channel, so the denial is
        // * information rather than noise.
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getEditableRow(FIELD_NAME)).not.toExist();
        await waitFor(ChannelInfoAttributes.getLockReason(FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
    });

    it('MM-T6322_2 - should never offer editing for a none-tier field', async () => {
        await setupChannelWithAttribute({permissionValues: 'none', value: OPTION_IDS.medium});

        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);
        await expect(ChannelInfoAttributes.getEditableRow(FIELD_NAME)).not.toExist();

        await ChannelInfoScreen.close();
    });

    it('MM-T6323_1 - should reflect a value changed on the server while the app is on the screen', async () => {
        const {channelFieldId, channel} = await setupChannelWithAttribute({changePolicy: 'any', value: OPTION_IDS.low});

        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('LOW').withTimeout(timeouts.TEN_SEC);

        // # Change the value out of band, as another client would.
        await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, OPTION_IDS.high);

        // * The row updates over the websocket, without a navigation or a restart.
        await waitFor(ChannelInfoAttributes.getChipValue(FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.HALF_MIN);

        await ChannelInfoScreen.close();
    });

    it('MM-T6324_1 - should not offer editing when the ChannelAttributes flag is off', async () => {
        if (!canControlFlag) {
            // The server controls FeatureFlagChannelAttributes via an env var, so
            // flag-off behaviour cannot be exercised here.
            return;
        }

        const {channelFieldId} = await Properties.apiSetupChannelAttributeField(siteOneUrl, {
            fieldName: FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'member',
        });

        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
        testChannel = channel;
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, OPTION_IDS.medium);
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(channel.name);
        await ChannelInfoScreen.open();

        // * The whole section is absent, so there is nothing to edit.
        await ChannelInfoAttributes.toNotBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });
});
