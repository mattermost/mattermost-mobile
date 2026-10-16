// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-empty */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    cleanUpAfterDialogTest,
    ensureDialogClosed,
    ensureDialogOpen,
    logOutAfterDialogSuite,
    postSlashCommandDirect,
    setUpDialogSuite,
} from '@support/interactive_dialog_plugin_helper';
import {System, User} from '@support/server_api';
import {canMutateServer, requireMutationServer} from '@support/server_role';
import {siteOneUrl} from '@support/test_config';
import {InteractiveDialogScreen} from '@support/ui/screen';
import {wait} from '@support/utils';

// Turns mobile uploads off server-wide, so this runs alone on the mutation server
// (detox/e2e/server_mutation_specs.json).
describe('Interactive Dialog - File Upload Disabled (Plugin)', () => {
    const channelsCategory = 'channels';
    let testChannel: any;
    let setupFailed = false;

    beforeAll(async () => {
        requireMutationServer('interactive_dialog_mobile_upload_disabled');
        try {
            ({channel: testChannel} = await setUpDialogSuite(channelsCategory));
        } catch (error) {
            setupFailed = true;
            throw error;
        }
    });

    afterAll(async () => {
        if (!canMutateServer) {
            return;
        }

        try {
            await User.apiAdminLogin(siteOneUrl);
            const {error} = await System.apiUpdateConfig(siteOneUrl, {FileSettings: {EnableMobileUpload: true}});
            if (error) {
                throw new Error(`Failed to re-enable mobile upload: ${JSON.stringify(error)}`);
            }
        } finally {
            await logOutAfterDialogSuite();
        }
    });

    afterEach(async () => {
        if (setupFailed) {
            return;
        }
        await cleanUpAfterDialogTest(channelsCategory, testChannel);
    });

    it('MM-T6074_1 - should show upload disabled warning on file fields when mobile upload is disabled (Plugin)', async () => {
        await ensureDialogClosed();
        const {error: disableError} = await System.apiUpdateConfig(siteOneUrl, {
            FileSettings: {EnableMobileUpload: false},
        });
        if (disableError) {
            throw new Error(`Failed to disable mobile upload: ${JSON.stringify(disableError)}`);
        }
        await wait(2000);

        await postSlashCommandDirect('/dialog file-upload');
        await ensureDialogOpen();
        await InteractiveDialogScreen.expectFileFieldUploadDisabledWarning('single_file');
        await InteractiveDialogScreen.expectFileFieldUploadDisabledWarning('multi_file');

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();

    });
});
