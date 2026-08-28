// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {enableChannelAttributes} from '@support/channel_attributes_test_helper';
import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Channel, Post, Properties, Setup, System, User} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelAttributeLabels} from '@support/ui/component';
import {ChannelInfoScreen, ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

jest.setTimeout(timeouts.ONE_MIN * 30);

// Option IDs for the test attribute field. Server requires exactly 26 alphanumeric characters
// (model.IsValidId). Lengths verified: 14 + 12 = 26, 13 + 13 = 26, 12 + 14 = 26, 12 + 14 = 26.
const ATTR_OPTION_IDS = {
    high: 'attroptionhigh000000000000', // 14 + 12 = 26
    medium: 'attroptionmedium0000000000', // 16 + 10 = 26
    low: 'attroptionlow0000000000000', // 13 + 13 = 26
} as const;

const TEST_FIELD_NAME = 'sensitivity';
const TEST_FIELD_OPTIONS = [
    {id: ATTR_OPTION_IDS.high, name: 'HIGH', color: '#FF0000', rank: 1},
    {id: ATTR_OPTION_IDS.medium, name: 'MEDIUM', color: '#FFA500', rank: 2},
    {id: ATTR_OPTION_IDS.low, name: 'LOW', color: '#00AA00', rank: 3},
];

// Second field for multi-chip tests (2 fields = MAX_VISIBLE_CHIPS boundary; no overflow).
const SECOND_FIELD_NAME = 'classification2';
const SECOND_FIELD_OPTIONS = [
    {id: 'attropt2high00000000000000', name: 'HIGH2', color: '#CC0000', rank: 1}, // 12+14=26
];

// Resolve a required option by name. Throws clearly if the option was not created rather than
// silently passing an undefined value that the server rejects with an opaque 400.
function requireOption(optionIdsByName: Record<string, string | undefined>, name: string): string {
    const id = optionIdsByName[name];
    if (!id) {
        const available = Object.keys(optionIdsByName).join(', ');
        throw new Error(`Channel attributes test: option "${name}" not found. Available: [${available}]`);
    }
    return id;
}

// Navigate into a public channel by name from the channel list sidebar.
async function openChannel(channelName: string) {
    await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
    await wait(timeouts.TWO_SEC);
    await ChannelScreen.open('channels', channelName);
}

describe('Channel Attributes - Header chips and Channel Info section', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testChannel: any;

    beforeAll(async () => {
        // Start with ChannelAttributes off so each test controls the flag state explicitly.
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ChannelAttributes: false,
            },
        });

        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [TEST_FIELD_NAME, SECOND_FIELD_NAME]);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [TEST_FIELD_NAME, SECOND_FIELD_NAME]);
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ChannelAttributes: false,
            },
        });
        await HomeScreen.logout();
    });

    beforeEach(async () => {
        // Every test starts from the channel list. If a previous test left the app on the channel
        // screen or channel info sheet, Detox navigation will desync without this guard.
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [TEST_FIELD_NAME, SECOND_FIELD_NAME]);
        await System.apiPatchConfig(siteOneUrl, {
            FeatureFlags: {
                ChannelAttributes: false,
            },
        });
    });

    it('MM-T6300_1 - should not render attribute chips in the header when ChannelAttributes flag is off', async () => {
        // # Create a header-designated attribute field and set a value on the channel.
        const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_header'],
            },
        );
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
        await device.reloadReactNative();

        // # Navigate to the channel.
        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * No chips row should be visible with the flag off.
        await ChannelAttributeLabels.toNotBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T6301_1 - should render an attribute chip in the channel header when a value is set and the flag is on', async () => {
        await enableChannelAttributes(siteOneUrl);

        // # Create a header-designated attribute field and set a value on the channel.
        const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_header'],
            },
        );
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
        await device.reloadReactNative();

        // # Navigate to the channel.
        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * Chip container and the HIGH chip are visible.
        await ChannelAttributeLabels.toBeVisible();
        await waitFor(ChannelAttributeLabels.getChip(TEST_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelAttributeLabels.getChipValue(TEST_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.back();
    });

    it('MM-T6302_1 - should not render a chip for an unset optional attribute', async () => {
        await enableChannelAttributes(siteOneUrl);

        // # Create a header-designated field but do NOT set a value.
        await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_header'],
            },
        );
        await device.reloadReactNative();

        // # Navigate to the channel.
        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * No chip row because there is nothing to show.
        await ChannelAttributeLabels.toNotBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T6303_1 - should render both chips inline when exactly 2 attributes are designated for the header', async () => {
        await enableChannelAttributes(siteOneUrl);

        // # Create two header-designated fields, each with a value.
        const {channelFieldId: field1Id, optionIdsByName: opts1} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_header'],
            },
        );
        const {channelFieldId: field2Id, optionIdsByName: opts2} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: SECOND_FIELD_NAME,
                options: SECOND_FIELD_OPTIONS,
                actions: ['display_label_header'],
            },
        );
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, field1Id, requireOption(opts1, 'HIGH'));
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, field2Id, requireOption(opts2, 'HIGH2'));
        await device.reloadReactNative();

        // # Navigate to the channel. With MAX_VISIBLE_CHIPS=2 and exactly 2 fields, both fit
        // # inline and no overflow +N button should be shown.
        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * Both chips visible.
        await ChannelAttributeLabels.toBeVisible();
        await waitFor(ChannelAttributeLabels.getChip(TEST_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(ChannelAttributeLabels.getChip(SECOND_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        // * No overflow button — count equals MAX_VISIBLE_CHIPS exactly.
        await expect(ChannelAttributeLabels.overflow).not.toBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T6304_1 - should not render attribute chips on a DM channel', async () => {
        await enableChannelAttributes(siteOneUrl);

        // # Create a second user for the DM. DMs are server-global; no shared team needed.
        const {user: dmTarget} = await User.apiCreateUser(siteOneUrl);

        const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_header'],
            },
        );

        // # Create the DM and post a message so it appears in the sidebar.
        const {channel: dmChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, dmTarget.id]);
        await Post.apiCreatePost(siteOneUrl, {channelId: dmChannel.id, message: 'hello'});

        // # Set an attribute value on the DM channel (server accepts it; mobile must not show it).
        await Properties.apiSetChannelAttributeValue(siteOneUrl, dmChannel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();

        // # Navigate to the DM — DMs appear under 'direct_messages' category.
        await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
        await wait(timeouts.TWO_SEC);
        await ChannelScreen.open('direct_messages', dmTarget.username);

        // * No chips on a DM.
        await ChannelAttributeLabels.toNotBeVisible();

        await ChannelScreen.back();
    });

    it('MM-T6305_1 - should show the attribute row in Channel Info when designated for display_label_info', async () => {
        await enableChannelAttributes(siteOneUrl);

        const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_info'],
            },
        );
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, channelFieldId, requireOption(optionIdsByName, 'MEDIUM'));
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // # Open Channel Info.
        await ChannelInfoScreen.open();

        // * The attributes section and the field row with a chip are visible.
        await waitFor(element(by.id('channel_info.attributes'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.id(`channel_info.attributes.${TEST_FIELD_NAME}`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.id(`channel_info.attributes.${TEST_FIELD_NAME}.chip`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6306_1 - should show "Not set" for a required attribute with no value in Channel Info', async () => {
        await enableChannelAttributes(siteOneUrl);

        // # Create a required info-designated field but do NOT set a value.
        await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_info'],
                required: true,
            },
        );
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // # Open Channel Info.
        await ChannelInfoScreen.open();

        // * Required row is listed with the "not set" indicator.
        await waitFor(element(by.id('channel_info.attributes'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.id(`channel_info.attributes.${TEST_FIELD_NAME}`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.id(`channel_info.attributes.${TEST_FIELD_NAME}.not_set`))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6307_1 - should not show optional unset attribute row in Channel Info', async () => {
        await enableChannelAttributes(siteOneUrl);

        // # Create an optional info-designated field with no value set.
        await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_info'],
                required: false,
            },
        );
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // # Open Channel Info.
        await ChannelInfoScreen.open();

        // * No attributes section because there is nothing to show.
        await expect(element(by.id('channel_info.attributes'))).not.toBeVisible();

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6308_1 - should render the channel attribute banner when designated with display_banner_top', async () => {
        await enableChannelAttributes(siteOneUrl);

        const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_banner_top'],
            },
        );
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * Channel-level banner is mounted (testID='channel.banner' added to channel_banner.tsx)
        // * and the option name is visible (RemoveMarkdown strips the **bold** markers from the
        // * default "**HIGH**" text, so by.text('HIGH') matches the rendered output).
        await waitFor(element(by.id('channel.banner'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.text('HIGH'))).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await ChannelScreen.back();
    });

    it('MM-T6309_1 - should not show channel attribute banner when the flag is off', async () => {
        // # ChannelAttributes flag is off (afterEach resets it; flag was never enabled this test).
        const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_banner_top'],
            },
        );
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * The banner component returns null when the gate fails; use not.toExist() not
        // * not.toBeVisible() — a null-returned component has no element in the hierarchy at all.
        await expect(element(by.id('channel.banner'))).not.toExist();

        await ChannelScreen.back();
    });

    it('MM-T6310_1 - should update the chip when the attribute value changes', async () => {
        await enableChannelAttributes(siteOneUrl);

        const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_header'],
            },
        );
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * Chip shows HIGH initially.
        await ChannelAttributeLabels.toBeVisible();
        await waitFor(ChannelAttributeLabels.getChipValue(TEST_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        // # Back out before changing the value so the app is on the channel list when reloaded.
        await ChannelScreen.back();

        // # Change the value to LOW via the API and reload.
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, channelFieldId, requireOption(optionIdsByName, 'LOW'));
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * Chip now shows LOW; HIGH is no longer shown.
        await waitFor(ChannelAttributeLabels.getChipValue(TEST_FIELD_NAME)).toHaveText('LOW').withTimeout(timeouts.TEN_SEC);
        await waitFor(element(by.text('HIGH'))).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);

        await ChannelScreen.back();
    });

    it('MM-T6311_1 - should not show attribute chips when ChannelAttributes is off even if ClassificationMarkings is on', async () => {
        // # Enable classification markings only; channel attributes flag stays off.
        await enableClassificationMarkings(siteOneUrl);

        const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
            siteOneUrl,
            {
                fieldName: TEST_FIELD_NAME,
                options: TEST_FIELD_OPTIONS,
                actions: ['display_label_header'],
            },
        );
        await Properties.apiSetChannelAttributeValue(siteOneUrl, testChannel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
        await device.reloadReactNative();

        await ChannelListScreen.toBeVisible();
        await openChannel(testChannel.name);

        // * No channel attribute chips because ChannelAttributes flag is off.
        await ChannelAttributeLabels.toNotBeVisible();

        await ChannelScreen.back();

        // # Disable ClassificationMarkings for a clean afterEach state.
        await System.apiPatchConfig(siteOneUrl, {FeatureFlags: {ClassificationMarkings: false}});
    });
});
