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

// Each step arrives as a type:refresh round trip through the sidecar.
const REFRESH_TIMEOUT = timeouts.TWENTY_SEC;

describeBlocksDialog('Interactive mm_blocks - blocks dialog multistep', () => {
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

    const openScenarioDialog = async (markerPrefix: string, buttonText: string, scenario: string) => {
        const marker = MmBlocksTestHelper.randomMarker(markerPrefix);
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText,
            scenario,
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
    };

    it('MM-T6275_1 - should swap the type-specific field when a select triggers a field refresh', async () => {
        // # Open the field-refresh dialog and name the project
        await openScenarioDialog('E2E blocks field refresh', 'Open field refresh', 'field_refresh');
        await MmBlocksTestHelper.expectBlocksDialogTitle('Field Refresh Demo');
        await MmBlocksTestHelper.setDialogTextInput('project_name', 'Detox Project');

        // # Pick the project type that pulls in the platform field
        await MmBlocksTestHelper.selectInputOption('project_type', 'Mobile App');

        // * Verify the refreshed form gained the platform field and kept the typed name
        await waitFor(element(by.id(InteractiveDialogScreen.selectButtonTestID('platform')))).
            toExist().withTimeout(REFRESH_TIMEOUT);
        await expect(element(by.id(InteractiveDialogScreen.textInputFieldTestID('project_name')))).toHaveText('Detox Project');
        await expect(element(by.id(InteractiveDialogScreen.selectButtonTestID('framework')))).not.toExist();

        // # Switch to a project type served by a different field
        await MmBlocksTestHelper.selectInputOption('project_type', 'API Service');

        // * Verify the previous type-specific field was replaced
        await waitFor(element(by.id(InteractiveDialogScreen.selectButtonTestID('language')))).
            toExist().withTimeout(REFRESH_TIMEOUT);
        await expect(element(by.id(InteractiveDialogScreen.selectButtonTestID('platform')))).not.toExist();
    });

    it('MM-T6276_1 - should walk the three multistep dialogs and submit the final step', async () => {
        // # Open step 1 and fill it
        await openScenarioDialog('E2E blocks multistep', 'Open multistep', 'multistep_1');
        await MmBlocksTestHelper.expectBlocksDialogTitle('Step 1 - Personal Info');
        await MmBlocksTestHelper.setDialogTextInput('first_name', 'Detox');
        await MmBlocksTestHelper.setDialogTextInput('email', 'detox@example.com');

        // # Advance to step 2
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify step 2 replaced step 1 in the same modal
        await MmBlocksTestHelper.expectBlocksDialogTitle('Step 2 - Work Info');
        await waitFor(element(by.id(InteractiveDialogScreen.selectButtonTestID('department')))).
            toExist().withTimeout(REFRESH_TIMEOUT);
        await expect(element(by.id(InteractiveDialogScreen.textInputFieldTestID('first_name')))).not.toExist();

        // # Fill step 2 and advance
        await MmBlocksTestHelper.selectInputOption('department', 'Engineering');
        await MmBlocksTestHelper.selectRadioInputOption('experience_level', 'senior');
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify step 3 is up
        await MmBlocksTestHelper.expectBlocksDialogTitle('Step 3 - Final Details');
        await waitFor(element(by.id(InteractiveDialogScreen.boolInputTestID('terms_accepted', false)))).
            toExist().withTimeout(REFRESH_TIMEOUT);

        // # Accept the terms and complete the registration
        await MmBlocksTestHelper.toggleBoolInput('terms_accepted', false);
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the dialog closed and the final step submitted its own values
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining('dialog submit OK step=3'),
            timeouts.TWENTY_SEC,
        );
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining('terms_accepted=true'),
        );
    });

    it('MM-T6277_1 - should run the cancel action when a middle step is cancelled', async () => {
        // # Open step 1 and advance to step 2
        await openScenarioDialog('E2E blocks multistep cancel', 'Open multistep cancel', 'multistep_1');
        await MmBlocksTestHelper.setDialogTextInput('first_name', 'Detox');
        await MmBlocksTestHelper.setDialogTextInput('email', 'detox@example.com');
        await MmBlocksTestHelper.submitBlocksDialog();
        await MmBlocksTestHelper.expectBlocksDialogTitle('Step 2 - Work Info');

        // # Cancel from step 2
        await MmBlocksTestHelper.cancelBlocksDialog();

        // * Verify the whole dialog closed and the cancel integration ran
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForDialogCancelledMessage();
    });
});
