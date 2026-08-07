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

// Every case needs Mattermost→sidecar reachability: the dialog only exists after the
// post action callback reaches the webhook sidecar, so gate the whole suite.
const describeBlocksDialog = hasStableWebhookIngress ? describe : describe.skip;

// Client-side messages from checkMmBlocksFormFieldForError / BlocksDialogShell.
const REQUIRED_FIELD_ERROR = 'This field is required.';
const BAD_EMAIL_ERROR = 'Must be a valid email address.';
const BAD_NUMBER_ERROR = 'Must be a number.';
const FIX_FIELD_ERRORS = 'Please fix all field errors';

describeBlocksDialog('Interactive mm_blocks - blocks dialog validation', () => {
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
            // These cases deliberately leave the modal up, so dismiss it before the next one.
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

    const openRequiredFieldsDialog = async (markerPrefix: string, buttonText: string) => {
        const marker = MmBlocksTestHelper.randomMarker(markerPrefix);
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText,
            scenario: 'empty_required',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox Required Fields');
    };

    it('MM-T6267_1 - should keep the dialog open and flag every empty required field on submit', async () => {
        // # Open the required-fields dialog
        await openRequiredFieldsDialog('E2E blocks required empty', 'Open required fields');

        // # Submit without filling anything
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the dialog stayed open with a summary error
        await MmBlocksTestHelper.blocksDialogToBeVisible();
        await MmBlocksTestHelper.expectDialogTopLevelError(FIX_FIELD_ERRORS);

        // * Verify each required field is flagged, and the optional password field is not
        await MmBlocksTestHelper.expectDialogTextFieldError('realname', REQUIRED_FIELD_ERROR);
        await MmBlocksTestHelper.expectDialogTextFieldError('someemail', REQUIRED_FIELD_ERROR);
        await MmBlocksTestHelper.expectDialogTextFieldError('somenumber', REQUIRED_FIELD_ERROR);
        await MmBlocksTestHelper.expectNoDialogTextFieldError('somepassword');
    });

    it('MM-T6268_1 - should reject an email without @ and submit once it is corrected', async () => {
        // # Open the required-fields dialog and fill it with an invalid email
        await openRequiredFieldsDialog('E2E blocks email validation', 'Open email validation');
        await MmBlocksTestHelper.setDialogTextInput('realname', 'Detox Tester');
        await MmBlocksTestHelper.setDialogTextInput('somenumber', '42');
        await MmBlocksTestHelper.setDialogTextInput('someemail', 'detox-at-example.com');

        // # Submit
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify only the email field is rejected and the dialog stayed open
        await MmBlocksTestHelper.blocksDialogToBeVisible();
        await MmBlocksTestHelper.expectDialogTextFieldError('someemail', BAD_EMAIL_ERROR);
        await MmBlocksTestHelper.expectNoDialogTextFieldError('realname');

        // # Correct the email and submit again
        await MmBlocksTestHelper.setDialogTextInput('someemail', 'detox@example.com');
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the dialog closed and the corrected values reached the integration
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining('realname=Detox Tester&someemail=detox@example.com&somenumber=42'),
            timeouts.TWENTY_SEC,
        );
    });

    it('MM-T6269_1 - should reject a non-numeric value in a number field', async () => {
        // # Open the required-fields dialog and fill the number field with text
        await openRequiredFieldsDialog('E2E blocks number validation', 'Open number validation');
        await MmBlocksTestHelper.setDialogTextInput('realname', 'Detox Tester');
        await MmBlocksTestHelper.setDialogTextInput('someemail', 'detox@example.com');
        await MmBlocksTestHelper.setDialogTextInput('somenumber', 'not-a-number');

        // # Submit
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the number field is rejected and the dialog stayed open
        await MmBlocksTestHelper.blocksDialogToBeVisible();
        await MmBlocksTestHelper.expectDialogTextFieldError('somenumber', BAD_NUMBER_ERROR);
        await MmBlocksTestHelper.expectDialogTopLevelError(FIX_FIELD_ERRORS);
    });
});
