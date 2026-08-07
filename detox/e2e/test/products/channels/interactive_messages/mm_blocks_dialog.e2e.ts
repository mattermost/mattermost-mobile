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
import {getRandomId, timeouts} from '@support/utils';
import {expect} from 'detox';

// Every case needs Mattermost→sidecar reachability: the dialog only exists after the
// post action callback reaches the webhook sidecar, so gate the whole suite.
const describeBlocksDialog = hasStableWebhookIngress ? describe : describe.skip;

// Action ids served by MM_BLOCKS_ACTION in detox/utils/webhook_utils.js.
const DIALOG_ACTION = {
    refresh: 'detox_dialog_refresh',
    errors: 'detox_dialog_errors',
    error: 'detox_dialog_error',
    goto: 'detox_dialog_goto',
};

// dialogs/open adds a Mattermost→sidecar→websocket round trip on top of the action.
const OPEN_VIA_TRIGGER_TIMEOUT = timeouts.TWENTY_SEC;

describeBlocksDialog('Interactive mm_blocks - blocks dialog', () => {
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

    it('MM-T6250_1 - should open a blocks dialog through dialogs/open with the action trigger_id', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog open');

        // # Post a button whose integration calls dialogs/open with the action trigger_id
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open via dialogs/open',
            actionId: 'detox_dialog_open_trigger',
            integrationPath: '/mm_blocks_dialog_open',
        });
        await MmBlocksTestHelper.waitForPostText(marker);

        // # Open the dialog
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId, OPEN_VIA_TRIGGER_TIMEOUT);

        // * Verify the dialogs/open fixture is the one rendered
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox Blocks (open)');
        await expect(element(by.id('mm_blocks.text_input.title.input'))).toExist();
    });

    it('MM-T6251_1 - should open a blocks dialog from a type:dialog post action response', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog return');

        // # Post a button whose integration answers with type:dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open via return dialog',
        });
        await MmBlocksTestHelper.waitForPostText(marker);

        // # Open the dialog
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // * Verify the type:dialog fixture is the one rendered
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox Blocks (return)');
        await expect(element(by.id('mm_blocks.text_input.title.input'))).toExist();
    });

    it('MM-T6252_1 - should render every supported form field type inside the dialog', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog render');

        // # Open the full-field dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open for render',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // * Verify text inputs render inline, with the initial value applied
        await expect(element(by.id('mm_blocks.text_input.title.input'))).toHaveText('Demo ticket');
        await expect(element(by.id('mm_blocks.text_input.email.input'))).toExist();
        await expect(element(by.id('mm_blocks.text_input.description.input'))).toExist();

        // * Verify the bool input starts on
        await expect(element(by.id('mm_blocks.bool_input.enabled.toggled.true.button'))).toExist();

        // * Verify the picker row, the expanded radio row and the dynamic lookup row
        await expect(element(by.id('mm_blocks.select_input.priority.select.button'))).toExist();
        await expect(element(by.id('mm_blocks.select_input.severity.radio.sev2.button'))).toExist();
        await expect(element(by.id('mm_blocks.select_input.pick.select.button'))).toExist();

        // * Verify date, datetime and file fields render
        await expect(element(by.id('mm_blocks.date_input.due_date.select.button'))).toExist();
        await expect(element(by.id('mm_blocks.datetime_input.meeting_at.select.button'))).toExist();
        await expect(element(by.id('mm_blocks.file_input.attachments.choose_file.button'))).toExist();

        // * Verify dialog chrome and the in-form action buttons render
        await expect(element(by.id('interactive_dialog.submit.button'))).toExist();
        await expect(element(by.id('interactive_dialog.cancel.button'))).toExist();
        await expect(element(by.id(`mm_blocks.button.${DIALOG_ACTION.refresh}`))).toExist();
        await expect(element(by.id(`mm_blocks.button.${DIALOG_ACTION.errors}`))).toExist();
    });

    it('MM-T6253_1 - should send the edited form values to the integration on submit', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog submit');
        const titleValue = `Detox dialog title ${getRandomId()}`;

        // # Open the full-field dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open for submit',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Edit one field of each inline kind
        await MmBlocksTestHelper.setDialogTextInput('title', titleValue);
        await MmBlocksTestHelper.setDialogTextInput('email', 'detox@example.com');
        await MmBlocksTestHelper.toggleBoolInput('enabled', true);
        await MmBlocksTestHelper.selectInputOption('priority', 'High');
        await MmBlocksTestHelper.selectRadioInputOption('severity', 'sev1');

        // # Submit
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the dialog closed and the integration answered with an ephemeral
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.DIALOG_SUBMIT_OK_MESSAGE,
            timeouts.TWENTY_SEC,
        );

        // * Verify the received values. The sidecar echoes `key=value` sorted by key, so
        // * these groups are contiguous: email→enabled and priority→severity→title.
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining('email=detox@example.com&enabled=false'),
        );
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining(`priority=high&severity=sev1&title=${titleValue}`),
        );
    });

    it('MM-T6254_1 - should run the cancel action when the dialog is cancelled', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog cancel');

        // # Open the full-field dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open for cancel',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Cancel
        await MmBlocksTestHelper.cancelBlocksDialog();

        // * Verify the dialog closed and the cancel integration ran
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForDialogCancelledMessage();
    });

    it('MM-T6255_1 - should dismiss the dialog from the header close button', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog close');

        // # Open the no-fields dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open simple for close',
            scenario: 'simple',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox Simple Dialog');

        // # Dismiss with the header X
        await MmBlocksTestHelper.closeBlocksDialog();

        // * Verify the dialog closed. The header X pops the modal route directly and never
        // * runs the cancel action, so unlike the web modal no ephemeral is posted.
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await expect(ChannelScreen.channelScreen).toExist();
    });

    it('MM-T6256_1 - should submit a blocks dialog that has no form fields', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog simple submit');

        // # Open the no-fields dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open simple submit',
            scenario: 'simple',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Submit an empty form
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the dialog closed and the integration received an empty submission
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForDialogSubmitOkMessage('');
    });

    it('MM-T6257_1 - should cancel a blocks dialog that has no form fields', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog simple cancel');

        // # Open the no-fields dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open simple cancel',
            scenario: 'simple',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Cancel
        await MmBlocksTestHelper.cancelBlocksDialog();

        // * Verify the dialog closed and the cancel integration ran
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForDialogCancelledMessage();
    });

    it('MM-T6258_1 - should keep the dialog open and show per-field errors from the integration', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog field errors');

        // # Open the full-field dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open for field errors',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Submit through the button whose integration answers with `errors`
        await MmBlocksTestHelper.tapMmBlocksButton(DIALOG_ACTION.errors);

        // * Verify the dialog stayed open with one message per named field
        await MmBlocksTestHelper.blocksDialogToBeVisible();
        await MmBlocksTestHelper.expectDialogTextFieldError('title', 'Title looks wrong');
        await MmBlocksTestHelper.expectDialogTextFieldError('email', 'Email is invalid');
        await MmBlocksTestHelper.expectDialogFieldError('Pick something else');
    });

    it('MM-T6259_1 - should keep the dialog open and show a top-level integration error', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog top error');

        // # Open the full-field dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open for top-level error',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Run the action whose integration answers with a top-level `error`
        await MmBlocksTestHelper.tapMmBlocksButton(DIALOG_ACTION.error);

        // * Verify the dialog stayed open and surfaced the error
        await MmBlocksTestHelper.blocksDialogToBeVisible();
        await MmBlocksTestHelper.expectDialogTopLevelError();
    });

    it('MM-T6260_1 - should replace the dialog content in place on a type:refresh response', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog refresh');

        // # Open the full-field dialog and set a title the refresh response echoes back
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open for refresh',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
        await MmBlocksTestHelper.setDialogTextInput('title', 'Refresh me');

        // # Submit through the button whose integration answers with type:refresh
        await MmBlocksTestHelper.tapMmBlocksButton(DIALOG_ACTION.refresh);

        // * Verify step 2 replaced the form without closing the dialog
        await MmBlocksTestHelper.blocksDialogToBeVisible();
        await MmBlocksTestHelper.expectBlocksDialogTitle('Step 2');
        await expect(element(by.id('mm_blocks.text_input.notes.input'))).toExist();
        await expect(element(by.id('mm_blocks.bool_input.confirm.toggled.false.button'))).toExist();

        // * Verify the step 1 fields are gone and the echoed title made it through
        await expect(element(by.id('mm_blocks.text_input.title.input'))).not.toExist();
        await MmBlocksTestHelper.waitForTextMatching(MmBlocksTestHelper.textContaining('Refresh me'));
    });

    it('MM-T6261_1 - should close the dialog when the integration returns a goto_location', async () => {
        const marker = MmBlocksTestHelper.randomMarker('E2E blocks dialog goto');

        // # Open the full-field dialog
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText: 'Open for navigate',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);

        // # Run the action whose integration answers with goto_location
        await MmBlocksTestHelper.tapMmBlocksButton(DIALOG_ACTION.goto);

        // * Verify the dialog closed
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
    });
});
