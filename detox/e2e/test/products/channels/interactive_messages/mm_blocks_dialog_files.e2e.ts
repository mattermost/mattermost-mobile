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
import {expect} from 'detox';

// Every case needs Mattermost→sidecar reachability: the dialog only exists after the
// post action callback reaches the webhook sidecar, so gate the whole suite.
const describeBlocksDialog = hasStableWebhookIngress ? describe : describe.skip;

const FIX_FIELD_ERRORS = 'Please fix all field errors';

describeBlocksDialog('Interactive mm_blocks - blocks dialog file inputs', () => {
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

    const openFileUploadDialog = async (markerPrefix: string, buttonText: string) => {
        const marker = MmBlocksTestHelper.randomMarker(markerPrefix);
        const actionId = await MmBlocksTestHelper.postDialogButtonPost(testChannel.id, {
            marker,
            buttonText,
            scenario: 'file_upload',
        });
        await MmBlocksTestHelper.waitForPostText(marker);
        await MmBlocksTestHelper.openBlocksDialogFromPost(actionId);
        await MmBlocksTestHelper.expectBlocksDialogTitle('Detox File Upload');
    };

    it('MM-T6272_1 - should label the picker Choose File for single and Choose Files for allow_multiple', async () => {
        // # Open the dialog with a single-file field and an allow_multiple field
        await openFileUploadDialog('E2E blocks file labels', 'Open file labels');

        // * Verify the label follows allow_multiple
        await expect(
            element(by.id('mm_blocks.file_input.single_document.choose_file.button-label')),
        ).toHaveText('Choose File');
        await expect(
            element(by.id('mm_blocks.file_input.multiple_files.choose_file.button-label')),
        ).toHaveText('Choose Files');

        // * Verify each field also offers the photo library picker
        await expect(element(by.id('mm_blocks.file_input.single_document.choose_photo.button'))).toExist();
        await expect(element(by.id('mm_blocks.file_input.multiple_files.choose_photo.button'))).toExist();
    });

    it('MM-T6273_1 - should block submit while a required file field has no files', async () => {
        // # Open the dialog with two required file fields
        await openFileUploadDialog('E2E blocks file required', 'Open file required');

        // # Submit without picking any file
        await MmBlocksTestHelper.submitBlocksDialog();

        // * Verify the dialog stayed open and both file fields are flagged
        await MmBlocksTestHelper.blocksDialogToBeVisible();
        await expect(element(by.id('single_document-error'))).toExist();
        await expect(element(by.id('multiple_files-error'))).toExist();
        await MmBlocksTestHelper.expectDialogTopLevelError(FIX_FIELD_ERRORS);
    });

    it.skip('MM-T6274_1 - should upload a file and submit its file id', () => {
        // Not automatable with Detox: "Choose File" hands off to the OS document picker
        // (UIDocumentPickerViewController / Android SAF), which runs outside the app process
        // and is therefore unreachable by Detox matchers. "Photos" has the same problem, plus
        // the simulator photo library is not seeded. Covered by the Playwright suite
        // (mm_blocks_dialog_files.spec.ts), which can set input files directly.
    });
});
