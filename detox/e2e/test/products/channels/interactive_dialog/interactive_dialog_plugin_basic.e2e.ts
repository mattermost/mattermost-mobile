// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    cleanupInteractiveDialogAfterEach,
    ensureDialogClosed,
    ensureDialogOpen,
    logoutInteractiveDialogSuite,
    setupInteractiveDialogPluginSuite,
} from '@support/interactive_dialog_test_helper';
import {Post} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {ChannelScreen, InteractiveDialogScreen} from '@support/ui/screen';
import {wait} from '@support/utils';
import {expect} from 'detox';

// MM-66558: dialog fields use replaceText instead of typeText.

describe('Interactive Dialog - Basic (Plugin)', () => {
    let testChannel: any;

    beforeAll(async () => {
        ({testChannel} = await setupInteractiveDialogPluginSuite());
    });

    afterAll(async () => {
        await logoutInteractiveDialogSuite();
    });

    afterEach(async () => {
        await cleanupInteractiveDialogAfterEach(testChannel);
    });

    it('MM-T4101 should open simple interactive dialog (Plugin)', async () => {
        await ChannelScreen.postSlashCommand('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T4102 should submit simple interactive dialog (Plugin)', async () => {
        await ChannelScreen.postSlashCommand('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4103 should fill text field and submit dialog (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog basic');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('optional_text', 'Plugin Test Value');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4104 should handle server error on dialog submission (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog error');
        await ensureDialogOpen();
        await InteractiveDialogScreen.fillTextElement('optional_text', 'This will trigger server error');
        await InteractiveDialogScreen.submit();
        await wait(500);
        await expect(element(by.text('some error'))).toBeVisible();
        await ensureDialogOpen();
        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T4401 should toggle boolean fields and submit (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog boolean');
        await ensureDialogOpen();
        await expect(element(by.id('AppFormElement.required_boolean.toggled..button'))).toExist();
        await expect(element(by.id('AppFormElement.optional_boolean.toggled..button'))).toExist();
        await expect(element(by.id('AppFormElement.boolean_default_true.toggled.true.button'))).toExist();
        await expect(element(by.id('AppFormElement.boolean_default_false.toggled..button'))).toExist();
        await InteractiveDialogScreen.toggleBooleanElement('required_boolean');
        await InteractiveDialogScreen.toggleBooleanElement('boolean_default_false');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });

    it('MM-T4402 should handle boolean field validation (Plugin)', async () => {
        await ensureDialogClosed();
        await ChannelScreen.postSlashCommand('/dialog boolean');
        await ensureDialogOpen();
        await InteractiveDialogScreen.submit();
        await wait(300);
        await ensureDialogOpen();
        await InteractiveDialogScreen.toggleBooleanElement('required_boolean');
        await InteractiveDialogScreen.toggleBooleanElement('boolean_default_false');
        await InteractiveDialogScreen.submit();
        await ensureDialogClosed();
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        await ChannelScreen.hasPostMessage(post.id, 'Dialog Submitted:');
    });
});
