// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MmBlocksTestHelper} from '@support/mm_blocks_test_helper';
import {hasStableWebhookIngress} from '@support/test_config';
import {ChannelScreen, HomeScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

// Every case needs Mattermost→sidecar reachability: the dialog only exists after the
// post action callback reaches the webhook sidecar, so gate the whole suite.
const describeBlocksDialog = hasStableWebhookIngress ? describe : describe.skip;

const REQUIRED_FIELD_ERROR = 'This field is required.';
const FIX_FIELD_ERRORS = 'Please fix all field errors';

describeBlocksDialog('Interactive mm_blocks - blocks dialog selects', () => {
    let testChannel: any;
    let testUser: any;

    beforeAll(async () => {
        await MmBlocksTestHelper.requireWebhookSidecar();
        const setup = await MmBlocksTestHelper.setupChannelTest();
        testChannel = setup.channel;
        testUser = setup.user;
    });

    beforeEach(() => {
        MmBlocksTestHelper.assertSuiteRunnable();
    });

    afterEach(async () => {
        try {
            await MmBlocksTestHelper.dismissBlocksDialogIfOpen();
            await MmBlocksTestHelper.ensureOnChannelScreen();
        } catch {
            // Next test will re-assert / abort if the suite is blocked.
        }
    });

    afterAll(async () => {
        try {
            await MmBlocksTestHelper.dismissBlocksDialogIfOpen();
            await MmBlocksTestHelper.ensureOnChannelScreen();
            await ChannelScreen.back();
        } catch {
            // Relaunch recovery may already be on the channel list.
        }
        await HomeScreen.logout();
    });

    it('MM-T6262_1 - should show initial_options as the multiselect value', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks multiselect defaults');

        // # Open the multiselect dialog that ships initial_options opt1 and opt3
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open multiselect defaults',
            scenario: 'multiselect_defaults',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // * Verify the defaults are resolved to their option labels
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox Multiselect');
        await expect(element(by.text('Engineering, Marketing'))).toExist();
    });

    it('MM-T6263_1 - should add and remove multiselect options and submit the remaining values', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks multiselect submit');

        // # Open the multiselect dialog with no preselected options
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open multiselect',
            scenario: 'multiselect',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Select Sales and Support, then tap Support again to deselect it
        await MmBlocksTestHelper.selectMultiInputOptions('multiselect_options', ['opt2', 'opt4', 'opt4']);

        // * Verify only the still-selected option is shown on the field
        await expect(element(by.text('Sales'))).toExist();

        // # Satisfy the required multi user select, then submit
        await MmBlocksTestHelper.selectMultiInputUser('multiselect_users', testUser.id, testUser.username);
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the dialog closed and only the kept values reached the integration
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining(`multiselect_options=opt2&multiselect_users=${testUser.id}`),
            timeouts.TWENTY_SEC,
        );
    });

    it('MM-T6264_1 - should block submit while a required multiselect is empty', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks multiselect required');

        // # Open the multiselect dialog with no preselected options
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open multiselect required',
            scenario: 'multiselect',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Submit without touching the required selects
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify client validation kept the dialog open and flagged the empty fields
        await MmBlocksTestHelper.blocksDialogToBeVisible();
        await MmBlocksTestHelper.expectDialogFieldError(REQUIRED_FIELD_ERROR);
        await MmBlocksTestHelper.expectDialogTopLevelError(FIX_FIELD_ERRORS);
    });

    it('MM-T6265_1 - should search a dynamic select and submit the looked-up option', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dynamic select');

        // # Open the dialog whose selects resolve options through the lookup integration
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open dynamic select',
            scenario: 'dynamic',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox Dynamic Select');

        // # Search the required dynamic select and pick the matching option
        await MmBlocksTestHelper.searchAndSelectDynamicOption('dynamic_role_selector', 'Gam', 'Gamma');

        // # Submit
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the looked-up value and the optional select's initial_option were submitted
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining('dynamic_role_selector=opt_gamma&optional_dynamic_selector=opt_beta'),
            timeouts.TWENTY_SEC,
        );
    });

    it('MM-T6266_1 - should submit ids picked from the users and channels selects', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks users channels');

        // # Open the dialog with a users select and a channels select
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open users and channels',
            scenario: 'users_channels',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox Users Channels');

        // # Pick a user and a channel
        await MmBlocksTestHelper.selectInputUser('someuserselector', testUser.id, testUser.username);
        await MmBlocksTestHelper.selectInputChannel('somechannelselector', testChannel.id, testChannel.display_name);

        // # Submit
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify both selects submitted ids rather than display values
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining(
                `somechannelselector=${testChannel.id}&someuserselector=${testUser.id}`,
            ),
            timeouts.TWENTY_SEC,
        );
    });
});
