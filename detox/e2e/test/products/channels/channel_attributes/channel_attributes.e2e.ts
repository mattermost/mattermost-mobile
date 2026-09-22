// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {disableChannelAttributes, enableChannelAttributes} from '@support/channel_attributes_test_helper';
import {acquireClassificationLock, createClassificationLockOwner, releaseClassificationLock} from '@support/classification_lock';
import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Channel, Post, Properties, Team, User} from '@support/server_api';
import {canDisableChannelAttributes, hasChannelAttributes, serverOneUrl, siteOneUrl} from '@support/test_config';
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
const BANNER_MULTI_FIELD_NAME = 'banner_multi';
const BANNER_SELECT_FIELD_NAME = 'banner_select';
const BANNER_TEXT_FIELD_NAME = 'banner_text';

// All test field names in one place so cleanup calls stay consistent if a new
// field is ever added to the suite.
const ALL_TEST_FIELD_NAMES = [
    TEST_FIELD_NAME,
    SECOND_FIELD_NAME,
    BANNER_MULTI_FIELD_NAME,
    BANNER_SELECT_FIELD_NAME,
    BANNER_TEXT_FIELD_NAME,
] as const;
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

const ATTRIBUTE_RENDER_ATTEMPTS = 3;

/**
 * Run the navigation and assertions against a freshly reloaded app, retrying the whole cycle.
 *
 * The app reads the client config once at start and keeps its own copy, while the server
 * propagates a FeatureFlags change asynchronously — it has been seen still reporting the old
 * value after a patch the config API had already acknowledged. A single reload can therefore
 * bring the app up with ChannelAttributes still off, which renders none of the attribute UI.
 * Only another reload clears that; a longer timeout on the first attempt cannot, because the
 * app never re-reads the config while it is running.
 */
async function assertOnReloadedApp(steps: () => Promise<void>) {
    let lastError: unknown;

    /* eslint-disable no-await-in-loop -- each attempt reloads the app the previous one left behind */
    for (let attempt = 1; attempt <= ATTRIBUTE_RENDER_ATTEMPTS; attempt++) {
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        try {
            await steps();
            return;
        } catch (error) {
            lastError = error;
        }
    }
    /* eslint-enable no-await-in-loop */

    throw lastError;
}

// FeatureFlagChannelAttributes exists on server master (v12.0+) only. On 11.x the key is absent,
// so enableChannelAttributes() can never succeed and every test here fails in beforeAll.
(hasChannelAttributes ? describe : describe.skip)('Channel Attributes - Header chips and Channel Info section', () => {
    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let lockAcquired = false;

    // False when the server controls FeatureFlagChannelAttributes via an env var and
    // the config API cannot override it. Set once by the flag-off block below; the
    // tests there skip themselves when this is false.
    let canControlFlag = false;

    let testUser: any;
    let testTeam: any;

    // Set per-test; cleared and deleted in afterEach. null = no regular channel created this test.
    let testChannel: any = null;

    beforeAll(async () => {
        // Share the classification lock: this suite mutates FeatureFlags and the
        // access_control property group, the same server-global state the
        // classification banner suites own. A separate lock let this suite turn
        // ClassificationMarkings off under those tests.
        lockOwner = createClassificationLockOwner();
        await acquireClassificationLock(siteOneUrl, lockOwner);
        lockAcquired = true;

        // Defensive cleanup — a prior interrupted run may have left required attribute fields that
        // would block channel creation. Do this before any channel is created.
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [...ALL_TEST_FIELD_NAMES]);

        // One write for the whole run. The flag is server-global on a site ~14 shards
        // share, and every write makes the server reload its config for all of them, so
        // the suite sets it here, runs everything that needs it on, and flips it once for
        // the flag-off block at the end — not around every test.
        await enableChannelAttributes(siteOneUrl);

        // Create a shared team and user. Channels are created per-test so that each test can
        // supply property_values at creation time matching its required attribute fields.
        const teamResult = await Team.apiCreateTeam(siteOneUrl, {prefix: 'team'});
        testTeam = teamResult.team;
        const userResult = await User.apiCreateUser(siteOneUrl, {prefix: 'user'});
        testUser = userResult.user;
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeam.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);

        // The hook gets its own budget so the lock wait does not have to fit inside the
        // per-test timeout above. See DEFAULT_TIMEOUT_MS in classification_lock_core.
    }, timeouts.ONE_MIN * 50);

    afterAll(async () => {
        if (!lockAcquired) {
            return;
        }

        try {
            await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [...ALL_TEST_FIELD_NAMES]);

            // ChannelAttributes is left where the flag-off block put it. Like
            // ClassificationMarkings is deliberately NOT unset here. It is server-global
            // and ~10 shards share each provisioned server. See the invariant in
            // global_classification_banner.e2e.ts.
            await HomeScreen.logout();
        } finally {
            await releaseClassificationLock(siteOneUrl, lockOwner);
        }
    });

    beforeEach(async () => {
        // Every test starts from the channel list. If a previous test left the app on the channel
        // screen or channel info sheet, Detox navigation will desync without this guard.
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        if (!lockAcquired) {
            return;
        }

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

        it('MM-T6305_1 - should show the attribute row in Channel Info when designated for display_label_info', async () => {
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_info'],
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

        // Skipped: a required channel attribute is server-global, so while this runs every other
        // shard's POST /channels fails with missing_required_attributes. The `not_set` rendering it
        // covered is now held by channel_info_attributes.test.tsx; what is still missing is the
        // end-to-end path from a server-side required field to that row. Re-homing, not deleting:
        // site 2 is not a home (server_list.e2e.ts creates channels there), and SITE_3 plus
        // siteThreeLock is the right shape, but that lock is already contended at a 40-minute budget,
        // so it belongs in its own PR with device verification.
        it.skip('MM-T6306_1 - should show "Not set" for a required attribute with no value in Channel Info', async () => {
            // # Create the channel BEFORE the required attribute field exists. The server enforces
            // # required attribute values only at channel creation time. Creating the field after the
            // # channel means the existing channel has no value — exactly what we want to verify.
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);

            // # Now create the required field (no value set on the channel).
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
            await openChannel(channel.name);

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
    });

    // Skipped as a block when the installation supplies FeatureFlags.ChannelAttributes itself:
    // the flag cannot be turned off, so these cases have no pre-condition to assert against.
    // Skipping reports them as not executed. They used to return early from each test, which
    // Jest records as passed — three green tests that never ran, indistinguishable from three
    // that verified the flag-off behaviour.
    (canDisableChannelAttributes ? describe : describe.skip)('with the flag off', () => {
        beforeAll(async () => {
            // The only other flag write in the suite; see beforeAll above. global_setup has
            // already established the server allows it, so a failure here is a real one.
            canControlFlag = await disableChannelAttributes(siteOneUrl);
            if (!canControlFlag) {
                // Only what the helper actually established: it returns false both when the
                // patch call fails and when the client config never reports false before its
                // poll ends, so neither cause can be claimed here.
                throw new Error(
                    'disableChannelAttributes could not confirm FeatureFlagChannelAttributes ' +
                    'is off (the patch failed, or the client config did not report false ' +
                    'before polling ended), so the flag-off cases have no pre-condition.',
                );
            }
        });

        it('MM-T6300_1 - should not render attribute chips in the header when ChannelAttributes flag is off', async () => {
            // # Create a header-designated attribute field.
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_label_header'],
                },
            );

            // # Create the channel and add the user. Flag is off so property_values at creation
            // # are ignored by the server; set the value via PATCH after creation.
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
            await device.reloadReactNative();

            // # Navigate to the channel.
            await ChannelListScreen.toBeVisible();
            await openChannel(channel.name);

            // * No chips row should be visible with the flag off.
            await ChannelAttributeLabels.toNotBeVisible();

            await ChannelScreen.back();
        });

        it('MM-T6309_1 - should not show channel attribute banner when the flag is off', async () => {
            // # ChannelAttributes flag is off. Create field and channel, then PATCH the value
            // # (property_values at creation are ignored by the server when the flag is off).
            const {channelFieldId, optionIdsByName} = await Properties.apiSetupChannelAttributeField(
                siteOneUrl,
                {
                    fieldName: TEST_FIELD_NAME,
                    options: TEST_FIELD_OPTIONS,
                    actions: ['display_banner_top'],
                },
            );

            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
            await device.reloadReactNative();

            await ChannelListScreen.toBeVisible();
            await openChannel(channel.name);

            // * The banner component returns null when the gate fails; use not.toExist() not
            // * not.toBeVisible() — a null-returned component has no element in the hierarchy at all.
            // * Use waitFor with a timeout: after reload the WatermelonDB may briefly hold a
            // * stale FeatureFlagChannelAttributes=true value (from the previous banner test)
            // * until the fresh server config sync completes.
            await waitFor(element(by.id('channel.banner'))).not.toExist().withTimeout(timeouts.TEN_SEC);

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

            // # Create the channel and set the value via PATCH (ChannelAttributes flag is off so
            // # property_values at creation are ignored by the server).
            const {channel} = await Channel.apiCreateChannel(siteOneUrl, {teamId: testTeam.id, prefix: 'channel'});
            testChannel = channel;
            await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
            await Properties.apiSetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId, requireOption(optionIdsByName, 'HIGH'));
            await device.reloadReactNative();

            await ChannelListScreen.toBeVisible();
            await openChannel(channel.name);

            // * No channel attribute chips because ChannelAttributes flag is off.
            await ChannelAttributeLabels.toNotBeVisible();

            await ChannelScreen.back();
        });
    });
});
