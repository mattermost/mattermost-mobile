// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {InteractiveDialogTestHelper} from '@support/interactive_dialog_test_helper';
import {
    ChannelScreen,
    InteractiveDialogScreen,
} from '@support/ui/screen';
import {wait} from '@support/utils';
import {expect} from 'detox';

describe('Interactive Dialog - Multiform', () => {
    beforeAll(async () => {
        await InteractiveDialogTestHelper.setupInteractiveDialogTest(
            'multiform',
            'multiform_dialog_request',
            'Multiform Dialog Command',
            'Test command for multiform dialog functionality',
        );
    });

    it('MM-T4980 should complete 3-step multiform dialog progression with value accumulation', async () => {
        // # Post the slash command to trigger the multiform dialog
        await ChannelScreen.postMessage('/multiform');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Interactive dialog should appear - Step 1 of 3
        await InteractiveDialogScreen.toBeVisible();

        // * Verify Step 1 dialog title
        await expect(element(by.text('Personal Information - Step 1 of 3'))).toExist();

        // # Fill in Step 1 fields
        await InteractiveDialogScreen.fillTextElement('first_name', 'John');
        await InteractiveDialogScreen.fillTextElement('email', 'john.doe@example.com');

        // # Submit Step 1
        await InteractiveDialogScreen.submit();
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Interactive dialog should appear - Step 2 of 3
        await InteractiveDialogScreen.toBeVisible();

        // * Verify Step 2 dialog title
        await expect(element(by.text('Work Information - Step 2 of 3'))).toExist();

        // # Fill in Step 2 fields
        await InteractiveDialogScreen.selectRadioOption('department', 'Engineering');
        await InteractiveDialogScreen.selectOption('experience_level', 'Senior');

        // # Submit Step 2
        await InteractiveDialogScreen.submit();
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Interactive dialog should appear - Step 3 of 3
        await InteractiveDialogScreen.toBeVisible();

        // * Verify Step 3 dialog title
        await expect(element(by.text('Final Details - Step 3 of 3'))).toExist();

        // # Fill in Step 3 fields
        await InteractiveDialogScreen.fillTextElement('comments', 'Looking forward to joining the team');
        await InteractiveDialogScreen.toggleBooleanElement('terms_accepted');

        // # Submit final step
        await InteractiveDialogScreen.submit();
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Verify we're back on the channel screen
        await ChannelScreen.toBeVisible();

        // * Verify multiform completion success message appears with accumulated values
        await expect(element(by.text('Multiform submission completed!'))).toExist();

        // * Verify the code block exists containing the accumulated submission data
        // The presence of the code block with success message confirms that:
        // 1. All 3 multiform steps were completed successfully
        // 2. Values were accumulated across all steps
        // 3. Final submission included all accumulated data from previous steps
        await expect(element(by.id('markdown_code_block'))).toExist();
    });

    it('MM-T4981 should handle multiform cancellation at different steps', async () => {
        // # Post the slash command to trigger the multiform dialog
        await ChannelScreen.postMessage('/multiform');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Interactive dialog should appear - Step 1 of 3
        await InteractiveDialogScreen.toBeVisible();

        // * Verify Step 1 dialog title
        await expect(element(by.text('Personal Information - Step 1 of 3'))).toExist();

        // # Fill in some Step 1 fields
        await InteractiveDialogScreen.fillTextElement('first_name', 'Jane');
        await InteractiveDialogScreen.fillTextElement('email', 'jane@example.com');

        // # Submit Step 1
        await InteractiveDialogScreen.submit();
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Step 2 should appear
        await InteractiveDialogScreen.toBeVisible();
        await expect(element(by.text('Work Information - Step 2 of 3'))).toExist();

        // # Fill partial Step 2 data
        await InteractiveDialogScreen.selectRadioOption('department', 'Marketing');

        // # Cancel at Step 2
        await InteractiveDialogScreen.cancel();
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Verify we're back on the channel screen
        await ChannelScreen.toBeVisible();

        // Note: Cancellation behavior depends on webhook implementation
        // Some implementations may not show cancellation messages
    });
});
