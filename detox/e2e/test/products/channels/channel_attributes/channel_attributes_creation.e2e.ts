// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {disableChannelAttributes, enableChannelAttributes, setChannelAttributesRequired} from '@support/channel_attributes_test_helper';
import {Channel, Properties, Team, User} from '@support/server_api';
import {assertServerBaseline} from '@support/server_baseline';
import {canMutateServer, requireMutationServer} from '@support/server_role';
import {hasChannelAttributes, serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelAttributeForm, ChannelAttributeLabels, ChannelInfoAttributes} from '@support/ui/component';
import {ChannelInfoScreen, ChannelListScreen, ChannelScreen, CreateOrEditChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {device, expect, waitFor} from 'detox';

jest.setTimeout(timeouts.ONE_MIN * 30);

// Server model.IsValidId requires exactly 26 alphanumeric characters.
const OPTION_IDS = {
    low: 'createlow0000000000000000000'.slice(0, 26),
    high: 'createhigh000000000000000000'.slice(0, 26),
} as const;

const FIELD_OPTIONS = [
    {id: OPTION_IDS.low, name: 'LOW', color: '#00AA00', rank: 1},
    {id: OPTION_IDS.high, name: 'HIGH', color: '#FF0000', rank: 2},
];

// Shared servers only allow optional fields named <name>_<6 hex> (see server_api/pool_guard.ts).
const FIELD_SUFFIX = getRandomId(6);
const REQUIRED_FIELD_NAME = `createrequired_${FIELD_SUFFIX}`;
const SYSADMIN_FIELD_NAME = `createsysadmin_${FIELD_SUFFIX}`;
const OPTIONAL_FIELD_NAME = `createoptional_${FIELD_SUFFIX}`;
const ALL_FIELD_NAMES = [REQUIRED_FIELD_NAME, SYSADMIN_FIELD_NAME, OPTIONAL_FIELD_NAME];

const DISPLAY_ACTIONS = ['display_label_info', 'display_label_header'];

function assertStoredValue(fieldName: string, stored: unknown, expected: string) {
    if (stored !== expected) {
        throw new Error(`Expected the server to hold "${expected}" for ${fieldName}, got ${JSON.stringify(stored)}`);
    }
}

// Required attributes are server-wide, so this spec runs alone on the mutation server.
// Skipped below v12.0, where FeatureFlagChannelAttributes does not exist.
(hasChannelAttributes ? describe : describe.skip)('Channel Attributes - Setting values at channel creation', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;
    let testChannel: any = null;

    beforeAll(async () => {
        requireMutationServer('channel_attributes_creation');

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

    // The app caches attribute fields for an hour and only refetches on reconnect, so reload
    // to make a newly created field show up.
    async function setupChannelAttributeField(opts: Parameters<typeof Properties.apiSetupChannelAttributeField>[1]) {
        const result = await Properties.apiSetupChannelAttributeField(siteOneUrl, opts);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        return result;
    }

    async function tapCreateAndWaitForChannelWithAttributes() {
        const errorText = CreateOrEditChannelScreen.errorText;
        await CreateOrEditChannelScreen.createButton.tap();
        await ChannelScreen.dismissScheduledPostTooltip();

        try {
            await waitFor(ChannelScreen.channelScreen).toExist().withTimeout(timeouts.HALF_MIN);
        } catch (error) {
            await waitFor(errorText).toExist().withTimeout(timeouts.FOUR_SEC);
            const attributes = await errorText.getAttributes() as {text?: string};
            throw new Error(`Channel creation failed: ${attributes.text ?? String(error)}`);
        }
    }

    async function createChannelWithDisplayName(displayName: string) {
        await CreateOrEditChannelScreen.displayNameInput.replaceText(displayName);
        await tapCreateAndWaitForChannelWithAttributes();
        await ChannelScreen.toBeVisible();
        const {channel} = await Channel.apiGetChannelByName(siteOneUrl, testTeam.id, displayName);
        if (!channel) {
            throw new Error(`Created channel "${displayName}" was not returned by the server`);
        }
        testChannel = channel;
        return channel;
    }

    it('MM-T6330_1 - should list a required, creator-settable attribute above Purpose and gate Create on it', async () => {
        const {channelFieldId} = await setupChannelAttributeField({
            fieldName: REQUIRED_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'member',
            required: true,
        });

        await CreateOrEditChannelScreen.openCreateChannel();
        await ChannelAttributeForm.toBeVisible();

        // * The row sits above Purpose and renders unset.
        await expect(CreateOrEditChannelScreen.purposeInput).toBeVisible();
        await waitFor(ChannelAttributeForm.getNotSet(REQUIRED_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await CreateOrEditChannelScreen.displayNameInput.replaceText('created-town-square');

        // * Create stays disabled while the required attribute is unset; no request is sent.
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.ONE_SEC);
        await expect(CreateOrEditChannelScreen.createOrEditChannelScreen).toExist();
        await expect(CreateOrEditChannelScreen.errorText).not.toExist();

        // # Set the required attribute.
        await ChannelAttributeForm.openEditor(REQUIRED_FIELD_NAME);
        await ChannelAttributeForm.selectOption(REQUIRED_FIELD_NAME, OPTION_IDS.high);
        await waitFor(ChannelAttributeForm.getChipValue(REQUIRED_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        // # Create the channel.
        await tapCreateAndWaitForChannelWithAttributes();
        await ChannelScreen.toBeVisible();
        const {channel} = await Channel.apiGetChannelByName(siteOneUrl, testTeam.id, 'created-town-square');
        if (!channel) {
            throw new Error('Created channel "created-town-square" was not returned by the server');
        }
        testChannel = channel;

        // * The created channel carries the value in the header chip and Channel Info.
        await waitFor(ChannelAttributeLabels.getChip(REQUIRED_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelAttributeLabels.getChipValue(REQUIRED_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.open();
        await ChannelInfoAttributes.toBeVisible();
        await waitFor(ChannelInfoAttributes.getChipValue(REQUIRED_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        assertStoredValue(REQUIRED_FIELD_NAME, await Properties.apiGetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId), OPTION_IDS.high);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6330_4 - should not offer any attribute when the feature is disabled', async () => {
        // The field still exists server-side; only the client-side flag gate is under test.
        await setupChannelAttributeField({
            fieldName: REQUIRED_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'member',
            required: true,
        });

        // Flag is server-wide; the finally turns it back on for the next test.
        if (!await disableChannelAttributes(siteOneUrl)) {
            throw new Error('MM-T6330_4 could not disable ChannelAttributes');
        }
        try {
            await device.reloadReactNative();
            await ChannelListScreen.toBeVisible();
            await CreateOrEditChannelScreen.openCreateChannel();

            await ChannelAttributeForm.toNotBeVisible();
            await expect(CreateOrEditChannelScreen.purposeInput).toBeVisible();

            await CreateOrEditChannelScreen.close();
        } finally {
            await enableChannelAttributes(siteOneUrl);
            await device.reloadReactNative();
        }
    });

    it('MM-T6330_2 - should not offer an optional attribute at creation', async () => {
        await setupChannelAttributeField({
            fieldName: OPTIONAL_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'member',
            required: false,
        });

        await CreateOrEditChannelScreen.openCreateChannel();

        // * No attribute section: optional attributes are not offered at creation.
        await ChannelAttributeForm.toNotBeVisible();
        await expect(CreateOrEditChannelScreen.purposeInput).toBeVisible();

        await CreateOrEditChannelScreen.close();
    });

    it('MM-T6330_3 - should drop a required attribute the creator cannot set, and still allow creation', async () => {
        const {channelFieldId} = await setupChannelAttributeField({
            fieldName: SYSADMIN_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'sysadmin',
            required: true,
        });

        await CreateOrEditChannelScreen.openCreateChannel();

        // * The server skips fields the creator cannot set, so creation is not gated on them.
        await ChannelAttributeForm.toNotBeVisible();

        const channel = await createChannelWithDisplayName('created-no-sysadmin');

        // * Nothing was written for the field the creator could not set.
        const stored = await Properties.apiGetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId);
        if (stored !== null && stored !== '' && stored !== undefined) {
            throw new Error(`Expected no value for ${SYSADMIN_FIELD_NAME}, got ${JSON.stringify(stored)}`);
        }

        await ChannelScreen.back();
    });
});
