// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {MmBlocksTestHelper} from '@support/mm_blocks_test_helper';
import {hasStableWebhookIngress} from '@support/test_config';
import {ChannelScreen, HomeScreen, InteractiveDialogScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

// Every case needs Mattermost→sidecar reachability: the dialog only exists after the
// post action callback reaches the webhook sidecar, so gate the whole suite.
const describeBlocksDialog = hasStableWebhookIngress ? describe : describe.skip;

// Midday UTC keeps the calendar day stable whatever timezone the simulator runs in.
const EVENT_DATE = '2030-03-16';
const MEETING_DATE = '2030-03-17';

describeBlocksDialog('Interactive mm_blocks - blocks dialog date and time', () => {
    let testChannel: any;

    beforeAll(async () => {
        await MmBlocksTestHelper.requireWebhookSidecar();
        const setup = await MmBlocksTestHelper.setupChannelTest();
        testChannel = setup.channel;
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

    it('MM-T6270_1 - should pick a date and a datetime from the native pickers and submit them', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks datetime basic');

        // # Open the dialog with a date_input and a datetime_input
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open datetime basic',
            scenario: 'datetime_basic',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox DateTime');

        // * Verify the date_input exposes only a date row while the datetime_input also has a time row
        await expect(element(by.id(InteractiveDialogScreen.dateSelectButtonTestID('event_date')))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.dateTimeButtonTestID('event_date')))).not.toExist();
        await expect(element(by.id(InteractiveDialogScreen.dateTimeTimeButtonTestID('meeting_time')))).toExist();

        // # Drive the native pickers so each field commits a value
        await MmBlocksTestHelper.pickDialogDate('event_date', `${EVENT_DATE}T12:00:00Z`);
        await MmBlocksTestHelper.pickDialogDate('meeting_time', `${MEETING_DATE}T12:00:00Z`, 'datetime_input');

        // # Submit
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the dialog closed and both values reached the integration. date_input
        // * submits YYYY-MM-DD, datetime_input submits an ISO timestamp.
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining(`event_date=${EVENT_DATE}`),
            timeouts.TWENTY_SEC,
        );
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining(`meeting_time=${MEETING_DATE}T`),
        );
    });

    it('MM-T6271_1 - should populate date fields from relative initial values', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks datetime relative');

        // # Open the dialog whose fields default to "today" and "+1d"
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open datetime relative',
            scenario: 'datetime_relative',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // * Verify both pickers render
        await expect(element(by.id(InteractiveDialogScreen.dateSelectButtonTestID('relative_date')))).toExist();
        await expect(element(by.id(InteractiveDialogScreen.dateTimeSelectButtonTestID('relative_datetime')))).toExist();

        // # Submit without touching the pickers
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify relative tokens were resolved client-side and submitted as a calendar date
        // * and an ISO datetime (not the raw "today" / "+1d" strings). Exact clock/timezone
        // * varies by device, so only the shapes are asserted. Detox by.text(RegExp) must
        // * match the entire TextView, hence the leading/trailing .*.
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            /.*relative_date=\d{4}-\d{2}-\d{2}&relative_datetime=\d{4}-\d{2}-\d{2}T.*/,
            timeouts.TWENTY_SEC,
        );
    });
});
