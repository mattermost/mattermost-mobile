// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    makeChannelAttributeFieldNames,
    openChannel,
    requireOption,
    TEST_FIELD_OPTIONS,
} from '@support/channel_attributes_fixtures';
import {disableChannelAttributes, enableChannelAttributes} from '@support/channel_attributes_test_helper';
import {enableClassificationMarkings} from '@support/classification_test_helper';
import {Channel, Properties, Team, User} from '@support/server_api';
import {canMutateServer, requireMutationServer} from '@support/server_role';
import {hasChannelAttributes, serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelAttributeLabels} from '@support/ui/component';
import {ChannelInfoScreen, ChannelListScreen, ChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {device, waitFor} from 'detox';

jest.setTimeout(timeouts.ONE_MIN * 30);

const {TEST_FIELD_NAME, ALL_TEST_FIELD_NAMES} = makeChannelAttributeFieldNames();

// Turns ChannelAttributes off and creates a required attribute, both server-wide, so this runs
// alone on the mutation server (detox/e2e/server_mutation_specs.json).
(hasChannelAttributes ? describe : describe.skip)('Channel Attributes - Flag off and required attributes', () => {
    const serverOneDisplayName = 'Server 1';

    // False when the flag could not be confirmed off; the flag-off beforeAll then fails so its
    // tests are not reported as passed.
    let canControlFlag = false;

    let testUser: any;
    let testTeam: any;
    let testChannel: any = null;

    beforeAll(async () => {
        requireMutationServer('channel_attributes_flag_off');

        // A required field left by an interrupted run blocks channel creation, so clear first.
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [...ALL_TEST_FIELD_NAMES]);
        await enableChannelAttributes(siteOneUrl);

        const teamResult = await Team.apiCreateTeam(siteOneUrl, {prefix: 'team'});
        testTeam = teamResult.team;
        const userResult = await User.apiCreateUser(siteOneUrl, {prefix: 'user'});
        testUser = userResult.user;
        await Team.apiAddUserToTeam(siteOneUrl, testUser.id, testTeam.id);

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
    });

    afterAll(async () => {
        if (!canMutateServer) {
            await HomeScreen.logout();
            return;
        }

        try {
            await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [...ALL_TEST_FIELD_NAMES]);

            // Hand the server back at baseline for the next spec on it.
            await enableChannelAttributes(siteOneUrl);
        } finally {
            await HomeScreen.logout();
        }
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        if (!canMutateServer) {
            return;
        }
        if (testChannel) {
            await Channel.apiDeleteChannel(siteOneUrl, testChannel.id);
            testChannel = null;
        }
        await Properties.apiCleanupChannelAttributeFields(siteOneUrl, [...ALL_TEST_FIELD_NAMES]);
    });

    describe('with a required attribute', () => {
        it('MM-T6306_1 - should show "Not set" for a required attribute with no value in Channel Info', async () => {
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
            await waitFor(ChannelInfoScreen.attributes).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(ChannelInfoScreen.getAttributeRow(TEST_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);
            await waitFor(ChannelInfoScreen.getAttributeNotSet(TEST_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

            await ChannelInfoScreen.close();
            await ChannelScreen.back();
        });
    });

    describe('with the flag off', () => {
        beforeAll(async () => {
            canControlFlag = await disableChannelAttributes(siteOneUrl);

            // Fail here: tests that return early are recorded by Jest as passed.
            if (!canControlFlag) {
                throw new Error(
                    'disableChannelAttributes could not confirm FeatureFlagChannelAttributes ' +
                    'is off, so the flag-off tests below have no pre-condition to assert ' +
                    'against and are not being reported as passed.',
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
            await waitFor(ChannelScreen.banner).not.toExist().withTimeout(timeouts.TEN_SEC);

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
