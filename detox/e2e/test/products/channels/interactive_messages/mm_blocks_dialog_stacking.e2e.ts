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

// Stacking needs two Mattermost→sidecar round trips (the parent action, then dialogs/open for
// the child) plus a websocket push, so it is the flakiest blocks-dialog flow. Gate the whole
// suite on stable ingress.
const describeBlocksDialog = hasStableWebhookIngress ? describe : describe.skip;

const CHILD_ACTION = {
    details: 'detox_dialog_open_details',
    summary: 'detox_dialog_open_summary',
};

// The child arrives through dialogs/open and a websocket push, not the action response.
const CHILD_OPEN_TIMEOUT = timeouts.HALF_MIN;

describeBlocksDialog('Interactive mm_blocks - blocks dialog stacking', () => {
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
            // A failed case can leave both the child and the parent on screen.
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

    const openParentDialog = async (markerPrefix: string, buttonText: string) => {
        const marker = MmBlocksTestHelper.randomMarker(markerPrefix);
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText,
            scenario: 'action_parent',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox Action Buttons');
    };

    const childInput = () => element(by.id(InteractiveDialogScreen.textInputFieldTestID('child_input')));

    it('MM-T6278_1 - should stack a native child dialog and return to the parent after submitting it', async () => {
        // # Open the parent dialog and fill its field so we can tell it survived
        await openParentDialog('E2E blocks stacking submit', 'Open stacking parent');
        await MmBlocksTestHelper.setDialogTextInput('your_name', 'Detox Parent');

        // # Open the child dialog from the parent action button
        await MmBlocksTestHelper.tapMmBlocksButton(CHILD_ACTION.details);

        // * Verify the child was pushed on top of the parent
        await waitFor(childInput()).
            toExist().withTimeout(CHILD_OPEN_TIMEOUT);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Details Dialog');

        // # Fill and submit the child
        await MmBlocksTestHelper.setDialogTextInput('child_input', 'Child value');
        await MmBlocksTestHelper.tapTopmostVisible(InteractiveDialogScreen.testID.submitButton);

        // * Verify the child closed and the parent is back with its value intact
        await waitFor(childInput()).
            not.toExist().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id(InteractiveDialogScreen.textInputFieldTestID('your_name')))).toHaveText('Detox Parent');

        // # Dismiss the parent so the channel is readable again
        await MmBlocksTestHelper.tapTopmostVisible(InteractiveDialogScreen.testID.closeButton);

        // * Verify the child submission reached the integration
        await MmBlocksTestHelper.blocksDialogToBeVisible(false);
        await MmBlocksTestHelper.waitForTextMatching(
            MmBlocksTestHelper.textContaining('child_input=Child value'),
            timeouts.TWENTY_SEC,
        );
    });

    it('MM-T6279_1 - should keep the parent usable after dismissing a stacked child', async () => {
        // # Open the parent dialog and stack the first child on it
        await openParentDialog('E2E blocks stacking dismiss', 'Open stacking dismiss');
        await MmBlocksTestHelper.tapMmBlocksButton(CHILD_ACTION.details);
        await waitFor(childInput()).
            toExist().withTimeout(CHILD_OPEN_TIMEOUT);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Details Dialog');

        // # Dismiss the child with its header X
        await MmBlocksTestHelper.tapTopmostVisible(InteractiveDialogScreen.testID.closeButton);
        await waitFor(childInput()).
            not.toExist().withTimeout(timeouts.TEN_SEC);

        // * Verify the parent is still on screen and its actions still work
        await expect(element(by.id(InteractiveDialogScreen.buttonTestID(CHILD_ACTION.summary)))).toBeVisible();

        // # Open the second child from the parent
        await MmBlocksTestHelper.tapMmBlocksButton(CHILD_ACTION.summary);

        // * Verify the other child fixture was stacked this time
        await waitFor(childInput()).
            toExist().withTimeout(CHILD_OPEN_TIMEOUT);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Summary Dialog');
    });
});
