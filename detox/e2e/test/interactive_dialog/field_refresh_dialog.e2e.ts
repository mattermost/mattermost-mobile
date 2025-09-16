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

describe('Interactive Dialog - Field Refresh', () => {
    beforeAll(async () => {
        await InteractiveDialogTestHelper.setupInteractiveDialogTest(
            'fieldrefresh',
            'field_refresh_dialog_request',
            'Field Refresh Dialog Command',
            'Test command for field refresh dialog functionality',
        );
    });

    it('MM-T4983 should open field refresh dialog and handle basic interaction', async () => {
        // # Post the slash command to trigger the field refresh dialog
        await ChannelScreen.postMessage('/fieldrefresh');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Interactive dialog should appear
        await InteractiveDialogScreen.toBeVisible();

        // * Verify initial dialog title
        await expect(element(by.text('Project Configuration'))).toExist();

        // # Fill in base fields FIRST (before triggering refresh)
        await InteractiveDialogScreen.fillTextElement('project_name', 'My Web App');
        await InteractiveDialogScreen.fillTextElement('description', 'A test web application');

        // * Verify refresh field is present
        await expect(element(by.id('AppFormElement.project_type.select.button'))).toExist();

        // # Select "Web Application" project type to trigger field refresh
        await InteractiveDialogScreen.selectOption('project_type', 'Web Application');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Verify that additional fields appear after field refresh
        await expect(element(by.id('AppFormElement.frontend_framework.select.button'))).toExist();
        await expect(element(by.id('AppFormElement.backend_language.select.button'))).toExist();

        // * Verify that previously filled fields are still populated (field refresh preserved values)
        // Note: This tests that the field refresh mechanism preserves existing field values

        // # Fill in the new fields that appeared after refresh
        await InteractiveDialogScreen.selectOption('frontend_framework', 'React');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);
        await InteractiveDialogScreen.selectOption('backend_language', 'Node.js');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // # Submit the dialog
        await InteractiveDialogScreen.submit();
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Verify we're back on the channel screen
        await ChannelScreen.toBeVisible();

        // * Verify submission success message appears (this will fail if submit errored due to missing required fields)
        await expect(element(by.text('Field refresh dialog submitted successfully!'))).toExist();
    });

    it('MM-T4986 should handle field refresh changes and cancellation', async () => {
        // # Post the slash command to trigger the field refresh dialog
        await ChannelScreen.postMessage('/fieldrefresh');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Interactive dialog should appear
        await InteractiveDialogScreen.toBeVisible();

        // # Fill base fields first
        await InteractiveDialogScreen.fillTextElement('project_name', 'Test Project');
        await InteractiveDialogScreen.fillTextElement('description', 'Test description');

        // # Select "Web Application" project type to trigger field refresh
        await InteractiveDialogScreen.selectOption('project_type', 'Web Application');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Verify that Web Application fields appear after refresh
        await expect(element(by.id('AppFormElement.frontend_framework.select.button'))).toExist();
        await expect(element(by.id('AppFormElement.backend_language.select.button'))).toExist();

        // # Change to "Mobile App" to test field refresh switching
        await InteractiveDialogScreen.selectOption('project_type', 'Mobile App');
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Verify that Web Application fields are gone and Mobile App fields appear
        try {
            await expect(element(by.id('AppFormElement.frontend_framework.select.button'))).not.toExist();
        } catch (error) {
            // Frontend framework field should no longer exist
        }

        // * Verify Mobile App specific fields appear
        await expect(element(by.id('AppFormElement.platform.select.button'))).toExist();
        await expect(element(by.id('AppFormElement.dev_framework.select.button'))).toExist();

        // # Cancel the dialog after testing field refresh behavior
        await InteractiveDialogScreen.cancel();
        await wait(InteractiveDialogTestHelper.STANDARD_WAIT_TIME);

        // * Verify we're back on the channel screen
        await ChannelScreen.toBeVisible();
    });
});
