// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {disableChannelAttributes, enableChannelAttributes} from '@support/channel_attributes_test_helper';
import {acquireClassificationLock, createClassificationLockOwner, releaseClassificationLock} from '@support/classification_lock';
import {Channel, Properties, Team, User} from '@support/server_api';
import {serverOneUrl, siteOneUrl} from '@support/test_config';
import {ChannelAttributeForm, ChannelAttributeLabels, ChannelInfoAttributes} from '@support/ui/component';
import {ChannelInfoScreen, ChannelListScreen, ChannelScreen, CreateOrEditChannelScreen, HomeScreen, LoginScreen, ServerScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {by, device, element, expect, waitFor} from 'detox';

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

// One required, member-settable field; one required, sysadmin-only field; one
// optional field. All three ever created by this suite, so cleanup can target
// them by name regardless of which test created which.
const REQUIRED_FIELD_NAME = 'createrequired';
const SYSADMIN_FIELD_NAME = 'createsysadmin';
const OPTIONAL_FIELD_NAME = 'createoptional';
const ALL_FIELD_NAMES = [REQUIRED_FIELD_NAME, SYSADMIN_FIELD_NAME, OPTIONAL_FIELD_NAME];

const DISPLAY_ACTIONS = ['display_label_info', 'display_label_header'];

function assertStoredValue(fieldName: string, stored: unknown, expected: string) {
    if (stored !== expected) {
        throw new Error(`Expected the server to hold "${expected}" for ${fieldName}, got ${JSON.stringify(stored)}`);
    }
}

describe('Channel Attributes - Setting values at channel creation', () => {
    const serverOneDisplayName = 'Server 1';
    let lockOwner = '';
    let lockAcquired = false;
    let canControlFlag = false;
    let testUser: any;
    let testTeam: any;
    let testChannel: any = null;

    beforeAll(async () => {
        lockOwner = createClassificationLockOwner();
        await acquireClassificationLock(siteOneUrl, lockOwner);
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
            await HomeScreen.logout();
        } finally {
            await releaseClassificationLock(siteOneUrl, lockOwner);
        }
    });

    beforeEach(async () => {
        await ChannelListScreen.toBeVisible();
    });

    afterEach(async () => {
        if (!lockAcquired) {
            return;
        }

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
        if (canControlFlag) {
            try {
                await disableChannelAttributes(siteOneUrl);
            } catch (error) {
                cleanupError ??= error;
            }
        }

        if (cleanupError) {
            throw cleanupError;
        }
    });

    /**
     * Creates one channel-attribute field and reloads the app so it is actually
     * picked up before the next screen opens.
     *
     * fetchAccessControlAttributeFields caches its result for an hour
     * (EphemeralStore.shouldFetchClassificationBanner) and only force-refetches on
     * a websocket reconnect, or on a create/update event for a field arriving
     * while the access-control group id is still unknown locally. Once another
     * suite sharing this app install has already learned the group id — which the
     * shared advisory lock makes likely in a real run — a field created here would
     * otherwise sit uncollected behind that cache for up to an hour. Reloading
     * forces the reconnect path (see fetchAccessControlAttributeFields(serverUrl,
     * true) in @actions/websocket/index.ts), the same way setupChannelWithAttribute
     * does in channel_attributes_editing.e2e.ts.
     */
    async function setupChannelAttributeField(opts: Parameters<typeof Properties.apiSetupChannelAttributeField>[1]) {
        const result = await Properties.apiSetupChannelAttributeField(siteOneUrl, opts);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        return result;
    }

    async function tapCreateAndWaitForChannelWithAttributes() {
        const errorText = element(by.id('edit_channel_info.error.text'));
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

    /**
     * Fills the display name and taps Create, waiting for the channel screen.
     */
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
        await enableChannelAttributes(siteOneUrl);
        const {channelFieldId} = await setupChannelAttributeField({
            fieldName: REQUIRED_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'member',
            required: true,
        });

        await CreateOrEditChannelScreen.openCreateChannel();
        await ChannelAttributeForm.toBeVisible();

        // * The row sits above Purpose: both are on screen without scrolling past
        // one another, and the attribute row renders unset.
        await expect(CreateOrEditChannelScreen.purposeInput).toBeVisible();
        await waitFor(ChannelAttributeForm.getNotSet(REQUIRED_FIELD_NAME)).toBeVisible().withTimeout(timeouts.TEN_SEC);

        await CreateOrEditChannelScreen.displayNameInput.replaceText('created-town-square');

        // * Create stays disabled: a valid name is not enough while the required
        // attribute is unset. Tapping it is a no-op — the screen does not dismiss
        // and no request was even sent (the screen remaining visible alone would
        // not rule out a server rejection producing the same outcome).
        await CreateOrEditChannelScreen.createButton.tap();
        await wait(timeouts.ONE_SEC);
        await expect(CreateOrEditChannelScreen.createOrEditChannelScreen).toBeVisible();
        await expect(element(by.id('edit_channel_info.error.text'))).not.toExist();

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

        // * The created channel already carries the value: in the header chip and
        // in Channel Info, with no extra edit needed.
        await ChannelAttributeLabels.toBeVisible();
        await waitFor(ChannelAttributeLabels.getChipValue(REQUIRED_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        await ChannelInfoScreen.open();
        await ChannelInfoAttributes.toBeVisible();
        await waitFor(ChannelInfoAttributes.getChipValue(REQUIRED_FIELD_NAME)).toHaveText('HIGH').withTimeout(timeouts.TEN_SEC);

        assertStoredValue(REQUIRED_FIELD_NAME, await Properties.apiGetChannelAttributeValue(siteOneUrl, channel.id, channelFieldId), OPTION_IDS.high);

        await ChannelInfoScreen.close();
        await ChannelScreen.back();
    });

    it('MM-T6330_4 - should not offer any attribute when the feature is disabled', async () => {
        if (!canControlFlag) {
            throw new Error('MM-T6330_4 requires a server where ChannelAttributes can be disabled');
        }

        // The field exists server-side, same as it would the moment after an
        // administrator disables the feature with configured attributes already
        // in place — only the client-side gate is under test here.
        await setupChannelAttributeField({
            fieldName: REQUIRED_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'member',
            required: true,
        });

        await CreateOrEditChannelScreen.openCreateChannel();

        await ChannelAttributeForm.toNotBeVisible();
        await expect(CreateOrEditChannelScreen.purposeInput).toBeVisible();

        await CreateOrEditChannelScreen.close();
    });

    it('MM-T6330_2 - should not offer an optional attribute at creation', async () => {
        await enableChannelAttributes(siteOneUrl);
        await setupChannelAttributeField({
            fieldName: OPTIONAL_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'member',
            required: false,
        });

        await CreateOrEditChannelScreen.openCreateChannel();

        // * No attribute section at all: an optional attribute is reachable later
        // from Channel Info, not offered here.
        await ChannelAttributeForm.toNotBeVisible();
        await expect(CreateOrEditChannelScreen.purposeInput).toBeVisible();

        // "New channel" is dismissed with its own close (X) button, not the native
        // back arrow — there is no "Navigate up" affordance on this screen.
        await CreateOrEditChannelScreen.close();
    });

    it('MM-T6330_3 - should drop a required attribute the creator cannot set, and still allow creation', async () => {
        await enableChannelAttributes(siteOneUrl);
        const {channelFieldId} = await setupChannelAttributeField({
            fieldName: SYSADMIN_FIELD_NAME,
            options: FIELD_OPTIONS,
            actions: DISPLAY_ACTIONS,
            permissionValues: 'sysadmin',
            required: true,
        });

        await CreateOrEditChannelScreen.openCreateChannel();

        // * The sysadmin-only field never appears: an ordinary member cannot
        // satisfy it, and the server itself skips it for a caller who cannot set
        // it, so creation must not be gated on it either.
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
