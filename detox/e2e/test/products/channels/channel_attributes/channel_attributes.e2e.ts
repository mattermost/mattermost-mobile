// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    assertOnReloadedApp,
    makeChannelAttributeFieldNames,
    openChannel,
    requireOption,
    SECOND_FIELD_OPTIONS,
    TEST_FIELD_OPTIONS,
} from '@support/channel_attributes_fixtures';
import {Channel, Post, Properties, Team, User} from '@support/server_api';
import {assertServerBaseline} from '@support/server_baseline';
import {hasChannelAttributes, serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelAttributeLabels} from '@support/ui/component';
import {ChannelInfoScreen, ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

jest.setTimeout(timeouts.ONE_MIN * 30);

const {
    TEST_FIELD_NAME,
    SECOND_FIELD_NAME,
    BANNER_MULTI_FIELD_NAME,
    BANNER_SELECT_FIELD_NAME,
    BANNER_TEXT_FIELD_NAME,
    MULTI_VALUE_FIELD_NAME,
    ALL_TEST_FIELD_NAMES,
} = makeChannelAttributeFieldNames();

// The flag-off tests and the required-attribute test change server-wide state, so they live in
// channel_attributes_flag_off.e2e.ts on the mutation server.
// FeatureFlagChannelAttributes exists on server master (v12.0+) only. On 11.x the key is absent,
// so enableChannelAttributes() can never succeed and every test here fails in beforeAll.
(hasChannelAttributes ? describe : describe.skip)('Channel Attributes - Header chips and Channel Info section', () => {
    const serverOneDisplayName = 'Server 1';
    let testUser: any;
    let testTeam: any;

    // Set per-test; cleared and deleted in afterEach. null = no regular channel created this test.
    let testChannel: any = null;

    beforeAll(async () => {
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [...ALL_TEST_FIELD_NAMES]);
        await assertServerBaseline(siteOneUrl, ['FeatureFlags.ChannelAttributes']);

        // Create a shared team and user. Channels are created per-test so that each test can
        // supply property_values at creation time matching its required attribute fields.
        const teamResult = await Team.apiCreateTeam(siteOneUrl, {prefix: 'team'});
        testTeam = teamResult.team;
        const userResult = await User.apiCreateUser(siteOneUrl, {prefix: 'user'});
        testUser = userResult.user;
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeam.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        try {
            await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [...ALL_TEST_FIELD_NAMES]);
        } finally {
            await HomeScreen.logout();
        }
    });

    beforeEach(async () => {
        // Every test starts from the channel list. If a previous test left the app on the channel
        // screen or channel info sheet, Detox navigation will desync without this guard.
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        // Delete the per-test channel so attribute fields on it do not leak into the next test.
        if (testChannel) {
            await Channel.apiDeleteChannel(siteOneUrl, testChannel.id);
            testChannel = null;
        }
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [...ALL_TEST_FIELD_NAMES]);
    });

    describe('with the flag on', () => {
        it('MM-T6301_1 - should render an attribute chip in the channel header when a value is set and the flag is on', async () => {
            // # Create a header-designated attribute field.
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_header'],
                },
            );

            // # Create the channel with the attribute value supplied at creation time, mirroring
            // # real-world channel creation flow when the ChannelAttributes flag is on.
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [{field_id: channelFieldId, value: requireOption(optionIdsByName, 'HIGH')}],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

            // # Navigate to the channel.
            await assertOnReloadedApp(async () => {
                await openChannel(channel.name);

                // * The HIGH chip is visible.
                await waitFor(ChannelAttributeLabels.getChip(TEST_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
                await waitFor(ChannelAttributeLabels.getChipValue(TEST_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);
            });

            await ChannelScreen.back();
        });

        it('MM-T6302_1 - should not render a chip for an unset optional attribute', async () => {
            // # Create an optional header-designated field.
            await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_header'],
                },
            );

            // # A second field, this one set, is the control. An unset field and a switched-off
            // # feature both render nothing, so without it this test passes either way.
            const {channelFieldId: controlFieldId, optionIdsByName: controlOptions} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: SECOND_FIELD_NAME,
                    options: SECOND_FIELD_OPTIONS,
                    actions: ['display_label_header'],
                },
            );

            // # Create the channel with only the control value set — TEST_FIELD_NAME stays unset.
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [{field_id: controlFieldId, value: requireOption(controlOptions, 'HIGH2')}],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

            // # Navigate to the channel.
            await assertOnReloadedApp(async () => {
                await openChannel(channel.name);

                // * The control chip renders, so the feature is live in the app.
                await waitFor(ChannelAttributeLabels.getChip(SECOND_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
            });

            // * The unset field contributes no chip of its own.
            await expect(ChannelAttributeLabels.getChip(TEST_FIELD_NAME)).not.toBeVisible();

            await ChannelScreen.back();
        });

        it('MM-T6303_1 - should render both chips inline when exactly 2 attributes are designated for the header', async () => {
            // # Create two header-designated fields.
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

            // # Create the channel with both values set at creation time.
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [
                    {field_id: field1Id, value: requireOption(opts1, 'HIGH')},
                    {field_id: field2Id, value: requireOption(opts2, 'HIGH2')},
                ],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

            // # Navigate to the channel. With MAX_VISIBLE_CHIPS=2 and exactly 2 fields, both fit
            // # inline and no overflow +N button should be shown.
            await assertOnReloadedApp(async () => {
                await openChannel(channel.name);

                // * Both chips visible.
                await waitFor(ChannelAttributeLabels.getChip(TEST_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
                await waitFor(ChannelAttributeLabels.getChip(SECOND_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
            });

            // * No overflow button — count equals MAX_VISIBLE_CHIPS exactly.
            await expect(ChannelAttributeLabels.overflow).not.toBeVisible();

            await ChannelScreen.back();
        });

        it('MM-T6304_1 - should not render attribute chips on a DM channel', async () => {
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_header'],
                },
            );

            // # Create a second user for the DM. DMs are server-global; no shared team needed.
            const {user: dmTarget} = await User.apiCreateUser(siteOneUrl);

            // # Create the DM and post a message so it appears in the sidebar.
            const {channel: dmChannel} = await Channel.apiCreateDirectChannel(siteOneUrl, [testUser.id, dmTarget.id]);
            testChannel = dmChannel;
            await Post.apiCreatePost(siteOneUrl, {channelId: dmChannel.id, message: 'hello'});

            // # Set an attribute value on the DM channel (server accepts it; mobile must not show it).
            await Properties.apiSetChannelAttributeValue(siteOneUrl, dmChannel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
            await device.reloadReactNative();

            await ChannelListScreen.toBeVisible();

            // # Navigate to the DM — DMs appear under 'direct_messages' category.
            // Channel item testIDs use channel.name, which for DMs is userId__userId,
            // NOT the other user's username.
            await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
            await wait(timeouts.TWO_SEC);
            await ChannelScreen.open('direct_messages', dmChannel.name);

            // * No chips on a DM.
            await ChannelAttributeLabels.toNotBeVisible();

            await ChannelScreen.back();
        });

        it('MM-T6305_1 - should show a set attribute in Channel Info even with no display location', async () => {
            // # Channel Info lists attributes by value, so a field shown nowhere else still appears.
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: [],
                },
            );

            // # Create the channel with the attribute value at creation time.
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [{field_id: channelFieldId, value: requireOption(optionIdsByName, 'MEDIUM')}],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            await assertOnReloadedApp(async () => {
                await openChannel(channel.name);

                // # Open Channel Info.
                await ChannelInfoScreen.open();

                // * The attributes section and the field row with a chip are visible.
                await waitFor(element(by.id('channel_info.attributes'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
                await waitFor(element(by.id(`channel_info.attributes.${TEST_FIELD_NAME}`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
                await waitFor(element(by.id(`channel_info.attributes.${TEST_FIELD_NAME}.chip`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            });

            await ChannelInfoScreen.close();
            await ChannelScreen.back();
        });

        it('MM-T6307_1 - should not show optional unset attribute row in Channel Info', async () => {
            // # Create an optional info-designated field.
            await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_info'],
                    required: false,
                },
            );

            // # A second info-designated field, this one set, is the control. An unset field and a
            // # switched-off feature both render nothing, so without it this test passes either way.
            const {channelFieldId: controlFieldId, optionIdsByName: controlOptions} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: SECOND_FIELD_NAME,
                    options: SECOND_FIELD_OPTIONS,
                    actions: ['display_label_info'],
                    required: false,
                },
            );

            // # Create the channel with only the control value set — TEST_FIELD_NAME stays unset.
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [{field_id: controlFieldId, value: requireOption(controlOptions, 'HIGH2')}],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

            await assertOnReloadedApp(async () => {
                await openChannel(channel.name);

                // # Open Channel Info.
                await ChannelInfoScreen.open();

                // * The control row renders, so the feature is live in the app.
                await waitFor(element(by.id(`channel_info.attributes.${SECOND_FIELD_NAME}`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            });

            // * The unset field contributes no row of its own.
            await expect(element(by.id(`channel_info.attributes.${TEST_FIELD_NAME}`))).not.toBeVisible();

            await ChannelInfoScreen.close();
            await ChannelScreen.back();
        });

        it('MM-T6308_1 - should render the channel attribute banner when designated with display_banner_top', async () => {
            const multi = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: BANNER_MULTI_FIELD_NAME,
                    fieldType: 'multiselect',
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_banner_top'],
                },
            );
            const select = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: BANNER_SELECT_FIELD_NAME,
                    fieldType: 'select',
                    options: SECOND_FIELD_OPTIONS,
                    actions: ['display_banner_top'],
                },
            );
            const text = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: BANNER_TEXT_FIELD_NAME,
                    fieldType: 'text',
                    actions: ['display_banner_top'],
                },
            );

            // # Create the channel with mixed banner attribute values and no classification.
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [
                    {
                        field_id: multi.channelFieldId,
                        value: [
                            requireOption(multi.optionIdsByName, 'HIGH'),
                            requireOption(multi.optionIdsByName, 'MEDIUM'),
                        ],
                    },
                    {field_id: select.channelFieldId, value: requireOption(select.optionIdsByName, 'HIGH2')},
                    {field_id: text.channelFieldId, value: 'operational note'},
                ],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

            // The banner renders only once all three values are on the channel, and values
            // supplied at creation time are not always readable back straight away. Confirm
            // the server has them before looking at the UI, so a value that never landed
            // fails here saying so rather than as an absent banner further down.
            const bannerFieldIds = [multi.channelFieldId, select.channelFieldId, text.channelFieldId];
            if (!await Properties.waitForChannelAttributeValues(siteOneUrl, channel.id, bannerFieldIds)) {
                throw new Error('MM-T6308_1: the banner attribute values were not set on the channel, so the banner cannot render');
            }

            await assertOnReloadedApp(async () => {
                await openChannel(channel.name);

                // * Every designated attribute contributes in field order.
                await waitFor(element(by.id('channel.banner'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
                await waitFor(element(by.text('HIGH, MEDIUM · HIGH2 · operational note'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            });

            await ChannelScreen.back();
        });

        it('MM-T6310_1 - should update the chip when the attribute value changes', async () => {
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_header'],
                },
            );

            // # Create the channel with HIGH as the initial value.
            const {channel, error: createError} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [{field_id: channelFieldId, value: requireOption(optionIdsByName, 'HIGH')}],
            });
            if (!channel?.id) {
                throw new Error(`failed to create the channel for MM-T6310_1: ${JSON.stringify(createError ?? 'no channel and no error')}`);
            }
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            await device.reloadReactNative();

            await ChannelListScreen.toBeVisible();
            await openChannel(channel.name);

            // * Chip shows HIGH initially.
            await waitFor(ChannelAttributeLabels.getChipValue(TEST_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

            // # Back out before changing the value so the app is on the channel list when reloaded.
            await ChannelScreen.back();

            // # Change the value to LOW via the API and reload.
            await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, requireOption(optionIdsByName, 'LOW'));
            await device.reloadReactNative();

            await ChannelListScreen.toBeVisible();
            await openChannel(channel.name);

            // * Chip now shows LOW; HIGH is no longer shown.
            await waitFor(ChannelAttributeLabels.getChipValue(TEST_FIELD_NAME)).toHaveText('LOW').withTimeout(timeouts.TEN_SEC);
            await waitFor(element(by.text('HIGH'))).not.toBeVisible().withTimeout(timeouts.FOUR_SEC);

            await ChannelScreen.back();
        });

        it('MM-T6312_1 - should render each value of a multi-valued header attribute as its own chip', async () => {
            // # Create a multiselect header-designated field with two values set — exactly
            // # MAX_VISIBLE_CHIP_VALUES, so both render inline with no overflow.
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: MULTI_VALUE_FIELD_NAME,
                    fieldType: 'multiselect',
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_header'],
                },
            );

            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [{
                    field_id: channelFieldId,
                    value: [requireOption(optionIdsByName, 'HIGH'), requireOption(optionIdsByName, 'MEDIUM')],
                }],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            await device.reloadReactNative();

            await ChannelListScreen.toBeVisible();
            await openChannel(channel.name);

            // * Each value is its own chip (indexed, since the field has more than one value),
            // * not a single chip with a joined "HIGH, MEDIUM" string.
            await waitFor(ChannelAttributeLabels.getChip(MULTI_VALUE_FIELD_NAME, 0)).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(ChannelAttributeLabels.getChipValue(MULTI_VALUE_FIELD_NAME, 0)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);
            await waitFor(ChannelAttributeLabels.getChip(MULTI_VALUE_FIELD_NAME, 1)).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(ChannelAttributeLabels.getChipValue(MULTI_VALUE_FIELD_NAME, 1)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);

            // * The old joined-string rendering ("HIGH, MEDIUM" as one chip) is not present.
            await expect(element(by.text('HIGH, MEDIUM'))).not.toExist();

            // * Exactly 2 value chips fit inline (the boundary), so no overflow button.
            await expect(ChannelAttributeLabels.overflow).not.toBeVisible();

            await ChannelScreen.back();
        });

        it('MM-T6313_1 - should overflow a single attribute\'s excess values and list all its values in the +N sheet', async () => {
            // # Create a multiselect header-designated field with three values set — one more
            // # than MAX_VISIBLE_CHIP_VALUES, so the third value alone must trigger overflow
            // # even though it is the only designated attribute.
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: MULTI_VALUE_FIELD_NAME,
                    fieldType: 'multiselect',
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_header'],
                },
            );

            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [{
                    field_id: channelFieldId,
                    value: [
                        requireOption(optionIdsByName, 'HIGH'),
                        requireOption(optionIdsByName, 'MEDIUM'),
                        requireOption(optionIdsByName, 'LOW'),
                    ],
                }],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            await device.reloadReactNative();

            await ChannelListScreen.toBeVisible();
            await openChannel(channel.name);

            // * The first two values are visible inline; the third is not rendered inline at all.
            await waitFor(ChannelAttributeLabels.getChipValue(MULTI_VALUE_FIELD_NAME, 0)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);
            await waitFor(ChannelAttributeLabels.getChipValue(MULTI_VALUE_FIELD_NAME, 1)).toHaveText('MEDIUM').withTimeout(timeouts.TEN_SEC);
            await expect(ChannelAttributeLabels.getChip(MULTI_VALUE_FIELD_NAME, 2)).not.toExist();

            // * The overflow button is visible, and opening it lists the whole attribute — all
            // * three values, each its own chip, not only the one hidden from the header.
            await waitFor(ChannelAttributeLabels.overflow).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await ChannelAttributeLabels.overflow.tap();
            await waitFor(ChannelAttributeLabels.overflowSheet).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(ChannelAttributeLabels.getSheetChipValue(MULTI_VALUE_FIELD_NAME, 0)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);
            await expect(ChannelAttributeLabels.getSheetChipValue(MULTI_VALUE_FIELD_NAME, 1)).toHaveText('MEDIUM');
            await expect(ChannelAttributeLabels.getSheetChipValue(MULTI_VALUE_FIELD_NAME, 2)).toHaveText('LOW');

            // # Close the sheet first: it covers the header back button.
            await ChannelAttributeLabels.closeOverflowSheet();
            await ChannelScreen.back();
        });

        it('MM-T6314_1 - should render each value of a multi-valued attribute as its own chip in Channel Info', async () => {
            // # Create a multiselect info-designated field with three values set — Channel Info
            // # does not paginate, so all three should render as separate chips in one row.
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: MULTI_VALUE_FIELD_NAME,
                    fieldType: 'multiselect',
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_info'],
                },
            );

            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
                teamId: testTeam.id,
                prefix: 'channel',
                propertyValues: [{
                    field_id: channelFieldId,
                    value: [
                        requireOption(optionIdsByName, 'HIGH'),
                        requireOption(optionIdsByName, 'MEDIUM'),
                        requireOption(optionIdsByName, 'LOW'),
                    ],
                }],
            });
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            await device.reloadReactNative();

            await ChannelListScreen.toBeVisible();
            await openChannel(channel.name);

            await ChannelInfoScreen.open();

            // * All three values are visible as separate, indexed chips in the same row.
            await waitFor(element(by.id(`channel_info.attributes.${MULTI_VALUE_FIELD_NAME}.chip.0`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(element(by.text('HIGH'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(element(by.id(`channel_info.attributes.${MULTI_VALUE_FIELD_NAME}.chip.1`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(element(by.text('MEDIUM'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(element(by.id(`channel_info.attributes.${MULTI_VALUE_FIELD_NAME}.chip.2`))).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(element(by.text('LOW'))).toBeVisible().withTimeout(timeouts.TEN_SEC);

            // * The old joined-string rendering (all three values folded into one chip) is
            // * not present, in any value order the join could have produced.
            await expect(element(by.text('HIGH, MEDIUM, LOW'))).not.toExist();

            await ChannelInfoScreen.close();
            await ChannelScreen.back();
        });
    });
});
